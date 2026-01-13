import { Editor, MarkdownView } from 'obsidian';

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
		
		// Check if this word is misspelled and get suggestion
		const suggestion = await getSuggestionForWord(word.word);
		
		// If we got a suggestion, the word is misspelled - replace it
		if (suggestion && suggestion !== word.word) {
			editor.replaceRange(
				suggestion,
				{ line: word.startLine, ch: word.startCh },
				{ line: word.startLine, ch: word.endCh }
			);
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
	const wordRegex = /\b[a-zA-Z]{2,}\b/g;
	let match;
	
	while ((match = wordRegex.exec(text)) !== null) {
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

async function getSuggestionForWord(word: string): Promise<string | null> {
	try {
		const electron = (window as any).require?.('electron');
		if (electron) {
			const webFrame = electron.webFrame || electron.remote?.webFrame;
			if (webFrame && typeof webFrame.isWordMisspelled === 'function') {
				const isMisspelled = webFrame.isWordMisspelled(word);
				
				if (isMisspelled) {
					const suggestions = webFrame.getWordSuggestions(word);
					if (suggestions && suggestions.length > 0) {
						return suggestions[0];
					}
				}
			}
		}
	} catch (err) {
		// webFrame API not available
	}
	
	return null;
}
