import { Plugin } from 'obsidian';
import { registerCommands } from './src/commands';

export default class QuickSpellFixPlugin extends Plugin {
	async onload() {
		registerCommands(this);
	}

	onunload() {
		console.log('Quick Spell Fix plugin unloaded');
	}
}
