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
			.setDesc('Single letters that should NOT be filtered (underscore-separated). Example: "I_a" will keep "I" and "a" as valid suggestions.')
			.addText(text => text
				.setPlaceholder('I_a')
				.setValue(this.plugin.settings.singleLetterExceptions)
				.onChange(async (value) => {
					this.plugin.settings.singleLetterExceptions = value;
					await this.plugin.saveSettings();
				}));
		}

		new Setting(containerEl)
			.setName('Suggestions to ignore')
			.setDesc('Specific suggestions that should never be used (underscore-separated). Example: "ht_Th" will filter out these suggestions.')
			.addText(text => text
				.setPlaceholder('ht_Th')
				.setValue(this.plugin.settings.suggestionsToIgnore)
				.onChange(async (value) => {
					this.plugin.settings.suggestionsToIgnore = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Suggestions to prioritize')
			.setDesc('Suggestions that should be moved to the front of the list (underscore-separated). Example: "the_of_and" will prioritize common words.')
			.addText(text => text
				.setPlaceholder('the_of_and_a_to_is_that_it')
				.setValue(this.plugin.settings.suggestionsToPrioritize)
				.onChange(async (value) => {
					this.plugin.settings.suggestionsToPrioritize = value;
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

		new Setting(containerEl)
			.setName('Skip code blocks')
			.setDesc('When enabled, spelling corrections will skip text inside code blocks (fenced or inline).')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.skipCodeBlocks)
				.onChange(async (value) => {
					this.plugin.settings.skipCodeBlocks = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Skip LaTeX math')
			.setDesc('When enabled, spelling corrections will skip text inside LaTeX math (inline $...$ and display $$...$$).')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.skipLatexMath)
				.onChange(async (value) => {
					this.plugin.settings.skipLatexMath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Ignore capitalized words that appear uncapitalized in dictionary')
			.setDesc('When enabled, capitalized words (e.g., "Taggable") will be ignored if their lowercase version (e.g., "taggable") is in the dictionary, but not vice versa.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.ignoreCapitalizedIfLowercaseInDictionary)
				.onChange(async (value) => {
					this.plugin.settings.ignoreCapitalizedIfLowercaseInDictionary = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Ignore plural words that appear singular in dictionary')
			.setDesc('When enabled, words ending with \"s\" are ignored if their singular form (without the \"s\") appears in the dictionary.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.ignorePluralIfSingularInDictionary)
				.onChange(async (value) => {
					this.plugin.settings.ignorePluralIfSingularInDictionary = value;
					await this.plugin.saveSettings();
				}));
	}
}
