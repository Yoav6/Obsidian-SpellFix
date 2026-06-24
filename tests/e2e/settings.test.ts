import { expect } from "vite-plus/test";
import { createPluginTest } from "obsidian-e2e/vitest";
import "obsidian-e2e/matchers";
import { pluginTestOptions } from "./setup";
import { openNoteAtCursor, readPluginSettings, sleep } from "./helpers";
import { patchPluginSettings, resetPluginSettings } from "./reset-settings";

const test = createPluginTest(pluginTestOptions);

test.beforeEach(async ({ obsidian }) => {
	await resetPluginSettings(obsidian);
});

test("skipCodeBlocks off allows correction inside inline code", async ({ obsidian, sandbox }) => {
	await patchPluginSettings(obsidian, { skipCodeBlocks: false });

	const notePath = sandbox.path("spellfix-inline-code.md");
	await sandbox.writeNote({ path: "spellfix-inline-code.md", body: "`teh`" });
	await openNoteAtCursor(obsidian, notePath, { line: 0, ch: 5 });

	await obsidian.command("spellfix:fix-previous-spelling").run();
	await expect(obsidian).toHaveEditorTextContaining("`the`");
});

test("skipCodeBlocks on skips correction inside inline code", async ({ obsidian, sandbox }) => {
	const notePath = sandbox.path("spellfix-skip-code.md");
	await sandbox.writeNote({ path: "spellfix-skip-code.md", body: "`teh`" });
	await openNoteAtCursor(obsidian, notePath, { line: 0, ch: 5 });

	await obsidian.command("spellfix:fix-previous-spelling").run();
	await sleep(obsidian, 500);
	await expect(obsidian).toHaveEditorTextContaining("`teh`");
});

test("toggle autocorrect shows notice and persists setting", async ({ obsidian }) => {
	const before = await readPluginSettings(obsidian);

	await obsidian.command("spellfix:toggle-autocorrect").run();
	await sleep(obsidian, 500);

	const after = await readPluginSettings(obsidian);
	expect(Boolean(after.autocorrect)).toBe(!Boolean(before.autocorrect));

	await obsidian.command("spellfix:toggle-autocorrect").run();
	await sleep(obsidian, 500);

	const restored = await readPluginSettings(obsidian);
	expect(Boolean(restored.autocorrect)).toBe(Boolean(before.autocorrect));
});
