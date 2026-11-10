import { describe, it, expect } from 'vitest';
import { isInsideFrontmatterFromLines, isInsideNonProse } from '../../src/utils/non-prose';

function inside(line: string, word: string): boolean {
	const start = line.indexOf(word);
	return isInsideNonProse(line, start, start + word.length);
}

describe('isInsideNonProse', () => {
	it.each([
		['[[Some Nmae]] ', 'Nmae'],
		['![[Nmae.png]] ', 'Nmae'],
		['[[Some Nmae ', 'Nmae'],
		['[text](foo/nmae) ', 'nmae'],
		['https://example.com/helo ', 'helo'],
		['obsidian://open?vault=nmae ', 'nmae'],
		['www.exmaple.org ', 'exmaple'],
		['mail nmae@example.org ', 'nmae'],
		['#tgaged ', 'tgaged'],
		['text #nested/tgaged ', 'tgaged'],
		['> [!nte] ', 'nte'],
		['see[^nte] ', 'nte'],
		['text ^blcok ', 'blcok'],
	])('treats %j as non-prose', (line, word) => {
		expect(inside(line, word)).toBe(true);
	});

	it.each([
		['plain teh ', 'teh'],
		['# Heading teh ', 'teh'],
		['[teh](target) ', 'teh'],
		['[[Link]] teh ', 'teh'],
		['https://example.com teh ', 'teh'],
		['issue#teh ', 'teh'],
	])('treats %j as prose', (line, word) => {
		expect(inside(line, word)).toBe(false);
	});
});

describe('isInsideFrontmatterFromLines', () => {
	const check = (lines: string[], line: number) =>
		isInsideFrontmatterFromLines((i) => lines[i], lines.length, line);

	it('includes the lines of a closed block', () => {
		expect(check(['---', 'title: teh', '---', 'body'], 1)).toBe(true);
	});

	it('excludes the note body', () => {
		expect(check(['---', 'title: teh', '---', 'body'], 3)).toBe(false);
	});

	it('does not treat a divider without a closing line as frontmatter', () => {
		expect(check(['---', 'teh', 'more'], 1)).toBe(false);
	});

	it('requires the block to start on the first line', () => {
		expect(check(['text', '---', 'teh', '---'], 2)).toBe(false);
	});
});
