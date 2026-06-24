import { expect } from "vite-plus/test";
import { createPluginTest } from "obsidian-e2e/vitest";
import "obsidian-e2e/matchers";
import { pluginTestOptions } from "./setup";
import { openNoteAtCursor, triggerAutocorrect } from "./helpers";
import { patchPluginSettings, resetPluginSettings } from "./reset-settings";

const test = createPluginTest(pluginTestOptions);

test.beforeEach(async ({ obsidian }) => {
	await resetPluginSettings(obsidian);
});

test("autocorrect fixes teh on space", async ({ obsidian, sandbox }) => {
	await patchPluginSettings(obsidian, { autocorrect: true });

	const notePath = sandbox.path("spellfix-autocorrect.md");
	await sandbox.writeNote({ path: "spellfix-autocorrect.md", body: "teh" });
	await openNoteAtCursor(obsidian, notePath, { line: 0, ch: 3 });

	await triggerAutocorrect(obsidian);
	await expect(obsidian).toHaveEditorTextContaining("the");
});
