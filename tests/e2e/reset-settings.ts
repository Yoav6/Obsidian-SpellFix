import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ObsidianClient } from "obsidian-e2e";
import { DEFAULT_SETTINGS, type SpellFixSettings } from "../../src/settings";

/** Sync in-memory settings and persist — no plugin reload (settings are read at runtime). */
export async function resetPluginSettings(obsidian: ObsidianClient): Promise<void> {
	await applyPluginSettings(obsidian, DEFAULT_SETTINGS);
}

export async function applyPluginSettings(
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
}

/**
 * Reads this checkout's data.json directly. The harness builds its own path from the
 * plugin id, which misses a plugin folder named differently, like SpellFix/.
 */
function readSavedSettings(): SpellFixSettings {
	const dataPath = fileURLToPath(new URL("../../data.json", import.meta.url));
	return JSON.parse(readFileSync(dataPath, "utf8")) as SpellFixSettings;
}

export async function waitForPluginSetting<K extends keyof SpellFixSettings>(
	obsidian: ObsidianClient,
	key: K,
	predicate: (value: SpellFixSettings[K]) => boolean
): Promise<void> {
	await obsidian.waitFor(() => predicate(readSavedSettings()[key]));
}
