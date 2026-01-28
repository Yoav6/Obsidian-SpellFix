import { Plugin, MarkdownView } from 'obsidian';
import { registerCommands } from './src/commands';
import { SpellFixSettings, DEFAULT_SETTINGS } from './src/settings';
import { SpellFixSettingTab } from './src/settings-tab';
import { autocorrectLastWord } from './src/commands/fix-previous-spelling';

export default class SpellFixPlugin extends Plugin {
	settings: SpellFixSettings;

	async onload() {
		await this.loadSettings();
		
		registerCommands(this);
		
		this.addSettingTab(new SpellFixSettingTab(this.app, this));
		
		// Register keyboard event for autocorrect
		this.registerDomEvent(document, 'keydown', async (evt: KeyboardEvent) => {
			// Only handle space key
			if (evt.key !== ' ') {
				return;
			}
			
			// Only if autocorrect is enabled
			if (!this.settings.autocorrect) {
				return;
			}
			
			// Make sure we're in a markdown view
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!activeView || !activeView.editor) {
				return;
			}
			
			// Don't prevent default - let the space be inserted
			// We'll check the word before the space
			
			// Use setTimeout to let the space be inserted first
			setTimeout(async () => {
				await autocorrectLastWord(this);
			}, 0);
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {
		console.log('SpellFix plugin unloaded');
	}
}
