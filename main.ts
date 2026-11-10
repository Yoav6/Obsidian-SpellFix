import { Plugin } from 'obsidian';
import { registerCommands } from './src/commands';
import { SpellFixSettings, DEFAULT_SETTINGS } from './src/settings';
import { SpellFixSettingTab } from './src/settings-tab';
import { autocorrectLastWord } from './src/commands/fix-previous-spelling';
import { createAutocorrectExtension } from './src/editor/autocorrect-extension';

export default class SpellFixPlugin extends Plugin {
	settings: SpellFixSettings = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();
		
		registerCommands(this);
		
		this.addSettingTab(new SpellFixSettingTab(this.app, this));
		
		this.registerEditorExtension(createAutocorrectExtension(this));
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
