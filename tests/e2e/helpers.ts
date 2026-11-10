import type { ObsidianClient } from "obsidian-e2e";
import type { SandboxApi } from "obsidian-e2e";

/** Reused note filename inside each per-test sandbox directory. */
export const TEST_NOTE = "note.md";

export async function writeTestNote(
	sandbox: SandboxApi,
	body: string
): Promise<string> {
	await sandbox.writeNote({ path: TEST_NOTE, body });
	return sandbox.path(TEST_NOTE);
}

export async function openNoteAtCursor(
	obsidian: ObsidianClient,
	notePath: string,
	cursor: { line: number; ch: number }
): Promise<void> {
	await obsidian.open({ path: notePath });
	await obsidian.waitForActiveFile(notePath);
	await obsidian.app.waitUntilReady();
	await obsidian.dev.eval(`
		(() => {
			const leaf = app.workspace.activeLeaf;
			if (!leaf || !('editor' in leaf.view)) return;
			leaf.view.editor.setCursor(${JSON.stringify(cursor)});
		})()
	`);
}

export async function readPluginSettings(
	obsidian: ObsidianClient
): Promise<Record<string, unknown>> {
	return obsidian.dev.evalJson(`app.plugins.plugins['spellfix'].settings`);
}

export async function triggerAutocorrect(obsidian: ObsidianClient): Promise<void> {
	await obsidian.dev.eval(`
		(async () => {
			const leaf = app.workspace.activeLeaf;
			if (!leaf || !('editor' in leaf.view)) return;
			const editor = leaf.view.editor;
			const cursor = editor.getCursor();
			if (editor.getLine(cursor.line)[cursor.ch - 1] !== ' ') {
				editor.replaceRange(' ', cursor, cursor);
				editor.setCursor({ line: cursor.line, ch: cursor.ch + 1 });
			}
			const plugin = app.plugins.plugins['spellfix'];
			if (plugin && typeof plugin.triggerAutocorrect === 'function') {
				await plugin.triggerAutocorrect();
			}
		})()
	`);
}

/** Sends real key events, so the text arrives the same way as typing does. */
export async function typeIntoEditor(obsidian: ObsidianClient, text: string): Promise<void> {
	await obsidian.dev.eval(`
		(async () => {
			const leaf = app.workspace.activeLeaf;
			if (!leaf || !('editor' in leaf.view)) return;
			leaf.view.editor.focus();
			const webContents = window.require('electron').remote.getCurrentWebContents();
			webContents.focus();
			for (const char of ${JSON.stringify(text)}) {
				const keyCode = char === ' ' ? 'Space' : char;
				webContents.sendInputEvent({ type: 'keyDown', keyCode });
				webContents.sendInputEvent({ type: 'char', keyCode: char });
				webContents.sendInputEvent({ type: 'keyUp', keyCode });
				await new Promise((resolve) => setTimeout(resolve, 30));
			}
		})()
	`);
}
