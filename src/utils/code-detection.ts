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

export function scanLatexMathDelimiters(
	lineText: string,
	limit: number,
	state: LatexMathState
): void {
	let pos = 0;
	while (pos < limit) {
		if (lineText.startsWith('$$', pos)) {
			if (pos + 2 <= limit) {
				state.insideDisplayMath = !state.insideDisplayMath;
				pos += 2;
			} else {
				break;
			}
		} else if (lineText[pos] === '$') {
			if (!state.insideDisplayMath) {
				state.insideInlineMath = !state.insideInlineMath;
			}
			pos += 1;
		} else {
			pos += 1;
		}
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

export function isInsideFencedCodeBlockFromLines(
	getLine: (line: number) => string,
	line: number
): boolean {
	const lineText = getLine(line);

	if (lineText.trimStart().startsWith('```')) {
		return true;
	}

	let insideFencedBlock = false;
	for (let i = 0; i < line; i++) {
		const checkLine = getLine(i);
		if (checkLine.trimStart().startsWith('```')) {
			insideFencedBlock = !insideFencedBlock;
		}
	}

	return insideFencedBlock;
}
