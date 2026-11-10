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

	it('does not let a price on one line affect later lines', () => {
		const lines = ['This costs $5 today.', '', 'teh next'];
		expect(isInsideLatexMathFromLines((i) => lines[i], 2, 0)).toBe(false);
	});

	it('does not let an unclosed math span affect later lines', () => {
		const lines = ['The $x value', 'teh next'];
		expect(isInsideLatexMathFromLines((i) => lines[i], 1, 0)).toBe(false);
	});

	it('treats text after a price on the same line as prose', () => {
		const line = 'costs $5 and teh';
		expect(isInsideLatexMathFromLines(() => line, 0, line.indexOf('teh'))).toBe(false);
	});

	it('treats text between two prices as prose', () => {
		const line = 'from $5 teh to $6';
		expect(isInsideLatexMathFromLines(() => line, 0, line.indexOf('teh'))).toBe(false);
	});

	it('ignores escaped dollar signs', () => {
		const line = 'a \\$x teh';
		expect(isInsideLatexMathFromLines(() => line, 0, line.indexOf('teh'))).toBe(false);
	});

	it('finds closed inline math after a price on the same line', () => {
		const line = 'costs $5 and $teh$';
		expect(isInsideLatexMathFromLines(() => line, 0, line.indexOf('teh'))).toBe(true);
	});

	it('keeps display math open across lines', () => {
		const lines = ['$$', 'costs $5', 'teh', '$$', 'after'];
		expect(isInsideLatexMathFromLines((i) => lines[i], 2, 0)).toBe(true);
		expect(isInsideLatexMathFromLines((i) => lines[i], 4, 0)).toBe(false);
	});
});

describe('isInsideFencedCodeBlockFromLines fence matching', () => {
	const inside = (lines: string[], line: number) =>
		isInsideFencedCodeBlockFromLines((i) => lines[i], line);

	it('recognizes tilde fences', () => {
		expect(inside(['~~~', 'teh', '~~~', 'after'], 1)).toBe(true);
		expect(inside(['~~~', 'teh', '~~~', 'after'], 3)).toBe(false);
	});

	it('does not close a backtick fence with a tilde fence', () => {
		expect(inside(['```', '~~~', 'teh'], 2)).toBe(true);
	});

	it('does not close a long fence with a shorter one', () => {
		expect(inside(['````', '```', 'teh', '````', 'after'], 2)).toBe(true);
		expect(inside(['````', '```', 'teh', '````', 'after'], 4)).toBe(false);
	});

	it('does not treat single-line inline code as a fence', () => {
		expect(inside(['```code``` text', 'teh'], 1)).toBe(false);
	});

	it('does not close a fence with a line that has an info string', () => {
		expect(inside(['```', '```js', 'teh'], 2)).toBe(true);
	});
});
