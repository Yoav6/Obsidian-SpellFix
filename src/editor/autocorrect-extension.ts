import { EditorView, type ViewUpdate } from '@codemirror/view';
import { editorInfoField } from 'obsidian';
import type SpellFixPlugin from '../../main';
import { autocorrectLastWord } from '../commands/fix-previous-spelling';

function isTypedSpace(update: ViewUpdate): boolean {
	if (!update.docChanged || update.state.selection.ranges.length !== 1) {
		return false;
	}

	return update.transactions.some((transaction) => {
		if (!transaction.isUserEvent('input.type')) {
			return false;
		}

		let insertedSpace = false;
		transaction.changes.iterChanges((_fromA, _toA, _fromB, _toB, inserted) => {
			insertedSpace = inserted.toString() === ' ';
		});
		return insertedSpace;
	});
}

/**
 * Lives on the editor rather than the document, so it covers every editor in every
 * window and ignores spaces typed elsewhere, like the note title or the search box.
 */
export function createAutocorrectExtension(plugin: SpellFixPlugin) {
	return EditorView.updateListener.of((update) => {
		if (!plugin.settings.autocorrect || !isTypedSpace(update)) {
			return;
		}

		const info = update.state.field(editorInfoField, false);
		const editor = info?.editor;
		if (!editor) {
			return;
		}

		// An editor cannot be changed while it is still applying this update.
		queueMicrotask(() => {
			void autocorrectLastWord(plugin, { editor, filePath: info.file?.path ?? null });
		});
	});
}
