import type { SpellFixSettings } from '../settings';

export function isWordTooShortToCheck(word: string): boolean {
	return word.length < 2 || /\d/.test(word);
}

export function shouldIgnoreAsPluralVariant(
	word: string,
	dictionary: Set<string>,
	settings: SpellFixSettings
): boolean {
	if (!settings.ignorePluralIfSingularInDictionary) {
		return false;
	}

	if (word.length < 3) {
		return false;
	}

	const lastChar = word[word.length - 1];
	if (lastChar !== 's' && lastChar !== 'S') {
		return false;
	}

	const singular = word.slice(0, -1);
	const lowercaseSingular = singular.toLowerCase();

	return dictionary.has(singular) || dictionary.has(lowercaseSingular);
}

export function shouldIgnoreCapitalizedVariant(
	word: string,
	dictionary: Set<string>,
	settings: SpellFixSettings
): boolean {
	if (!settings.ignoreCapitalizedIfLowercaseInDictionary) {
		return false;
	}

	const lowercaseWord = word.toLowerCase();
	return word !== lowercaseWord && dictionary.has(lowercaseWord);
}
