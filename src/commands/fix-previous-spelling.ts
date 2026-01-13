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
	
	// Find the paragraph boundaries
	const paragraphStart = findParagraphStart(editor, cursor.line);
	const paragraphEnd = findParagraphEnd(editor, cursor.line);
	
	// Get paragraph text
	let paragraphText = '';
	for (let i = paragraphStart; i <= paragraphEnd; i++) {
		paragraphText += editor.getLine(i);
		if (i < paragraphEnd) {
			paragraphText += '\n';
		}
	}
	
	// Calculate cursor offset in paragraph
	const cursorOffset = getCursorOffsetInParagraph(editor, cursor, paragraphStart);
	
	// Extract all words before cursor
	const words = extractWords(paragraphText.substring(0, cursorOffset), paragraphStart, editor);
	
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

function findParagraphStart(editor: Editor, line: number): number {
	let start = line;
	while (start > 0 && editor.getLine(start - 1).trim() !== '') {
		start--;
	}
	return start;
}

function findParagraphEnd(editor: Editor, line: number): number {
	const lineCount = editor.lineCount();
	let end = line;
	while (end < lineCount - 1 && editor.getLine(end + 1).trim() !== '') {
		end++;
	}
	return end;
}

function getCursorOffsetInParagraph(editor: Editor, cursor: { line: number; ch: number }, paragraphStart: number): number {
	let offset = 0;
	for (let i = paragraphStart; i < cursor.line; i++) {
		offset += editor.getLine(i).length + 1; // +1 for newline
	}
	offset += cursor.ch;
	return offset;
}

interface Word {
	word: string;
	startCh: number;
	endCh: number;
	startLine: number;
	endLine: number;
}

function extractWords(text: string, startLine: number, editor: Editor): Word[] {
	const words: Word[] = [];
	// Match sequences of Unicode letters (works for English, Hebrew, Arabic, etc.)
	// Simple approach: match one or more Unicode letters, we'll filter for length >= 2 later
	const wordRegex = /\p{L}+/gu;
	let match;
	
	while ((match = wordRegex.exec(text)) !== null) {
		// Only include words with at least 2 letters
		if (match[0].length < 2) {
			continue;
		}
		
		const position = offsetToLineAndCh(editor, startLine, match.index);
		words.push({
			word: match[0],
			startCh: position.ch,
			endCh: position.ch + match[0].length,
			startLine: position.line,
			endLine: position.line
		});
	}
	
	return words;
}

function offsetToLineAndCh(editor: Editor, startLine: number, offset: number): { line: number; ch: number } {
	let currentOffset = 0;
	let line = startLine;
	
	while (line < editor.lineCount()) {
		const lineLength = editor.getLine(line).length;
		if (currentOffset + lineLength >= offset) {
			return {
				line: line,
				ch: offset - currentOffset
			};
		}
		currentOffset += lineLength + 1; // +1 for newline
		line++;
	}
	
	return {
		line: editor.lineCount() - 1,
		ch: editor.getLine(editor.lineCount() - 1).length
	};
}

async function getAllSuggestionsForWord(word: string): Promise<string[] | null> {
	try {
		const electron = (window as any).require?.('electron');
		if (electron) {
			const webFrame = electron.webFrame || electron.remote?.webFrame;
			if (webFrame && typeof webFrame.isWordMisspelled === 'function') {
				const isMisspelled = webFrame.isWordMisspelled(word);
				
				if (isMisspelled) {
					const suggestions = webFrame.getWordSuggestions(word);
					if (suggestions && suggestions.length > 0) {
						return suggestions;
					}
				}
			}
		}
	} catch (err) {
		// webFrame API not available
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
