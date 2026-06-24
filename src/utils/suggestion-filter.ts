import type { SpellFixSettings } from '../settings';

function parseUnderscoreList(value: string): string[] {
	return value.split('_').filter((s) => s.length > 0);
}

export function filterSingleLetterSuggestions(
	suggestions: string[],
	settings: SpellFixSettings
): string[] {
	if (!settings.ignoreSingleLetterSuggestions) {
		return suggestions;
	}

	const exceptions = settings.singleLetterExceptions
		.split('_')
		.filter((s) => s.length === 1);

	return suggestions.filter((s) => {
		if (s.length > 1) return true;
		return exceptions.includes(s);
	});
}

export function filterIgnoredSuggestions(
	suggestions: string[],
	settings: SpellFixSettings
): string[] {
	if (settings.suggestionsToIgnore.trim().length === 0) {
		return suggestions;
	}

	const ignoredSuggestions = parseUnderscoreList(settings.suggestionsToIgnore);
	return suggestions.filter((s) => !ignoredSuggestions.includes(s));
}

export function prioritizeSuggestions(
	suggestions: string[],
	settings: SpellFixSettings
): string[] {
	if (settings.suggestionsToPrioritize.trim().length === 0) {
		return suggestions;
	}

	const prioritizedSuggestions = parseUnderscoreList(settings.suggestionsToPrioritize);
	const prioritized: string[] = [];
	const nonPrioritized: string[] = [];

	for (const suggestion of suggestions) {
		if (prioritizedSuggestions.includes(suggestion)) {
			prioritized.push(suggestion);
		} else {
			nonPrioritized.push(suggestion);
		}
	}

	prioritized.sort(
		(a, b) => prioritizedSuggestions.indexOf(a) - prioritizedSuggestions.indexOf(b)
	);

	return prioritized.concat(nonPrioritized);
}

export function applySuggestionFilters(
	suggestions: string[],
	settings: SpellFixSettings
): string[] {
	let filtered = filterSingleLetterSuggestions(suggestions, settings);
	filtered = filterIgnoredSuggestions(filtered, settings);
	return prioritizeSuggestions(filtered, settings);
}
