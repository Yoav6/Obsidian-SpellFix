import { App, PluginSettingTab, Setting } from 'obsidian';
import type SpellFixPlugin from '../main';

export class SpellFixSettingTab extends PluginSettingTab {
	plugin: SpellFixPlugin;

	constructor(app: App, plugin: SpellFixPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Ignore single-letter suggestions')
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
				.setName('Single-letter exceptions')
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

		new Setting(containerEl)
			.setName('Keep iterating when no valid suggestions are found')
			.setDesc('When enabled, if a misspelled word has all suggestions filtered out, continue searching for other misspelled words on the line.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.keepIteratingWhenFiltered)
				.onChange(async (value) => {
					this.plugin.settings.keepIteratingWhenFiltered = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Autocorrect')
			.setDesc('Automatically check and correct the last word when space is pressed. Uses the same filtering and settings as the fix previous spelling command.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autocorrect)
				.onChange(async (value) => {
					this.plugin.settings.autocorrect = value;
					await this.plugin.saveSettings();
				}));
	}
}
