import { Notice } from 'obsidian';
import type SpellFixPlugin from '../../main';
import { loadCustomDictionary } from '../utils/dictionary';
import { isWordTooShortToCheck, shouldIgnoreAsPluralVariant, shouldIgnoreCapitalizedVariant } from '../utils/spelling-rules';
import { getSpellcheckerApi, getActiveTarget, isLineExcluded, extractWords } from './fix-previous-spelling';

export async function addPreviousWordToDictionary(plugin: SpellFixPlugin): Promise<void> {
	const target = getActiveTarget(plugin);
	if (!target) return;

	const { editor } = target;
	const cursor = editor.getCursor();
	const line = cursor.line;
	if (isLineExcluded(editor, line, plugin)) return;

	const api = getSpellcheckerApi();
	if (!api) { new Notice('Spellchecker API is not available'); return; }

	const electron = (window as { require?: (id: string) => unknown }).require?.('electron') as
		| { remote?: { session?: { defaultSession?: { addWordToSpellCheckerDictionary: (w: string) => boolean } } } }
		| undefined;
	const session = electron?.remote?.session?.defaultSession;
	if (!session || typeof session.addWordToSpellCheckerDictionary !== 'function') {
		new Notice('Dictionary API is not available');
		return;
	}

	const lineText = editor.getLine(line);
	let offset = cursor.ch;
	if (offset > 0 && offset < lineText.length && !/\s/.test(lineText[offset - 1])) {
		while (offset < lineText.length && !/\s/.test(lineText[offset])) offset++;
	}

	const words = extractWords(lineText.substring(0, offset), line, editor, plugin);
	const dictionary = loadCustomDictionary();

	for (let i = words.length - 1; i >= 0; i--) {
		const w = words[i].word;
		if (isWordTooShortToCheck(w)) continue;
		if (!api.isWordMisspelled(w)) continue;
		if (dictionary.has(w)) continue;
		if (shouldIgnoreAsPluralVariant(w, dictionary, plugin.settings)) continue;
		if (shouldIgnoreCapitalizedVariant(w, dictionary, plugin.settings)) continue;

		try {
			session.addWordToSpellCheckerDictionary(w);
			new Notice(`Added "${w}" to dictionary`);
		} catch {
			new Notice('Failed to add word to dictionary');
		}
		return;
	}

	new Notice('No misspelled word found');
}
