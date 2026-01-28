import { Editor, MarkdownView, Notice } from 'obsidian';

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
		const suggestions = await getAllSuggestionsForWord(word.word, plugin);
		
		// Handle different cases:
		// null = word not misspelled or in dictionary
		// [] = word misspelled but all suggestions filtered out
		// [suggestions] = word misspelled with valid suggestions
		
		if (suggestions !== null && suggestions.length === 0) {
			// Found a misspelled word but all suggestions were filtered out
			// Always show notice for filtered words
			new Notice(`No valid suggestions for "${word.word}"`);
			
			if (plugin.settings.keepIteratingWhenFiltered) {
				// Keep searching for other misspelled words
				continue;
			} else {
				// Stop immediately
				return;
			}
		}
		
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
	
	// No misspelled words found (all words are correct or in dictionary)
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

async function getAllSuggestionsForWord(word: string, plugin: any): Promise<string[] | null> {
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
				let suggestions = webFrame.getWordSuggestions(word);
				
				if (suggestions && suggestions.length > 0) {
					// Filter out single-letter suggestions if setting is enabled
					if (plugin.settings.ignoreSingleLetterSuggestions) {
						// Parse exceptions (space-separated list of allowed single letters)
						const exceptions = plugin.settings.singleLetterExceptions
							.split(/\s+/)
							.filter((s: string) => s.length === 1);
						
						suggestions = suggestions.filter((s: string) => {
							// Keep suggestions that are longer than 1 character
							if (s.length > 1) return true;
							// Keep single-letter suggestions that are in the exceptions list
							return exceptions.includes(s);
						});
						
						// If filtering removed all suggestions, return empty array (not null)
						// This allows us to distinguish between "not misspelled" and "misspelled but filtered"
						if (suggestions.length === 0) {
							return [];
						}
					}
					
					// Filter out user-specified suggestions to ignore
					if (plugin.settings.suggestionsToIgnore.trim().length > 0) {
						// Parse ignored suggestions (space-separated list)
						const ignoredSuggestions = plugin.settings.suggestionsToIgnore
							.split(/\s+/)
							.filter((s: string) => s.length > 0);
						
						suggestions = suggestions.filter((s: string) => 
							!ignoredSuggestions.includes(s)
						);
						
						// If filtering removed all suggestions, return empty array (not null)
						if (suggestions.length === 0) {
							return [];
						}
					}
					
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
	const cursor = editor.getCursor();
	const { suggestions, position, currentIndex } = storedSuggestions;
	
	// Only cycle if cursor is on the same line as the stored suggestion
	if (cursor.line !== position.line) {
		return;
	}
	
	// Check if there are any suggestions to cycle through
	if (suggestions.length === 0) {
		new Notice('No suggestions available to cycle');
		return;
	}
	
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
	const cursor = editor.getCursor();
	const { originalWord, position } = storedSuggestions;
	
	// Only restore if cursor is on the same line as the stored suggestion
	if (cursor.line !== position.line) {
		return;
	}
	
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

export async function addLastSuggestionToIgnored(plugin: any): Promise<void> {
	if (!storedSuggestions) {
		return; // No suggestions stored, do nothing
	}
	
	const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView || !activeView.editor) {
		return;
	}
	
	const editor = activeView.editor;
	const cursor = editor.getCursor();
	const { suggestions, currentIndex, position, originalWord } = storedSuggestions;
	
	// Only work if cursor is on the same line as the stored suggestion
	if (cursor.line !== position.line) {
		return;
	}
	
	// Get the currently applied suggestion
	const currentSuggestion = suggestions[currentIndex];
	
	// Check if it's already in the ignored list
	const currentIgnored = plugin.settings.suggestionsToIgnore
		.split(/\s+/)
		.filter((s: string) => s.length > 0);
	
	if (currentIgnored.includes(currentSuggestion)) {
		// Already ignored, show notice
		new Notice(`"${currentSuggestion}" is already in ignored suggestions`);
		return;
	}
	
	// Add to the ignored list and save
	const newIgnoredList = [currentSuggestion].concat(currentIgnored).join(' ');
	plugin.settings.suggestionsToIgnore = newIgnoredList;
	await plugin.saveSettings();
	
	// Remove the current suggestion from the list
	const updatedSuggestions = suggestions.filter((s: string) => s !== currentSuggestion);
	
	// Read the current word at the stored position to get its actual length
	const currentLine = editor.getLine(position.line);
	const currentWord = currentLine.substring(position.ch, position.endCh);
	const actualEndCh = position.ch + currentWord.length;
	
	if (updatedSuggestions.length > 0) {
		// Cycle to the next suggestion (wrap around if we were at the end)
		const nextIndex = currentIndex >= updatedSuggestions.length ? 0 : currentIndex;
		const nextSuggestion = updatedSuggestions[nextIndex];
		
		// Replace with the next suggestion
		editor.replaceRange(
			nextSuggestion,
			{ line: position.line, ch: position.ch },
			{ line: position.line, ch: actualEndCh }
		);
		
		// Update stored suggestions
		storedSuggestions = {
			originalWord: originalWord,
			suggestions: updatedSuggestions,
			position: {
				line: position.line,
				ch: position.ch,
				endCh: position.ch + nextSuggestion.length
			},
			currentIndex: nextIndex
		};
		
		new Notice(`Added "${currentSuggestion}" to ignored suggestions`);
	} else {
		// No more suggestions, restore original word
		editor.replaceRange(
			originalWord,
			{ line: position.line, ch: position.ch },
			{ line: position.line, ch: actualEndCh }
		);
		
		// Update stored suggestions
		storedSuggestions = {
			originalWord: originalWord,
			suggestions: updatedSuggestions,
			position: {
				line: position.line,
				ch: position.ch,
				endCh: position.ch + originalWord.length
			},
			currentIndex: 0
		};
		
		new Notice(`Added "${currentSuggestion}" to ignored suggestions (no more suggestions, restored original word)`);
	}
}

export async function autocorrectLastWord(plugin: any): Promise<void> {
	const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView || !activeView.editor) {
		return;
	}

	const editor = activeView.editor;
	const cursor = editor.getCursor();
	
	// Get the current line text
	const currentLine = cursor.line;
	const lineText = editor.getLine(currentLine);
	
	// Get cursor position within the line (should be right after the space)
	const cursorOffset = cursor.ch;
	
	// Find the last word by scanning backwards from cursor (before the space)
	let pos = cursorOffset - 1; // Start before the space
	
	// Skip any whitespace before cursor
	while (pos >= 0 && /\s/.test(lineText[pos])) {
		pos--;
	}
	
	// If we're at the beginning or only found whitespace, nothing to check
	if (pos < 0) {
		return;
	}
	
	// Skip any non-letter characters (like ), ], -, etc.) to find the actual end of the word
	while (pos >= 0 && !/\p{L}/u.test(lineText[pos])) {
		pos--;
	}
	
	// If we didn't find any letters, nothing to check
	if (pos < 0) {
		return;
	}
	
	const wordEnd = pos + 1;
	
	// Scan backwards to find the start of the word
	let wordStart = pos;
	while (wordStart > 0 && /\p{L}/u.test(lineText[wordStart - 1])) {
		wordStart--;
	}
	
	// Extract the word
	const wordText = lineText.substring(wordStart, wordEnd);
	
	// Skip very short words or words with numbers
	if (wordText.length < 2 || /\d/.test(wordText)) {
		return;
	}
	
	// Check if this word is misspelled and get all suggestions
	const suggestions = await getAllSuggestionsForWord(wordText, plugin);
	
	// Handle different cases:
	// null = word not misspelled or in dictionary
	// [] = word misspelled but all suggestions filtered out
	// [suggestions] = word misspelled with valid suggestions
	
	if (suggestions !== null && suggestions.length === 0) {
		// Found a misspelled word but all suggestions were filtered out
		new Notice(`No valid suggestions for "${wordText}"`);
		return;
	}
	
	// If we got suggestions, the word is misspelled - replace it with the first suggestion
	if (suggestions && suggestions.length > 0) {
		const firstSuggestion = suggestions[0];
		editor.replaceRange(
			firstSuggestion,
			{ line: currentLine, ch: wordStart },
			{ line: currentLine, ch: wordEnd }
		);
		
		// Store all suggestions and original word for cycling with Alt+C and restoring with Alt+R
		storedSuggestions = {
			originalWord: wordText,
			suggestions: suggestions,
			position: {
				line: currentLine,
				ch: wordStart,
				endCh: wordStart + firstSuggestion.length
			},
			currentIndex: 0
		};
		
		// Move cursor to after the space (which is after the corrected word and any punctuation)
		// cursorOffset is the position after the space
		// wordEnd is the position after the last letter of the word
		// The difference is the number of characters (punctuation + space) after the word
		const charsAfterWord = cursorOffset - wordEnd;
		editor.setCursor({ line: currentLine, ch: wordStart + firstSuggestion.length + charsAfterWord });
	}
}
