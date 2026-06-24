import { describe, it, expect } from 'vitest';
import {
	isInsideInlineCode,
	isInsideLatexMathFromLines,
	isInsideFencedCodeBlockFromLines,
	scanLatexMathDelimiters,
} from '../../src/utils/code-detection';

describe('isInsideInlineCode', () => {
	it('returns true for words inside backticks', () => {
		expect(isInsideInlineCode('fix `teh` word', 5, 8)).toBe(true);
	});

	it('returns false for words outside backticks', () => {
		expect(isInsideInlineCode('fix teh word', 4, 7)).toBe(false);
	});
});

describe('isInsideFencedCodeBlockFromLines', () => {
	it('returns true on a fence line', () => {
		const lines = ['```', 'teh'];
		expect(isInsideFencedCodeBlockFromLines((i) => lines[i], 0)).toBe(true);
	});

	it('returns true inside a fenced block', () => {
		const lines = ['```js', 'teh', '```', 'outside'];
		expect(isInsideFencedCodeBlockFromLines((i) => lines[i], 1)).toBe(true);
	});

	it('returns false outside a fenced block', () => {
		const lines = ['```js', 'code', '```', 'teh'];
		expect(isInsideFencedCodeBlockFromLines((i) => lines[i], 3)).toBe(false);
	});
});

describe('scanLatexMathDelimiters', () => {
	it('tracks inline math delimiters', () => {
		const state = { insideDisplayMath: false, insideInlineMath: false };
		scanLatexMathDelimiters('value $x$ rest', 9, state);
		expect(state.insideInlineMath).toBe(false);
	});

	it('tracks display math delimiters', () => {
		const state = { insideDisplayMath: false, insideInlineMath: false };
		scanLatexMathDelimiters('$$x', 3, state);
		expect(state.insideDisplayMath).toBe(true);
	});
});

describe('isInsideLatexMathFromLines', () => {
	it('returns true for words inside inline math', () => {
		const lines = ['The $x value'];
		expect(isInsideLatexMathFromLines((i) => lines[i], 0, 6)).toBe(true);
	});

	it('returns true for words inside display math', () => {
		const lines = ['$$', 'x value'];
		expect(isInsideLatexMathFromLines((i) => lines[i], 1, 1)).toBe(true);
	});

	it('returns false outside math delimiters', () => {
		const lines = ['The value $x$ here'];
		expect(isInsideLatexMathFromLines((i) => lines[i], 0, 4)).toBe(false);
	});
});
