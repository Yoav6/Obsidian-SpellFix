export interface SpellFixSettings {
	ignoreSingleLetterSuggestions: boolean;
	singleLetterExceptions: string;
	suggestionsToIgnore: string;
	suggestionsToPrioritize: string;
	keepIteratingWhenFiltered: boolean;
	autocorrect: boolean;
	skipCodeBlocks: boolean;
	ignoreCapitalizedIfLowercaseInDictionary: boolean;
}

export const DEFAULT_SETTINGS: SpellFixSettings = {
	ignoreSingleLetterSuggestions: true,
	singleLetterExceptions: 'I_a',
	suggestionsToIgnore: '',
	suggestionsToPrioritize: 'the_of_and_a_to_is_that_it',
	keepIteratingWhenFiltered: false,
	autocorrect: false,
	skipCodeBlocks: true,
	ignoreCapitalizedIfLowercaseInDictionary: true
};
