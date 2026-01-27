export interface QuickSpellFixSettings {
	ignoreSingleLetterSuggestions: boolean;
	singleLetterExceptions: string;
	suggestionsToIgnore: string;
}

export const DEFAULT_SETTINGS: QuickSpellFixSettings = {
	ignoreSingleLetterSuggestions: true,
	singleLetterExceptions: 'I a',
	suggestionsToIgnore: ''
};
