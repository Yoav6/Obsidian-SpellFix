import type { ObsidianClient } from "obsidian-e2e";
import { DEFAULT_SETTINGS, type SpellFixSettings } from "../../src/settings";

export async function resetPluginSettings(obsidian: ObsidianClient): Promise<void> {
	await obsidian.dev.eval(`
		(async () => {
			const plugin = app.plugins.plugins['spellfix'];
			if (!plugin) return;
			Object.assign(plugin.settings, ${JSON.stringify(DEFAULT_SETTINGS)});
			await plugin.saveSettings();
		})()
	`);
	await obsidian.plugin("spellfix").reload({ waitUntilReady: true });
}

export async function patchPluginSettings(
	obsidian: ObsidianClient,
	patch: Partial<SpellFixSettings>
): Promise<void> {
	await obsidian.dev.eval(`
		(async () => {
			const plugin = app.plugins.plugins['spellfix'];
			if (!plugin) return;
			Object.assign(plugin.settings, ${JSON.stringify(patch)});
			await plugin.saveSettings();
		})()
	`);
	await obsidian.plugin("spellfix").reload({ waitUntilReady: true });
}
