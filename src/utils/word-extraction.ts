import type { SpellFixSettings } from '../settings';
import { findNonProseRanges, type TextRange } from './non-prose';

export interface Word {
	word: string;
	startCh: number;
	endCh: number;
	startLine: number;
	endLine: number;
}

export interface WordSpan {
	word: string;
	start: number;
	end: number;
}

// Apostrophes and Hebrew geresh/gershayim join letters, matching how the spellchecker
// reads "we've" as one word. Marks keep Hebrew niqqud inside the word.
const WORD_PATTERN = /\p{L}[\p{L}\p{M}]*(?:['’׳״][\p{L}\p{M}]+)*/gu;

function findInlineCodeRanges(text: string): TextRange[] {
	const inlineCodeRanges: TextRange[] = [];
	const backtickRegex = /`[^`]*`/g;
	let backtickMatch;
	while ((backtickMatch = backtickRegex.exec(text)) !== null) {
		inlineCodeRanges.push({
			start: backtickMatch.index,
			end: backtickMatch.index + backtickMatch[0].length,
		});
	}
	return inlineCodeRanges;
}

export function extractWordsFromLine(
	text: string,
	lineNumber: number,
	settings: SpellFixSettings,
	isInsideLatex?: (charPos: number) => boolean
): Word[] {
	const words: Word[] = [];

	const skipRanges = findNonProseRanges(text);
	if (settings.skipCodeBlocks) {
		skipRanges.push(...findInlineCodeRanges(text));
	}

	for (const match of text.matchAll(WORD_PATTERN)) {
		if (match[0].length < 2) {
			continue;
		}

		const wordStart = match.index;
		const wordEnd = match.index + match[0].length;

		if (skipRanges.some((range) => wordStart >= range.start && wordEnd <= range.end)) {
			continue;
		}

		if (settings.skipLatexMath && isInsideLatex?.(wordStart)) {
			continue;
		}

		words.push({
			word: match[0],
			startCh: wordStart,
			endCh: wordEnd,
			startLine: lineNumber,
			endLine: lineNumber,
		});
	}

	return words;
}

/**
 * Finds the last word of the whitespace-separated token before the cursor. Staying
 * inside that token means a space after "123" never reaches back to an earlier word.
 */
export function findWordBeforeCursor(lineText: string, cursorCh: number): WordSpan | null {
	let tokenEnd = cursorCh;
	while (tokenEnd > 0 && /\s/.test(lineText[tokenEnd - 1])) {
		tokenEnd--;
	}

	let tokenStart = tokenEnd;
	while (tokenStart > 0 && !/\s/.test(lineText[tokenStart - 1])) {
		tokenStart--;
	}

	const token = lineText.slice(tokenStart, tokenEnd);
	const matches = [...token.matchAll(WORD_PATTERN)];
	const last = matches[matches.length - 1];
	if (!last) {
		return null;
	}

	const before = token[last.index - 1] ?? '';
	const after = token[last.index + last[0].length] ?? '';
	if (/\p{N}/u.test(before) || /\p{N}/u.test(after)) {
		return null;
	}

	const start = tokenStart + last.index;
	return { word: last[0], start, end: start + last[0].length };
}
