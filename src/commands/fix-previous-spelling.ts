import { Editor, MarkdownView, Notice } from 'obsidian';
import type SpellFixPlugin from '../../main';
import { loadCustomDictionary } from '../utils/dictionary';
import {
	isInsideFencedCodeBlockFromLines,
	isInsideInlineCode,
	isInsideLatexMathFromLines,
} from '../utils/code-detection';
import { isInsideFrontmatterFromLines, isInsideNonProse } from '../utils/non-prose';
import { isReplacementInPlace, type ReplacementPosition } from '../utils/replacement-state';
import { applySuggestionFilters } from '../utils/suggestion-filter';
import {
	isWordTooShortToCheck,
	shouldIgnoreAsPluralVariant,
	shouldIgnoreCapitalizedVariant,
} from '../utils/spelling-rules';
import { extractWordsFromLine, findWordBeforeCursor, type Word } from '../utils/word-extraction';

interface StoredSuggestions {
	filePath: string | null;
	originalWord: string;
	suggestions: string[];
	position: ReplacementPosition;
	currentIndex: number;
	currentText: string;
}

interface EditorTarget {
	editor: Editor;
	filePath: string | null;
}

interface CurrentReplacement extends EditorTarget {
	stored: StoredSuggestions;
}

interface SpellcheckerApi {
	isWordMisspelled: (word: string) => boolean;
	getWordSuggestions: (word: string) => string[];
}

let storedSuggestions: StoredSuggestions | null = null;

export function getSpellcheckerApi(): SpellcheckerApi | null {
	try {
		const electron = (window as { require?: (id: string) => unknown }).require?.('electron') as
			| {
					webFrame?: SpellcheckerApi;
					remote?: { webFrame?: SpellcheckerApi };
			  }
			| undefined;
		if (!electron) return null;

		const webFrame = electron.webFrame ?? electron.remote?.webFrame;
		if (
			webFrame &&
			typeof webFrame.isWordMisspelled === 'function' &&
			typeof webFrame.getWordSuggestions === 'function'
		) {
			return webFrame;
		}
	} catch {
		// Spellchecker not available
	}
	return null;
}

export function getActiveTarget(plugin: SpellFixPlugin): EditorTarget | null {
	const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView || !activeView.editor) {
		return null;
	}
	return { editor: activeView.editor, filePath: activeView.file?.path ?? null };
}

export function isLineExcluded(editor: Editor, line: number, plugin: SpellFixPlugin): boolean {
	const getLine = (i: number) => editor.getLine(i);
	if (isInsideFrontmatterFromLines(getLine, editor.lineCount(), line)) {
		return true;
	}
	return plugin.settings.skipCodeBlocks && isInsideFencedCodeBlockFromLines(getLine, line);
}

function isInsideLatexMath(editor: Editor, line: number, charPos: number): boolean {
	return isInsideLatexMathFromLines((i) => editor.getLine(i), line, charPos);
}

export function extractWords(text: string, lineNumber: number, editor: Editor, plugin: SpellFixPlugin): Word[] {
	return extractWordsFromLine(
		text,
		lineNumber,
		plugin.settings,
		(charPos) => isInsideLatexMath(editor, lineNumber, charPos)
	);
}

async function getAllSuggestionsForWord(word: string, plugin: SpellFixPlugin): Promise<string[] | null> {
	try {
		const webFrame = getSpellcheckerApi();
		if (!webFrame) return null;

		if (!webFrame.isWordMisspelled(word)) {
			return null;
		}

		const dictionary = loadCustomDictionary();
		if (dictionary.has(word)) {
			return null;
		}

		if (shouldIgnoreAsPluralVariant(word, dictionary, plugin.settings)) {
			return null;
		}

		if (shouldIgnoreCapitalizedVariant(word, dictionary, plugin.settings)) {
			return null;
		}

		const rawSuggestions = webFrame.getWordSuggestions(word);
		if (!rawSuggestions || rawSuggestions.length === 0) {
			return null;
		}

		const filtered = applySuggestionFilters(rawSuggestions, plugin.settings);
		if (filtered.length === 0) {
			return [];
		}

		return filtered;
	} catch {
		// Silently fail if spellchecker is not available
	}

	return null;
}

export async function fixPreviousSpelling(plugin: SpellFixPlugin): Promise<void> {
	const target = getActiveTarget(plugin);
	if (!target) {
		return;
	}

	const { editor } = target;
	const cursor = editor.getCursor();

	const currentLine = cursor.line;
	if (isLineExcluded(editor, currentLine, plugin)) {
		return;
	}

	const lineText = editor.getLine(currentLine);

	let cursorOffset = cursor.ch;

	if (cursorOffset > 0 && cursorOffset < lineText.length) {
		const charBeforeCursor = lineText[cursorOffset - 1];
		if (charBeforeCursor && !/\s/.test(charBeforeCursor)) {
			while (cursorOffset < lineText.length) {
				const char = lineText[cursorOffset];
				if (/\s/.test(char)) {
					break;
				}
				cursorOffset++;
			}
		}
	}

	const words = extractWords(lineText.substring(0, cursorOffset), currentLine, editor, plugin);

	for (let i = words.length - 1; i >= 0; i--) {
		const word = words[i];

		if (isWordTooShortToCheck(word.word)) {
			continue;
		}

		const suggestions = await getAllSuggestionsForWord(word.word, plugin);

		if (suggestions !== null && suggestions.length === 0) {
			new Notice(`No valid suggestions for "${word.word}"`);

			if (plugin.settings.keepIteratingWhenFiltered) {
				continue;
			}
			return;
		}

		if (suggestions && suggestions.length > 0) {
			const firstSuggestion = suggestions[0];
			editor.replaceRange(
				firstSuggestion,
				{ line: word.startLine, ch: word.startCh },
				{ line: word.startLine, ch: word.endCh }
			);

			storedSuggestions = {
				filePath: target.filePath,
				originalWord: word.word,
				suggestions: suggestions,
				position: {
					line: word.startLine,
					ch: word.startCh,
					endCh: word.startCh + firstSuggestion.length,
				},
				currentIndex: 0,
				currentText: firstSuggestion,
			};
			return;
		}
	}
}

function getCurrentReplacement(plugin: SpellFixPlugin): CurrentReplacement | null {
	const target = getActiveTarget(plugin);
	if (!storedSuggestions || !target || target.filePath !== storedSuggestions.filePath) {
		return null;
	}

	const { position, currentText } = storedSuggestions;
	const { editor } = target;
	if (editor.getCursor().line !== position.line || position.line >= editor.lineCount()) {
		return null;
	}

	if (!isReplacementInPlace(editor.getLine(position.line), position, currentText)) {
		return null;
	}

	return { ...target, stored: storedSuggestions };
}

function replaceCurrentText(
	{ editor, stored }: CurrentReplacement,
	text: string,
	update: Partial<Pick<StoredSuggestions, 'suggestions' | 'currentIndex'>> = {}
): void {
	const { position } = stored;
	editor.replaceRange(
		text,
		{ line: position.line, ch: position.ch },
		{ line: position.line, ch: position.endCh }
	);

	storedSuggestions = {
		...stored,
		...update,
		position: { ...position, endCh: position.ch + text.length },
		currentText: text,
	};
}

function stepSuggestion(plugin: SpellFixPlugin, step: 1 | -1): void {
	const current = getCurrentReplacement(plugin);
	if (!current) {
		return;
	}

	const { suggestions, currentIndex } = current.stored;
	if (suggestions.length === 0) {
		new Notice('No suggestions available to cycle');
		return;
	}

	const nextIndex = (currentIndex + step + suggestions.length) % suggestions.length;
	replaceCurrentText(current, suggestions[nextIndex], { currentIndex: nextIndex });
}

export function cycleSuggestion(plugin: SpellFixPlugin): void {
	stepSuggestion(plugin, 1);
}

export function cycleSuggestionBack(plugin: SpellFixPlugin): void {
	stepSuggestion(plugin, -1);
}

export function restoreOriginalWord(plugin: SpellFixPlugin): void {
	const current = getCurrentReplacement(plugin);
	if (current) {
		replaceCurrentText(current, current.stored.originalWord);
	}
}

export async function addLastSuggestionToIgnored(plugin: SpellFixPlugin): Promise<void> {
	const current = getCurrentReplacement(plugin);
	if (!current) {
		return;
	}

	const { suggestions, currentIndex, originalWord } = current.stored;
	const currentSuggestion = suggestions[currentIndex];

	const currentIgnored = plugin.settings.suggestionsToIgnore
		.split('_')
		.filter((s: string) => s.length > 0);

	if (currentIgnored.includes(currentSuggestion)) {
		new Notice(`"${currentSuggestion}" is already in ignored suggestions`);
		return;
	}

	plugin.settings.suggestionsToIgnore = [currentSuggestion].concat(currentIgnored).join('_');
	await plugin.saveSettings();

	const updatedSuggestions = suggestions.filter((s: string) => s !== currentSuggestion);

	if (updatedSuggestions.length > 0) {
		const nextIndex = currentIndex >= updatedSuggestions.length ? 0 : currentIndex;
		replaceCurrentText(current, updatedSuggestions[nextIndex], {
			suggestions: updatedSuggestions,
			currentIndex: nextIndex,
		});
		new Notice(`Added "${currentSuggestion}" to ignored suggestions`);
	} else {
		replaceCurrentText(current, originalWord, {
			suggestions: updatedSuggestions,
			currentIndex: 0,
		});
		new Notice(`Added "${currentSuggestion}" to ignored suggestions (no more suggestions, restored original word)`);
	}
}

export async function autocorrectLastWord(
	plugin: SpellFixPlugin,
	target: EditorTarget | null = getActiveTarget(plugin)
): Promise<void> {
	if (!target) {
		return;
	}

	const { editor } = target;
	const cursor = editor.getCursor();
	const currentLine = cursor.line;

	if (isLineExcluded(editor, currentLine, plugin)) {
		return;
	}

	const lineText = editor.getLine(currentLine);
	const found = findWordBeforeCursor(lineText, cursor.ch);
	if (!found) {
		return;
	}

	const { word, start, end } = found;

	if (isInsideNonProse(lineText, start, end)) {
		return;
	}

	if (plugin.settings.skipCodeBlocks && isInsideInlineCode(lineText, start, end)) {
		return;
	}

	if (plugin.settings.skipLatexMath && isInsideLatexMath(editor, currentLine, start)) {
		return;
	}

	if (isWordTooShortToCheck(word)) {
		return;
	}

	const suggestions = await getAllSuggestionsForWord(word, plugin);
	if (!suggestions || suggestions.length === 0) {
		return;
	}

	const firstSuggestion = suggestions[0];
	editor.replaceRange(
		firstSuggestion,
		{ line: currentLine, ch: start },
		{ line: currentLine, ch: end }
	);

	storedSuggestions = {
		filePath: target.filePath,
		originalWord: word,
		suggestions: suggestions,
		position: {
			line: currentLine,
			ch: start,
			endCh: start + firstSuggestion.length,
		},
		currentIndex: 0,
		currentText: firstSuggestion,
	};
}
