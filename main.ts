import { Plugin } from 'obsidian';
import { registerCommands } from './src/commands';
import { QuickSpellFixSettings, DEFAULT_SETTINGS } from './src/settings';
import { QuickSpellFixSettingTab } from './src/settings-tab';

export default class QuickSpellFixPlugin extends Plugin {
	settings: QuickSpellFixSettings;

	async onload() {
		await this.loadSettings();
		
		registerCommands(this);
		
		this.addSettingTab(new QuickSpellFixSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {
		console.log('Quick Spell Fix plugin unloaded');
	}
}
