import { expect } from "vite-plus/test";
import { createPluginTest } from "obsidian-e2e/vitest";
import "obsidian-e2e/matchers";
import { pluginTestOptions } from "./setup";

const test = createPluginTest(pluginTestOptions);

test("plugin is loaded with all commands registered", async ({ obsidian }) => {
	await expect(obsidian).toHaveCommand("spellfix:fix-previous-spelling");
	await expect(obsidian).toHaveCommand("spellfix:cycle-suggestion");
	await expect(obsidian).toHaveCommand("spellfix:cycle-suggestion-back");
	await expect(obsidian).toHaveCommand("spellfix:restore-original-word");
	await expect(obsidian).toHaveCommand("spellfix:add-last-suggestion-to-ignored");
	await expect(obsidian).toHaveCommand("spellfix:toggle-autocorrect");
});
