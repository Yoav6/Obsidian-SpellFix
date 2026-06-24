import type { ObsidianClient } from "obsidian-e2e";

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
	await obsidian.sleep(300);
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

export async function sleep(obsidian: ObsidianClient, ms: number): Promise<void> {
	await obsidian.sleep(ms);
}
