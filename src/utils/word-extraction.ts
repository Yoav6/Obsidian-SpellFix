import type { SpellFixSettings } from '../settings';

export interface Word {
	word: string;
	startCh: number;
	endCh: number;
	startLine: number;
	endLine: number;
}

function findInlineCodeRanges(text: string): Array<{ start: number; end: number }> {
	const inlineCodeRanges: Array<{ start: number; end: number }> = [];
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
	const wordRegex = /\p{L}+/gu;
	let match;

	const inlineCodeRanges = settings.skipCodeBlocks ? findInlineCodeRanges(text) : [];

	while ((match = wordRegex.exec(text)) !== null) {
		if (match[0].length < 2) {
			continue;
		}

		const wordStart = match.index;
		const wordEnd = match.index + match[0].length;

		if (settings.skipCodeBlocks) {
			const insideInlineCode = inlineCodeRanges.some(
				(range) => wordStart >= range.start && wordEnd <= range.end
			);
			if (insideInlineCode) {
				continue;
			}
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
