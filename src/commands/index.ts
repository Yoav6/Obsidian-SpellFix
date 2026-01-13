import { Plugin } from 'obsidian';
import { fixPreviousSpelling, cycleSuggestion, restoreOriginalWord } from './fix-previous-spelling';

export function registerCommands(plugin: Plugin): void {
	plugin.addCommand({
		id: 'fix-previous-spelling',
		name: 'Fix previous spelling',
		hotkeys: [
			{
				modifiers: ['Alt'],
				key: 'F'
			}
		],
		callback: () => fixPreviousSpelling(plugin)
	});
	
	plugin.addCommand({
		id: 'cycle-suggestion',
		name: 'Cycle suggestion',
		hotkeys: [
			{
				modifiers: ['Alt'],
				key: 'C'
			}
		],
		callback: () => cycleSuggestion(plugin)
	});
	
	plugin.addCommand({
		id: 'restore-original-word',
		name: 'Restore original word',
		hotkeys: [
			{
				modifiers: ['Alt'],
				key: 'R'
			}
		],
		callback: () => restoreOriginalWord(plugin)
	});
}
