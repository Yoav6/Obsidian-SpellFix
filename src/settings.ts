export interface QuickSpellFixSettings {
	ignoreSingleLetterSuggestions: boolean;
	singleLetterExceptions: string;
	suggestionsToIgnore: string;
	keepIteratingWhenFiltered: boolean;
	autocorrect: boolean;
}

export const DEFAULT_SETTINGS: QuickSpellFixSettings = {
	ignoreSingleLetterSuggestions: true,
	singleLetterExceptions: 'I a',
	suggestionsToIgnore: '',
	keepIteratingWhenFiltered: false,
	autocorrect: false
};
