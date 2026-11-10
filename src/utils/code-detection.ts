export interface LatexMathState {
	insideDisplayMath: boolean;
	insideInlineMath: boolean;
}

export function isInsideInlineCode(
	lineText: string,
	wordStart: number,
	wordEnd: number
): boolean {
	const backtickRegex = /`[^`]*`/g;
	let match;
	while ((match = backtickRegex.exec(lineText)) !== null) {
		const codeStart = match.index;
		const codeEnd = match.index + match[0].length;
		if (wordStart >= codeStart && wordEnd <= codeEnd) {
			return true;
		}
	}
	return false;
}

function isEscaped(text: string, pos: number): boolean {
	let backslashes = 0;
	for (let i = pos - 1; i >= 0 && text[i] === '\\'; i--) {
		backslashes++;
	}
	return backslashes % 2 === 1;
}

/** Follows the Markdown math rule: a closing `$` has no space before it and no digit after it. */
function findInlineMathEnd(lineText: string, open: number): number {
	for (let i = open + 1; i < lineText.length; i++) {
		if (lineText[i] !== '$' || isEscaped(lineText, i)) continue;
		if (/\s/.test(lineText[i - 1]) || /\d/.test(lineText[i + 1] ?? '')) continue;
		return i;
	}
	return -1;
}

/**
 * Display math (`$$`) can span lines, so it carries over in `state`. Inline math
 * cannot, so a lone `$` (such as a price) only ever affects its own line.
 */
export function scanLatexMathDelimiters(
	lineText: string,
	limit: number,
	state: LatexMathState
): void {
	state.insideInlineMath = false;

	let pos = 0;
	while (pos < limit) {
		if (lineText[pos] !== '$' || isEscaped(lineText, pos)) {
			pos += 1;
			continue;
		}

		if (lineText[pos + 1] === '$') {
			if (pos + 2 > limit) break;
			state.insideDisplayMath = !state.insideDisplayMath;
			pos += 2;
			continue;
		}

		const nextChar = lineText[pos + 1] ?? '';
		if (state.insideDisplayMath || nextChar === '' || /\s/.test(nextChar)) {
			pos += 1;
			continue;
		}

		const end = findInlineMathEnd(lineText, pos);
		if (end === -1) {
			// No closing `$` yet: treat it as math still being typed, unless it reads as a price.
			if (!/\d/.test(nextChar)) {
				state.insideInlineMath = true;
				return;
			}
			pos += 1;
			continue;
		}

		if (end >= limit) {
			state.insideInlineMath = true;
			return;
		}
		pos = end + 1;
	}
}

export function isInsideLatexMathFromLines(
	getLine: (line: number) => string,
	line: number,
	charPos: number
): boolean {
	const state: LatexMathState = { insideDisplayMath: false, insideInlineMath: false };
	for (let i = 0; i <= line; i++) {
		const lineText = getLine(i);
		const limit = i === line ? charPos : lineText.length;
		scanLatexMathDelimiters(lineText, limit, state);
	}
	return state.insideDisplayMath || state.insideInlineMath;
}

interface CodeFence {
	marker: string;
	length: number;
	rest: string;
}

function parseCodeFence(lineText: string): CodeFence | null {
	const match = /^\s*(`{3,}|~{3,})(.*)$/.exec(lineText);
	if (!match) return null;
	const [, run, rest] = match;
	// A backtick fence cannot have backticks in its info string: that is inline code.
	if (run[0] === '`' && rest.includes('`')) return null;
	return { marker: run[0], length: run.length, rest };
}

export function isInsideFencedCodeBlockFromLines(
	getLine: (line: number) => string,
	line: number
): boolean {
	let open: CodeFence | null = null;
	for (let i = 0; i < line; i++) {
		const fence = parseCodeFence(getLine(i));
		if (!fence) continue;
		if (!open) {
			open = fence;
		} else if (
			fence.marker === open.marker &&
			fence.length >= open.length &&
			fence.rest.trim() === ''
		) {
			open = null;
		}
	}

	return open !== null || parseCodeFence(getLine(line)) !== null;
}
