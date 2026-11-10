import { expect } from "vite-plus/test";
import { createPluginTest } from "obsidian-e2e/vitest";
import "obsidian-e2e/matchers";
import { pluginTestOptions } from "./setup";
import { openNoteAtCursor, readPluginSettings, writeTestNote } from "./helpers";
import { applyPluginSettings, resetPluginSettings, waitForPluginSetting } from "./reset-settings";

const test = createPluginTest(pluginTestOptions);

test.beforeEach(async ({ obsidian }) => {
	await resetPluginSettings(obsidian);
});

test("skipCodeBlocks off allows correction inside inline code", async ({ obsidian, sandbox }) => {
	await applyPluginSettings(obsidian, { skipCodeBlocks: false });

	const notePath = await writeTestNote(sandbox, "`teh`");
	await openNoteAtCursor(obsidian, notePath, { line: 0, ch: 5 });

	await obsidian.command("spellfix:fix-previous-spelling").run();
	await expect(obsidian).toHaveEditorTextContaining("`the`");
});

test("skipCodeBlocks on skips correction inside inline code", async ({ obsidian, sandbox }) => {
	const notePath = await writeTestNote(sandbox, "`teh`");
	await openNoteAtCursor(obsidian, notePath, { line: 0, ch: 5 });

	await obsidian.command("spellfix:fix-previous-spelling").run();
	await expect(obsidian).toHaveEditorTextContaining("`teh`");
});

test("toggle autocorrect shows notice and persists setting", async ({ obsidian }) => {
	const before = await readPluginSettings(obsidian);
	const wasEnabled = Boolean(before.autocorrect);

	await obsidian.command("spellfix:toggle-autocorrect").run();
	await waitForPluginSetting(obsidian, "autocorrect", (value) => value !== wasEnabled);

	const after = await readPluginSettings(obsidian);
	expect(Boolean(after.autocorrect)).toBe(!wasEnabled);

	await obsidian.command("spellfix:toggle-autocorrect").run();
	await waitForPluginSetting(obsidian, "autocorrect", (value) => value === wasEnabled);

	const restored = await readPluginSettings(obsidian);
	expect(Boolean(restored.autocorrect)).toBe(wasEnabled);
});
