export interface SpellFixSettings {
	ignoreSingleLetterSuggestions: boolean;
	singleLetterExceptions: string;
	suggestionsToIgnore: string;
	keepIteratingWhenFiltered: boolean;
	autocorrect: boolean;
}

export const DEFAULT_SETTINGS: SpellFixSettings = {
	ignoreSingleLetterSuggestions: true,
	singleLetterExceptions: 'I a',
	suggestionsToIgnore: '',
	keepIteratingWhenFiltered: false,
	autocorrect: false
};
