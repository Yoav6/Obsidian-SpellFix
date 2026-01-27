import { App, PluginSettingTab, Setting } from 'obsidian';
import type QuickSpellFixPlugin from '../main';

export class QuickSpellFixSettingTab extends PluginSettingTab {
	plugin: QuickSpellFixPlugin;

	constructor(app: App, plugin: QuickSpellFixPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Ignore single letter suggestions')
			.setDesc('Filter out single-character spelling suggestions. Helps prevent incorrect replacements, especially with non-Latin scripts.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.ignoreSingleLetterSuggestions)
				.onChange(async (value) => {
					this.plugin.settings.ignoreSingleLetterSuggestions = value;
					await this.plugin.saveSettings();
					this.display(); // Refresh to show/hide exceptions setting
				}));

		if (this.plugin.settings.ignoreSingleLetterSuggestions) {
			new Setting(containerEl)
				.setName('Single letter exceptions')
				.setDesc('Single letters that should NOT be filtered (space-separated). Example: "I a" will keep "I" and "a" as valid suggestions.')
				.addText(text => text
					.setPlaceholder('I a')
					.setValue(this.plugin.settings.singleLetterExceptions)
					.onChange(async (value) => {
						this.plugin.settings.singleLetterExceptions = value;
						await this.plugin.saveSettings();
					}));
		}

		new Setting(containerEl)
			.setName('Suggestions to ignore')
			.setDesc('Specific suggestions that should never be used (space-separated). Example: "ht Th" will filter out these suggestions.')
			.addText(text => text
				.setPlaceholder('ht Th')
				.setValue(this.plugin.settings.suggestionsToIgnore)
				.onChange(async (value) => {
					this.plugin.settings.suggestionsToIgnore = value;
					await this.plugin.saveSettings();
				}));
	}
}
