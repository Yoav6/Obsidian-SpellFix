import { Editor, MarkdownView } from 'obsidian';

// Store suggestions for the last corrected word
interface StoredSuggestions {
	originalWord: string;
	suggestions: string[];
	position: { line: number; ch: number; endCh: number };
	currentIndex: number;
}

let storedSuggestions: StoredSuggestions | null = null;

export async function fixPreviousSpelling(plugin: any): Promise<void> {
	const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView || !activeView.editor) {
		return;
	}

	const editor = activeView.editor;
	const cursor = editor.getCursor();
	
	// Get the current line text (treat each line independently)
	const currentLine = cursor.line;
	const lineText = editor.getLine(currentLine);
	
	// Get cursor position within the line
	let cursorOffset = cursor.ch;
	
	// Check if we're in the middle of a word - if so, advance to the end of the word
	// This ensures we check the complete word, not a partial one
	if (cursorOffset > 0 && cursorOffset < lineText.length) {
		const charBeforeCursor = lineText[cursorOffset - 1];
		// If previous character is not whitespace, we're inside a word
		if (charBeforeCursor && !/\s/.test(charBeforeCursor)) {
			// Scan forward to find the end of the current word
			while (cursorOffset < lineText.length) {
				const char = lineText[cursorOffset];
				// Stop at whitespace or end of line
				if (/\s/.test(char)) {
					break;
				}
				cursorOffset++;
			}
		}
	}
	
	// Extract words only up to the effective cursor position on the current line
	const words = extractWords(lineText.substring(0, cursorOffset), currentLine, editor);
	
	// Check words backwards - for each word, check if native spellchecker has suggestions
	for (let i = words.length - 1; i >= 0; i--) {
		const word = words[i];
		
		// Skip very short words or words with numbers
		if (word.word.length < 2 || /\d/.test(word.word)) {
			continue;
		}
		
		// Check if this word is misspelled and get all suggestions
		const suggestions = await getAllSuggestionsForWord(word.word);
		
		// If we got suggestions, the word is misspelled - replace it with the first suggestion
		if (suggestions && suggestions.length > 0) {
			const firstSuggestion = suggestions[0];
			editor.replaceRange(
				firstSuggestion,
				{ line: word.startLine, ch: word.startCh },
				{ line: word.startLine, ch: word.endCh }
			);
			
			// Store all suggestions and original word for cycling with Alt+C and restoring with Alt+r
			storedSuggestions = {
				originalWord: word.word,
				suggestions: suggestions,
				position: {
					line: word.startLine,
					ch: word.startCh,
					endCh: word.startCh + firstSuggestion.length
				},
				currentIndex: 0
			};
			return;
		}
	}
}

interface Word {
	word: string;
	startCh: number;
	endCh: number;
	startLine: number;
	endLine: number;
}

function extractWords(text: string, lineNumber: number, editor: Editor): Word[] {
	const words: Word[] = [];
	// Match sequences of Unicode letters (works for English, Hebrew, Arabic, etc.)
	const wordRegex = /\p{L}+/gu;
	let match;
	
	while ((match = wordRegex.exec(text)) !== null) {
		// Only include words with at least 2 letters
		if (match[0].length < 2) {
			continue;
		}
		
		words.push({
			word: match[0],
			startCh: match.index,
			endCh: match.index + match[0].length,
			startLine: lineNumber,
			endLine: lineNumber
		});
	}
	
	return words;
}

// Load custom dictionary words
let customDictionaryWords: Set<string> | null = null;

async function loadCustomDictionary(): Promise<Set<string>> {
	if (customDictionaryWords !== null) {
		return customDictionaryWords;
	}
	
	customDictionaryWords = new Set<string>();
	
	try {
		const fs = require('fs');
		const path = require('path');
		const os = require('os');
		
		const homeDir = os.homedir();
		let dictPath: string | null = null;
		
		if (process.platform === 'win32') {
			// Windows: C:\Users\<username>\AppData\Roaming\obsidian\Custom Dictionary.txt
			const appData = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
			dictPath = path.join(appData, 'obsidian', 'Custom Dictionary.txt');
		} else if (process.platform === 'darwin') {
			// macOS: ~/Library/Application Support/obsidian/Custom Dictionary.txt
			dictPath = path.join(homeDir, 'Library', 'Application Support', 'obsidian', 'Custom Dictionary.txt');
		} else {
			// Linux - try all known installation methods
			const possiblePaths = [
				path.join(homeDir, '.var', 'app', 'md.obsidian.Obsidian', 'config', 'obsidian', 'Custom Dictionary.txt'), // Flatpak
				path.join(homeDir, 'snap', 'obsidian', 'current', '.config', 'obsidian', 'Custom Dictionary.txt'), // Snap
				path.join(homeDir, '.config', 'obsidian', 'Custom Dictionary.txt'), // Standard (deb/AppImage)
			];
			
			for (const possiblePath of possiblePaths) {
				if (fs.existsSync(possiblePath)) {
					dictPath = possiblePath;
					break;
				}
			}
		}
		
		if (dictPath && fs.existsSync(dictPath)) {
			const content = fs.readFileSync(dictPath, 'utf8');
			const words = content.split('\n').map((w: string) => w.trim()).filter((w: string) => w.length > 0);
			customDictionaryWords = new Set(words);
		}
	} catch (err) {
		// Silently fail if dictionary cannot be loaded
	}
	
	return customDictionaryWords;
}

async function getAllSuggestionsForWord(word: string): Promise<string[] | null> {
	try {
		// First, check if the native spellchecker considers the word misspelled
		const electron = (window as any).require?.('electron');
		if (electron) {
			const webFrame = electron.webFrame || electron.remote?.webFrame;
			if (webFrame && typeof webFrame.isWordMisspelled === 'function' && typeof webFrame.getWordSuggestions === 'function') {
				// Check if word is misspelled according to the native spellchecker
				const isMisspelled = webFrame.isWordMisspelled(word);
				
				if (!isMisspelled) {
					return null;
				}
				
				// Word is misspelled according to native spellchecker
				// Check if it's in the custom dictionary (which webFrame doesn't always respect correctly)
				const dictionary = await loadCustomDictionary();
				if (dictionary.has(word) || dictionary.has(word.toLowerCase())) {
					return null; // Word is in custom dictionary, don't correct it
				}
				
				// Get suggestions
				const suggestions = webFrame.getWordSuggestions(word);
				
				if (suggestions && suggestions.length > 0) {
					return suggestions;
				}
			}
		}
	} catch (err) {
		// Silently fail if spellchecker is not available
	}
	
	return null;
}

export function cycleSuggestion(plugin: any): void {
	if (!storedSuggestions) {
		return; // No suggestions stored, do nothing
	}
	
	const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView || !activeView.editor) {
		return;
	}
	
	const editor = activeView.editor;
	const { suggestions, position, currentIndex } = storedSuggestions;
	
	// Read the current word at the stored position to get its actual length
	const currentLine = editor.getLine(position.line);
	const currentWord = currentLine.substring(position.ch, position.endCh);
	
	// If the word at the position doesn't match any suggestion, the position might be stale
	// In that case, try to find the word by checking if any suggestion matches
	const actualEndCh = position.ch + currentWord.length;
	
	// Cycle to the next suggestion
	const nextIndex = (currentIndex + 1) % suggestions.length;
	const nextSuggestion = suggestions[nextIndex];
	
	// Replace the word with the next suggestion
	editor.replaceRange(
		nextSuggestion,
		{ line: position.line, ch: position.ch },
		{ line: position.line, ch: actualEndCh }
	);
	
	// Update stored suggestions with new index and end position
	storedSuggestions = {
		originalWord: storedSuggestions.originalWord,
		suggestions: suggestions,
		position: {
			line: position.line,
			ch: position.ch,
			endCh: position.ch + nextSuggestion.length
		},
		currentIndex: nextIndex
	};
}

export function restoreOriginalWord(plugin: any): void {
	if (!storedSuggestions) {
		return; // No suggestions stored, do nothing
	}
	
	const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView || !activeView.editor) {
		return;
	}
	
	const editor = activeView.editor;
	const { originalWord, position } = storedSuggestions;
	
	// Read the current word at the stored position to get its actual length
	const currentLine = editor.getLine(position.line);
	const currentWord = currentLine.substring(position.ch, position.endCh);
	const actualEndCh = position.ch + currentWord.length;
	
	// Replace with the original word
	editor.replaceRange(
		originalWord,
		{ line: position.line, ch: position.ch },
		{ line: position.line, ch: actualEndCh }
	);
	
	// Update stored suggestions with original word's end position
	storedSuggestions = {
		...storedSuggestions,
		position: {
			line: position.line,
			ch: position.ch,
			endCh: position.ch + originalWord.length
		}
	};
}
