import { describe, it, expect } from 'vitest';
import { isReplacementInPlace } from '../../src/utils/replacement-state';

describe('isReplacementInPlace', () => {
	const position = { line: 0, ch: 4, endCh: 7 };

	it('returns true when the range still holds the replacement', () => {
		expect(isReplacementInPlace('fix the word', position, 'the')).toBe(true);
	});

	it('returns false after earlier text on the line shifts the range', () => {
		expect(isReplacementInPlace('now fix the word', position, 'the')).toBe(false);
	});

	it('returns false when the line is shorter than the range', () => {
		expect(isReplacementInPlace('fix', position, 'the')).toBe(false);
	});
});
