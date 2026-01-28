import type SpellFixPlugin from '../../main';
import { fixPreviousSpelling, cycleSuggestion, restoreOriginalWord, addLastSuggestionToIgnored } from './fix-previous-spelling';

export function registerCommands(plugin: SpellFixPlugin): void {
	plugin.addCommand({
		id: 'fix-previous-spelling',
		name: 'Fix previous spelling',
		callback: () => fixPreviousSpelling(plugin)
	});
	
	plugin.addCommand({
		id: 'cycle-suggestion',
		name: 'Cycle suggestion',
		callback: () => cycleSuggestion(plugin)
	});
	
	plugin.addCommand({
		id: 'restore-original-word',
		name: 'Restore original word',
		callback: () => restoreOriginalWord(plugin)
	});
	
	plugin.addCommand({
		id: 'add-last-suggestion-to-ignored',
		name: 'Add last suggestion to ignored suggestions',
		callback: () => addLastSuggestionToIgnored(plugin)
	});
}
