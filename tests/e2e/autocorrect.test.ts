import { expect } from "vite-plus/test";
import { createPluginTest } from "obsidian-e2e/vitest";
import "obsidian-e2e/matchers";
import { pluginTestOptions } from "./setup";
import { openNoteAtCursor, triggerAutocorrect, typeIntoEditor, writeTestNote } from "./helpers";
import { applyPluginSettings, resetPluginSettings } from "./reset-settings";

const test = createPluginTest(pluginTestOptions);

test.beforeEach(async ({ obsidian }) => {
	await resetPluginSettings(obsidian);
});

test("autocorrect fixes teh on space", async ({ obsidian, sandbox }) => {
	await applyPluginSettings(obsidian, { autocorrect: true });

	const notePath = await writeTestNote(sandbox, "teh");
	await openNoteAtCursor(obsidian, notePath, { line: 0, ch: 3 });

	await triggerAutocorrect(obsidian);
	await expect(obsidian).toHaveEditorTextContaining("the");
});

test("autocorrect fixes a word when space is typed", async ({ obsidian, sandbox }) => {
	await applyPluginSettings(obsidian, { autocorrect: true });

	const notePath = await writeTestNote(sandbox, "");
	await openNoteAtCursor(obsidian, notePath, { line: 0, ch: 0 });

	await typeIntoEditor(obsidian, "teh ");
	await expect(obsidian).toHaveEditorTextContaining("the");
});

test("autocorrect leaves typed text alone when disabled", async ({ obsidian, sandbox }) => {
	const notePath = await writeTestNote(sandbox, "");
	await openNoteAtCursor(obsidian, notePath, { line: 0, ch: 0 });

	await typeIntoEditor(obsidian, "teh ");
	await expect(obsidian).toHaveEditorTextContaining("teh");
});

test("autocorrect still works after a price earlier in the note", async ({ obsidian, sandbox }) => {
	await applyPluginSettings(obsidian, { autocorrect: true });

	const notePath = await writeTestNote(sandbox, "This costs $5 today.\n\nteh ");
	await openNoteAtCursor(obsidian, notePath, { line: 2, ch: 4 });

	await triggerAutocorrect(obsidian);
	await expect(obsidian).toHaveEditorTextContaining("the");
	await expect(obsidian).not.toHaveEditorTextContaining("teh");
});

test("autocorrect keeps contractions intact", async ({ obsidian, sandbox }) => {
	await applyPluginSettings(obsidian, { autocorrect: true });

	const notePath = await writeTestNote(sandbox, "we've ");
	await openNoteAtCursor(obsidian, notePath, { line: 0, ch: 6 });

	await triggerAutocorrect(obsidian);
	await expect(obsidian).toHaveEditorTextContaining("we've");
});

test("autocorrect does not change a wikilink target", async ({ obsidian, sandbox }) => {
	await applyPluginSettings(obsidian, { autocorrect: true });

	const notePath = await writeTestNote(sandbox, "[[Some Nmae]] ");
	await openNoteAtCursor(obsidian, notePath, { line: 0, ch: 14 });

	await triggerAutocorrect(obsidian);
	await expect(obsidian).toHaveEditorTextContaining("[[Some Nmae]]");
});

test("autocorrect does not change frontmatter", async ({ obsidian, sandbox }) => {
	await applyPluginSettings(obsidian, { autocorrect: true });

	const notePath = await writeTestNote(sandbox, "---\ntitle: wrold \n---\nbody");
	await openNoteAtCursor(obsidian, notePath, { line: 1, ch: 13 });

	await triggerAutocorrect(obsidian);
	await expect(obsidian).toHaveEditorTextContaining("title: wrold");
});
