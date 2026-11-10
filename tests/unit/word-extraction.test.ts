import { describe, it, expect } from 'vitest';
import { extractWordsFromLine, findWordBeforeCursor } from '../../src/utils/word-extraction';
import { DEFAULT_SETTINGS } from '../../src/settings';

describe('extractWordsFromLine', () => {
	it('extracts multiple words with correct offsets', () => {
		const words = extractWordsFromLine('the quick brown', 0, DEFAULT_SETTINGS);
		expect(words).toHaveLength(3);
		expect(words[0]).toMatchObject({ word: 'the', startCh: 0, endCh: 3 });
		expect(words[1]).toMatchObject({ word: 'quick', startCh: 4, endCh: 9 });
		expect(words[2]).toMatchObject({ word: 'brown', startCh: 10, endCh: 15 });
	});

	it('extracts Unicode letters', () => {
		const words = extractWordsFromLine('שלום עולם', 0, DEFAULT_SETTINGS);
		expect(words).toHaveLength(2);
		expect(words[0].word).toBe('שלום');
		expect(words[1].word).toBe('עולם');
	});

	it('skips single-character tokens', () => {
		const words = extractWordsFromLine('a big cat', 0, DEFAULT_SETTINGS);
		expect(words.map((w) => w.word)).toEqual(['big', 'cat']);
	});

	it('skips words inside inline code when skipCodeBlocks is enabled', () => {
		const words = extractWordsFromLine('fix `teh` word', 0, {
			...DEFAULT_SETTINGS,
			skipCodeBlocks: true,
		});
		expect(words.map((w) => w.word)).toEqual(['fix', 'word']);
	});

	it('includes words inside inline code when skipCodeBlocks is disabled', () => {
		const words = extractWordsFromLine('fix `teh` word', 0, {
			...DEFAULT_SETTINGS,
			skipCodeBlocks: false,
		});
		expect(words.map((w) => w.word)).toEqual(['fix', 'teh', 'word']);
	});

	it('skips words inside LaTeX when callback reports inside math', () => {
		const words = extractWordsFromLine('The $x value', 0, {
			...DEFAULT_SETTINGS,
			skipLatexMath: true,
		}, (charPos) => charPos >= 5 && charPos <= 6);
		expect(words.map((w) => w.word)).toEqual(['The', 'value']);
	});

	it('keeps contractions as one word', () => {
		const words = extractWordsFromLine("we've and don’t", 0, DEFAULT_SETTINGS);
		expect(words.map((w) => w.word)).toEqual(["we've", 'and', 'don’t']);
	});

	it('keeps Hebrew geresh and niqqud inside the word', () => {
		const words = extractWordsFromLine("ג'ירפה שָׁלוֹם", 0, DEFAULT_SETTINGS);
		expect(words.map((w) => w.word)).toEqual(["ג'ירפה", 'שָׁלוֹם']);
	});

	it('skips links, URLs and tags', () => {
		const words = extractWordsFromLine(
			'teh [[Some Nmae]] https://exmaple.org/helo #tgaged [wrold](foo/bar) end',
			0,
			DEFAULT_SETTINGS
		);
		expect(words.map((w) => w.word)).toEqual(['teh', 'wrold', 'end']);
	});
});

describe('findWordBeforeCursor', () => {
	const wordBefore = (line: string) => findWordBeforeCursor(line, line.length)?.word ?? null;

	it('finds the word before a typed space', () => {
		expect(findWordBeforeCursor('fix teh ', 8)).toEqual({ word: 'teh', start: 4, end: 7 });
	});

	it('ignores punctuation attached to the word', () => {
		expect(wordBefore('(teh), ')).toBe('teh');
	});

	it('treats a contraction as one word', () => {
		expect(wordBefore("we've ")).toBe("we've");
	});

	it('does not reach back past a token with no letters', () => {
		expect(wordBefore('teh 123 ')).toBeNull();
		expect(wordBefore('teh -- ')).toBeNull();
	});

	it('skips words joined to digits', () => {
		expect(wordBefore('abc123 ')).toBeNull();
		expect(wordBefore('123abc ')).toBeNull();
	});

	it('returns null on a blank line', () => {
		expect(wordBefore('   ')).toBeNull();
	});

	it('uses only the text before the cursor', () => {
		expect(findWordBeforeCursor('teh wrold', 4)?.word).toBe('teh');
	});
});
