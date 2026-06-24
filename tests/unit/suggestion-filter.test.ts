import { describe, it, expect } from 'vitest';
import {
	filterSingleLetterSuggestions,
	filterIgnoredSuggestions,
	prioritizeSuggestions,
	applySuggestionFilters,
} from '../../src/utils/suggestion-filter';
import { DEFAULT_SETTINGS } from '../../src/settings';

describe('filterSingleLetterSuggestions', () => {
	it('keeps single-letter exceptions I and a', () => {
		const settings = {
			...DEFAULT_SETTINGS,
			ignoreSingleLetterSuggestions: true,
			singleLetterExceptions: 'I_a',
		};
		const result = filterSingleLetterSuggestions(['I', 'a', 'b', 'the'], settings);
		expect(result).toEqual(['I', 'a', 'the']);
	});

	it('passes through all suggestions when disabled', () => {
		const settings = { ...DEFAULT_SETTINGS, ignoreSingleLetterSuggestions: false };
		const result = filterSingleLetterSuggestions(['I', 'a', 'b'], settings);
		expect(result).toEqual(['I', 'a', 'b']);
	});
});

describe('filterIgnoredSuggestions', () => {
	it('removes suggestions in the ignore list', () => {
		const settings = { ...DEFAULT_SETTINGS, suggestionsToIgnore: 'ht_Th' };
		const result = filterIgnoredSuggestions(['ht', 'Th', 'the', 'that'], settings);
		expect(result).toEqual(['the', 'that']);
	});
});

describe('prioritizeSuggestions', () => {
	it('moves prioritized suggestions to the front in list order', () => {
		const settings = { ...DEFAULT_SETTINGS, suggestionsToPrioritize: 'the_of' };
		const result = prioritizeSuggestions(['quick', 'of', 'brown', 'the'], settings);
		expect(result).toEqual(['the', 'of', 'quick', 'brown']);
	});
});

describe('applySuggestionFilters', () => {
	it('returns empty array when all suggestions are filtered out', () => {
		const settings = {
			...DEFAULT_SETTINGS,
			ignoreSingleLetterSuggestions: true,
			singleLetterExceptions: '',
			suggestionsToIgnore: '',
		};
		const result = applySuggestionFilters(['I', 'a'], settings);
		expect(result).toEqual([]);
	});

	it('applies all filters in sequence', () => {
		const settings = {
			...DEFAULT_SETTINGS,
			ignoreSingleLetterSuggestions: true,
			singleLetterExceptions: 'I_a',
			suggestionsToIgnore: 'ht',
			suggestionsToPrioritize: 'the_of',
		};
		const result = applySuggestionFilters(['ht', 'of', 'I', 'the', 'quick'], settings);
		expect(result).toEqual(['the', 'of', 'I', 'quick']);
	});
});
