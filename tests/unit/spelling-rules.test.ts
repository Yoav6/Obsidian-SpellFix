import { describe, it, expect } from 'vitest';
import {
	isWordTooShortToCheck,
	shouldIgnoreAsPluralVariant,
	shouldIgnoreCapitalizedVariant,
} from '../../src/utils/spelling-rules';
import { DEFAULT_SETTINGS } from '../../src/settings';

describe('isWordTooShortToCheck', () => {
	it('returns true for single-character words', () => {
		expect(isWordTooShortToCheck('a')).toBe(true);
	});

	it('returns true for words containing digits', () => {
		expect(isWordTooShortToCheck('v2')).toBe(true);
	});

	it('returns false for normal words', () => {
		expect(isWordTooShortToCheck('hello')).toBe(false);
	});
});

describe('shouldIgnoreAsPluralVariant', () => {
	const dictionary = new Set(['cat', 'Dog']);

	it('ignores plural when singular is in dictionary and setting is on', () => {
		const settings = { ...DEFAULT_SETTINGS, ignorePluralIfSingularInDictionary: true };
		expect(shouldIgnoreAsPluralVariant('cats', dictionary, settings)).toBe(true);
	});

	it('does not ignore when setting is off', () => {
		const settings = { ...DEFAULT_SETTINGS, ignorePluralIfSingularInDictionary: false };
		expect(shouldIgnoreAsPluralVariant('cats', dictionary, settings)).toBe(false);
	});

	it('does not apply to words shorter than 3 characters', () => {
		const settings = { ...DEFAULT_SETTINGS, ignorePluralIfSingularInDictionary: true };
		expect(shouldIgnoreAsPluralVariant('as', dictionary, settings)).toBe(false);
	});

	it('matches lowercase singular form', () => {
		const settings = { ...DEFAULT_SETTINGS, ignorePluralIfSingularInDictionary: true };
		expect(shouldIgnoreAsPluralVariant('Dogs', dictionary, settings)).toBe(true);
	});

	it('does not ignore words not ending in s', () => {
		const settings = { ...DEFAULT_SETTINGS, ignorePluralIfSingularInDictionary: true };
		expect(shouldIgnoreAsPluralVariant('cat', dictionary, settings)).toBe(false);
	});
});

describe('shouldIgnoreCapitalizedVariant', () => {
	const dictionary = new Set(['ronit']);

	it('ignores capitalized word when lowercase is in dictionary', () => {
		const settings = { ...DEFAULT_SETTINGS, ignoreCapitalizedIfLowercaseInDictionary: true };
		expect(shouldIgnoreCapitalizedVariant('Ronit', dictionary, settings)).toBe(true);
	});

	it('does not ignore when setting is off', () => {
		const settings = { ...DEFAULT_SETTINGS, ignoreCapitalizedIfLowercaseInDictionary: false };
		expect(shouldIgnoreCapitalizedVariant('Ronit', dictionary, settings)).toBe(false);
	});

	it('does not ignore already-lowercase words', () => {
		const settings = { ...DEFAULT_SETTINGS, ignoreCapitalizedIfLowercaseInDictionary: true };
		expect(shouldIgnoreCapitalizedVariant('ronit', dictionary, settings)).toBe(false);
	});
});
