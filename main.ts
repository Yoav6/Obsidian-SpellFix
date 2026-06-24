import { Plugin, MarkdownView } from 'obsidian';
import { registerCommands } from './src/commands';
import { SpellFixSettings, DEFAULT_SETTINGS } from './src/settings';
import { SpellFixSettingTab } from './src/settings-tab';
import { autocorrectLastWord } from './src/commands/fix-previous-spelling';

export default class SpellFixPlugin extends Plugin {
	settings: SpellFixSettings = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();
		
		registerCommands(this);
		
		this.addSettingTab(new SpellFixSettingTab(this.app, this));
		
		// Register keyboard event for autocorrect
		this.registerDomEvent(activeDocument, 'keydown', (evt: KeyboardEvent) => {
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
			window.setTimeout(() => {
				void autocorrectLastWord(this);
			}, 0);
		});
	}

	/** Invoked by E2E tests when keyboard simulation is unavailable. */
	triggerAutocorrect = (): Promise<void> => autocorrectLastWord(this);

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<SpellFixSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {
		// Plugin cleanup
	}
}
