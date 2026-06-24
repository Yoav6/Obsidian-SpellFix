import { describe, it, expect } from 'vitest';
import { extractWordsFromLine } from '../../src/utils/word-extraction';
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
});
