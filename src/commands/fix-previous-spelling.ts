import { Editor, MarkdownView, Notice } from 'obsidian';
import type SpellFixPlugin from '../../main';
import { loadCustomDictionary } from '../utils/dictionary';
import {
	isInsideFencedCodeBlockFromLines,
	isInsideInlineCode,
	isInsideLatexMathFromLines,
} from '../utils/code-detection';
import { applySuggestionFilters } from '../utils/suggestion-filter';
import {
	isWordTooShortToCheck,
	shouldIgnoreAsPluralVariant,
	shouldIgnoreCapitalizedVariant,
} from '../utils/spelling-rules';
import { extractWordsFromLine, type Word } from '../utils/word-extraction';

interface StoredSuggestions {
	originalWord: string;
	suggestions: string[];
	position: { line: number; ch: number; endCh: number };
	currentIndex: number;
}

interface SpellcheckerApi {
	isWordMisspelled: (word: string) => boolean;
	getWordSuggestions: (word: string) => string[];
}

let storedSuggestions: StoredSuggestions | null = null;

function getSpellcheckerApi(): SpellcheckerApi | null {
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

function isInsideFencedCodeBlock(editor: Editor, line: number): boolean {
	return isInsideFencedCodeBlockFromLines((i) => editor.getLine(i), line);
}

function isInsideLatexMath(editor: Editor, line: number, charPos: number): boolean {
	return isInsideLatexMathFromLines((i) => editor.getLine(i), line, charPos);
}

function extractWords(text: string, lineNumber: number, editor: Editor, plugin: SpellFixPlugin): Word[] {
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
	const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView || !activeView.editor) {
		return;
	}

	const editor = activeView.editor;
	const cursor = editor.getCursor();

	const currentLine = cursor.line;
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
				originalWord: word.word,
				suggestions: suggestions,
				position: {
					line: word.startLine,
					ch: word.startCh,
					endCh: word.startCh + firstSuggestion.length,
				},
				currentIndex: 0,
			};
			return;
		}
	}
}

export function cycleSuggestion(plugin: SpellFixPlugin): void {
	if (!storedSuggestions) {
		return;
	}

	const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView || !activeView.editor) {
		return;
	}

	const editor = activeView.editor;
	const cursor = editor.getCursor();
	const { suggestions, position, currentIndex } = storedSuggestions;

	if (cursor.line !== position.line) {
		return;
	}

	if (suggestions.length === 0) {
		new Notice('No suggestions available to cycle');
		return;
	}

	const currentLine = editor.getLine(position.line);
	const currentWord = currentLine.substring(position.ch, position.endCh);
	const actualEndCh = position.ch + currentWord.length;

	const nextIndex = (currentIndex + 1) % suggestions.length;
	const nextSuggestion = suggestions[nextIndex];

	editor.replaceRange(
		nextSuggestion,
		{ line: position.line, ch: position.ch },
		{ line: position.line, ch: actualEndCh }
	);

	storedSuggestions = {
		originalWord: storedSuggestions.originalWord,
		suggestions: suggestions,
		position: {
			line: position.line,
			ch: position.ch,
			endCh: position.ch + nextSuggestion.length,
		},
		currentIndex: nextIndex,
	};
}

export function cycleSuggestionBack(plugin: SpellFixPlugin): void {
	if (!storedSuggestions) {
		return;
	}

	const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView || !activeView.editor) {
		return;
	}

	const editor = activeView.editor;
	const cursor = editor.getCursor();
	const { suggestions, position, currentIndex } = storedSuggestions;

	if (cursor.line !== position.line) {
		return;
	}

	if (suggestions.length === 0) {
		new Notice('No suggestions available to cycle');
		return;
	}

	const currentLine = editor.getLine(position.line);
	const currentWord = currentLine.substring(position.ch, position.endCh);
	const actualEndCh = position.ch + currentWord.length;

	const prevIndex = (currentIndex - 1 + suggestions.length) % suggestions.length;
	const prevSuggestion = suggestions[prevIndex];

	editor.replaceRange(
		prevSuggestion,
		{ line: position.line, ch: position.ch },
		{ line: position.line, ch: actualEndCh }
	);

	storedSuggestions = {
		originalWord: storedSuggestions.originalWord,
		suggestions: suggestions,
		position: {
			line: position.line,
			ch: position.ch,
			endCh: position.ch + prevSuggestion.length,
		},
		currentIndex: prevIndex,
	};
}

export function restoreOriginalWord(plugin: SpellFixPlugin): void {
	if (!storedSuggestions) {
		return;
	}

	const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView || !activeView.editor) {
		return;
	}

	const editor = activeView.editor;
	const cursor = editor.getCursor();
	const { originalWord, position } = storedSuggestions;

	if (cursor.line !== position.line) {
		return;
	}

	const currentLine = editor.getLine(position.line);
	const currentWord = currentLine.substring(position.ch, position.endCh);
	const actualEndCh = position.ch + currentWord.length;

	editor.replaceRange(
		originalWord,
		{ line: position.line, ch: position.ch },
		{ line: position.line, ch: actualEndCh }
	);

	storedSuggestions = {
		...storedSuggestions,
		position: {
			line: position.line,
			ch: position.ch,
			endCh: position.ch + originalWord.length,
		},
	};
}

export async function addLastSuggestionToIgnored(plugin: SpellFixPlugin): Promise<void> {
	if (!storedSuggestions) {
		return;
	}

	const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView || !activeView.editor) {
		return;
	}

	const editor = activeView.editor;
	const cursor = editor.getCursor();
	const { suggestions, currentIndex, position, originalWord } = storedSuggestions;

	if (cursor.line !== position.line) {
		return;
	}

	const currentSuggestion = suggestions[currentIndex];

	const currentIgnored = plugin.settings.suggestionsToIgnore
		.split('_')
		.filter((s: string) => s.length > 0);

	if (currentIgnored.includes(currentSuggestion)) {
		new Notice(`"${currentSuggestion}" is already in ignored suggestions`);
		return;
	}

	const newIgnoredList = [currentSuggestion].concat(currentIgnored).join('_');
	plugin.settings.suggestionsToIgnore = newIgnoredList;
	await plugin.saveSettings();

	const updatedSuggestions = suggestions.filter((s: string) => s !== currentSuggestion);

	const currentLine = editor.getLine(position.line);
	const currentWord = currentLine.substring(position.ch, position.endCh);
	const actualEndCh = position.ch + currentWord.length;

	if (updatedSuggestions.length > 0) {
		const nextIndex = currentIndex >= updatedSuggestions.length ? 0 : currentIndex;
		const nextSuggestion = updatedSuggestions[nextIndex];

		editor.replaceRange(
			nextSuggestion,
			{ line: position.line, ch: position.ch },
			{ line: position.line, ch: actualEndCh }
		);

		storedSuggestions = {
			originalWord: originalWord,
			suggestions: updatedSuggestions,
			position: {
				line: position.line,
				ch: position.ch,
				endCh: position.ch + nextSuggestion.length,
			},
			currentIndex: nextIndex,
		};

		new Notice(`Added "${currentSuggestion}" to ignored suggestions`);
	} else {
		editor.replaceRange(
			originalWord,
			{ line: position.line, ch: position.ch },
			{ line: position.line, ch: actualEndCh }
		);

		storedSuggestions = {
			originalWord: originalWord,
			suggestions: updatedSuggestions,
			position: {
				line: position.line,
				ch: position.ch,
				endCh: position.ch + originalWord.length,
			},
			currentIndex: 0,
		};

		new Notice(`Added "${currentSuggestion}" to ignored suggestions (no more suggestions, restored original word)`);
	}
}

export async function autocorrectLastWord(plugin: SpellFixPlugin): Promise<void> {
	const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView || !activeView.editor) {
		return;
	}

	const editor = activeView.editor;
	const cursor = editor.getCursor();

	const currentLine = cursor.line;
	const lineText = editor.getLine(currentLine);

	if (plugin.settings.skipCodeBlocks) {
		if (isInsideFencedCodeBlock(editor, currentLine)) {
			return;
		}
	}

	const cursorOffset = cursor.ch;

	let pos = cursorOffset - 1;

	while (pos >= 0 && /\s/.test(lineText[pos])) {
		pos--;
	}

	if (pos < 0) {
		return;
	}

	while (pos >= 0 && !/\p{L}/u.test(lineText[pos])) {
		pos--;
	}

	if (pos < 0) {
		return;
	}

	const wordEnd = pos + 1;

	let wordStart = pos;
	while (wordStart > 0 && /\p{L}/u.test(lineText[wordStart - 1])) {
		wordStart--;
	}

	if (plugin.settings.skipCodeBlocks) {
		if (isInsideInlineCode(lineText, wordStart, wordEnd)) {
			return;
		}
	}

	if (plugin.settings.skipLatexMath) {
		if (isInsideLatexMath(editor, currentLine, wordStart)) {
			return;
		}
	}

	const wordText = lineText.substring(wordStart, wordEnd);

	if (isWordTooShortToCheck(wordText)) {
		return;
	}

	const suggestions = await getAllSuggestionsForWord(wordText, plugin);

	if (suggestions !== null && suggestions.length === 0) {
		new Notice(`No valid suggestions for "${wordText}"`);
		return;
	}

	if (suggestions && suggestions.length > 0) {
		const firstSuggestion = suggestions[0];
		editor.replaceRange(
			firstSuggestion,
			{ line: currentLine, ch: wordStart },
			{ line: currentLine, ch: wordEnd }
		);

		storedSuggestions = {
			originalWord: wordText,
			suggestions: suggestions,
			position: {
				line: currentLine,
				ch: wordStart,
				endCh: wordStart + firstSuggestion.length,
			},
			currentIndex: 0,
		};

		const charsAfterWord = cursorOffset - wordEnd;
		editor.setCursor({ line: currentLine, ch: wordStart + firstSuggestion.length + charsAfterWord });
	}
}
