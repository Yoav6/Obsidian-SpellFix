import { expect } from "vite-plus/test";
import { createPluginTest } from "obsidian-e2e/vitest";
import "obsidian-e2e/matchers";
import { pluginTestOptions } from "./setup";
import { openNoteAtCursor, readPluginSettings, sleep } from "./helpers";
import { resetPluginSettings } from "./reset-settings";

const test = createPluginTest(pluginTestOptions);

test.beforeEach(async ({ obsidian }) => {
	await resetPluginSettings(obsidian);
});

test("fix previous spelling corrects teh to the", async ({ obsidian, sandbox }) => {
	const notePath = sandbox.path("spellfix-fix.md");
	await sandbox.writeNote({ path: "spellfix-fix.md", body: "teh quick" });
	await openNoteAtCursor(obsidian, notePath, { line: 0, ch: 3 });

	await obsidian.command("spellfix:fix-previous-spelling").run();
	await expect(obsidian).toHaveEditorTextContaining("the quick");
});

test("cycle suggestion changes the corrected word", async ({ obsidian, sandbox }) => {
	const notePath = sandbox.path("spellfix-cycle.md");
	await sandbox.writeNote({ path: "spellfix-cycle.md", body: "teh quick" });
	await openNoteAtCursor(obsidian, notePath, { line: 0, ch: 3 });

	await obsidian.command("spellfix:fix-previous-spelling").run();
	await expect(obsidian).toHaveEditorTextContaining("the quick");

	await obsidian.command("spellfix:cycle-suggestion").run();
	await sleep(obsidian, 500);
	await expect(obsidian).not.toHaveEditorTextContaining("teh quick");
});

test("restore original word brings back teh", async ({ obsidian, sandbox }) => {
	const notePath = sandbox.path("spellfix-restore.md");
	await sandbox.writeNote({ path: "spellfix-restore.md", body: "teh quick" });
	await openNoteAtCursor(obsidian, notePath, { line: 0, ch: 3 });

	await obsidian.command("spellfix:fix-previous-spelling").run();
	await expect(obsidian).toHaveEditorTextContaining("the quick");

	await obsidian.command("spellfix:restore-original-word").run();
	await expect(obsidian).toHaveEditorTextContaining("teh quick");
});

test("cycle suggestion back returns to previous suggestion", async ({ obsidian, sandbox }) => {
	const notePath = sandbox.path("spellfix-cycle-back.md");
	await sandbox.writeNote({ path: "spellfix-cycle-back.md", body: "teh quick" });
	await openNoteAtCursor(obsidian, notePath, { line: 0, ch: 3 });

	await obsidian.command("spellfix:fix-previous-spelling").run();
	await expect(obsidian).toHaveEditorTextContaining("the quick");

	await obsidian.command("spellfix:cycle-suggestion").run();
	await sleep(obsidian, 500);
	await obsidian.command("spellfix:cycle-suggestion-back").run();
	await expect(obsidian).toHaveEditorTextContaining("the quick");
});

test("add last suggestion to ignored updates plugin data", async ({ obsidian, sandbox }) => {
	const notePath = sandbox.path("spellfix-ignore.md");
	await sandbox.writeNote({ path: "spellfix-ignore.md", body: "teh quick" });
	await openNoteAtCursor(obsidian, notePath, { line: 0, ch: 3 });

	await obsidian.command("spellfix:fix-previous-spelling").run();
	await expect(obsidian).toHaveEditorTextContaining("the quick");

	const beforeSettings = await readPluginSettings(obsidian);
	const beforeIgnored = String(beforeSettings.suggestionsToIgnore ?? "");

	await obsidian.command("spellfix:add-last-suggestion-to-ignored").run();
	await sleep(obsidian, 500);

	const afterSettings = await readPluginSettings(obsidian);
	const afterIgnored = String(afterSettings.suggestionsToIgnore ?? "");
	expect(afterIgnored.length).toBeGreaterThan(beforeIgnored.length);
});

test("toggle autocorrect flips the setting", async ({ obsidian }) => {
	const beforeSettings = await readPluginSettings(obsidian);
	const wasEnabled = Boolean(beforeSettings.autocorrect);

	await obsidian.command("spellfix:toggle-autocorrect").run();
	await sleep(obsidian, 500);

	const afterSettings = await readPluginSettings(obsidian);
	expect(Boolean(afterSettings.autocorrect)).toBe(!wasEnabled);
});
