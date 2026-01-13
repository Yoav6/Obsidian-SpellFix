import { Plugin } from 'obsidian';
import { fixPreviousSpelling } from './fix-previous-spelling';

export function registerCommands(plugin: Plugin): void {
	plugin.addCommand({
		id: 'fix-previous-spelling',
		name: 'Fix previous spelling',
		hotkeys: [
			{
				modifiers: ['Alt'],
				key: 'f'
			}
		],
		callback: () => fixPreviousSpelling(plugin)
	});
}
