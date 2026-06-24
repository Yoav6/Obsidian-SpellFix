import { describe, it, expect } from 'vitest';
import { parseDictionaryFile, getLinuxDictionaryPaths } from '../../src/utils/dictionary';

describe('parseDictionaryFile', () => {
	it('trims whitespace and skips blank lines', () => {
		const result = parseDictionaryFile('  hello  \n\nworld\n  \nfoo');
		expect(result).toEqual(new Set(['hello', 'world', 'foo']));
	});

	it('returns empty set for empty content', () => {
		expect(parseDictionaryFile('')).toEqual(new Set());
	});
});

describe('getLinuxDictionaryPaths', () => {
	it('returns Flatpak, Snap, and standard paths', () => {
		const paths = getLinuxDictionaryPaths('/home/user');
		expect(paths).toEqual([
			'/home/user/.var/app/md.obsidian.Obsidian/config/obsidian/Custom Dictionary.txt',
			'/home/user/snap/obsidian/current/.config/obsidian/Custom Dictionary.txt',
			'/home/user/.config/obsidian/Custom Dictionary.txt',
		]);
	});
});
