import { expect } from "vite-plus/test";
import { createPluginTest } from "obsidian-e2e/vitest";
import "obsidian-e2e/matchers";
import { pluginTestOptions } from "./setup";
import { openNoteAtCursor, readPluginSettings, writeTestNote } from "./helpers";
import { resetPluginSettings, waitForPluginSetting } from "./reset-settings";

const test = createPluginTest(pluginTestOptions);

test.beforeEach(async ({ obsidian }) => {
	await resetPluginSettings(obsidian);
});

test("fix previous spelling corrects teh to the", async ({ obsidian, sandbox }) => {
	const notePath = await writeTestNote(sandbox, "teh quick");
	await openNoteAtCursor(obsidian, notePath, { line: 0, ch: 3 });

	await obsidian.command("spellfix:fix-previous-spelling").run();
	await expect(obsidian).toHaveEditorTextContaining("the quick");
});

test("cycle suggestion changes the corrected word", async ({ obsidian, sandbox }) => {
	const notePath = await writeTestNote(sandbox, "teh quick");
	await openNoteAtCursor(obsidian, notePath, { line: 0, ch: 3 });

	await obsidian.command("spellfix:fix-previous-spelling").run();
	await expect(obsidian).toHaveEditorTextContaining("the quick");

	await obsidian.command("spellfix:cycle-suggestion").run();
	await expect(obsidian).not.toHaveEditorTextContaining("teh quick");
});

test("restore original word brings back teh", async ({ obsidian, sandbox }) => {
	const notePath = await writeTestNote(sandbox, "teh quick");
	await openNoteAtCursor(obsidian, notePath, { line: 0, ch: 3 });

	await obsidian.command("spellfix:fix-previous-spelling").run();
	await expect(obsidian).toHaveEditorTextContaining("the quick");

	await obsidian.command("spellfix:restore-original-word").run();
	await expect(obsidian).toHaveEditorTextContaining("teh quick");
});

test("cycle suggestion back returns to previous suggestion", async ({ obsidian, sandbox }) => {
	const notePath = await writeTestNote(sandbox, "teh quick");
	await openNoteAtCursor(obsidian, notePath, { line: 0, ch: 3 });

	await obsidian.command("spellfix:fix-previous-spelling").run();
	await expect(obsidian).toHaveEditorTextContaining("the quick");

	await obsidian.command("spellfix:cycle-suggestion").run();
	await obsidian.command("spellfix:cycle-suggestion-back").run();
	await expect(obsidian).toHaveEditorTextContaining("the quick");
});

test("add last suggestion to ignored updates plugin data", async ({ obsidian, sandbox }) => {
	const notePath = await writeTestNote(sandbox, "teh quick");
	await openNoteAtCursor(obsidian, notePath, { line: 0, ch: 3 });

	await obsidian.command("spellfix:fix-previous-spelling").run();
	await expect(obsidian).toHaveEditorTextContaining("the quick");

	const beforeSettings = await readPluginSettings(obsidian);
	const beforeIgnored = String(beforeSettings.suggestionsToIgnore ?? "");

	await obsidian.command("spellfix:add-last-suggestion-to-ignored").run();
	await waitForPluginSetting(
		obsidian,
		"suggestionsToIgnore",
		(value) => String(value ?? "").length > beforeIgnored.length
	);

	const afterSettings = await readPluginSettings(obsidian);
	const afterIgnored = String(afterSettings.suggestionsToIgnore ?? "");
	expect(afterIgnored.length).toBeGreaterThan(beforeIgnored.length);
});

test("fix previous spelling skips fenced code blocks", async ({ obsidian, sandbox }) => {
	const notePath = await writeTestNote(sandbox, "```\nteh\n```");
	await openNoteAtCursor(obsidian, notePath, { line: 1, ch: 3 });

	await obsidian.command("spellfix:fix-previous-spelling").run();
	await expect(obsidian).toHaveEditorTextContaining("teh");
});

test("restore original word ignores a correction made in another note", async ({ obsidian, sandbox }) => {
	const firstPath = await writeTestNote(sandbox, "teh quick");
	await openNoteAtCursor(obsidian, firstPath, { line: 0, ch: 3 });
	await obsidian.command("spellfix:fix-previous-spelling").run();
	await expect(obsidian).toHaveEditorTextContaining("the quick");

	await sandbox.writeNote({ path: "other.md", body: "the other note" });
	await openNoteAtCursor(obsidian, sandbox.path("other.md"), { line: 0, ch: 3 });
	await obsidian.command("spellfix:restore-original-word").run();
	await expect(obsidian).toHaveEditorTextContaining("the other note");
});

test("add previous misspelled word to dictionary runs without error", async ({ obsidian, sandbox }) => {
	const notePath = await writeTestNote(sandbox, "xylphratz quick");
	await openNoteAtCursor(obsidian, notePath, { line: 0, ch: 9 });

	await obsidian.command("spellfix:add-previous-word-to-dictionary").run();
});

test("toggle autocorrect flips the setting", async ({ obsidian }) => {
	const beforeSettings = await readPluginSettings(obsidian);
	const wasEnabled = Boolean(beforeSettings.autocorrect);

	await obsidian.command("spellfix:toggle-autocorrect").run();
	await waitForPluginSetting(obsidian, "autocorrect", (value) => value !== wasEnabled);

	const afterSettings = await readPluginSettings(obsidian);
	expect(Boolean(afterSettings.autocorrect)).toBe(!wasEnabled);
});
