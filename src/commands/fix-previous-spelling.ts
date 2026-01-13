import { Editor, MarkdownView } from 'obsidian';

export async function fixPreviousSpelling(plugin: any): Promise<void> {
	console.log('fixPreviousSpelling called');
	
	const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView || !activeView.editor) {
		console.log('No active view or editor');
		return;
	}

	const editor = activeView.editor;
	const cursor = editor.getCursor();
	console.log('Cursor position:', cursor);
	
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
	
	console.log('Found', words.length, 'words before cursor');
	
	// Check words backwards - for each word, check if native spellchecker has suggestions
	// If suggestions exist, the word is misspelled - replace it
	for (let i = words.length - 1; i >= 0; i--) {
		const word = words[i];
		
		// Skip very short words or words with numbers
		if (word.word.length < 2 || /\d/.test(word.word)) {
			continue;
		}
		
		console.log('Checking word:', word.word, 'at', word.startLine, word.startCh);
		
		// Check if this word has suggestions
		const suggestion = await getSuggestionForWord(
			word.word,
			word.startLine,
			word.startCh,
			editor,
			cursor
		);
		
		console.log('Got suggestion for', word.word, ':', suggestion);
		
		// If we got a suggestion, the word is misspelled - replace it
		if (suggestion && suggestion !== word.word) {
			console.log('Replacing', word.word, 'with', suggestion);
			editor.replaceRange(
				suggestion,
				{ line: word.startLine, ch: word.startCh },
				{ line: word.startLine, ch: word.endCh }
			);
			return;
		}
	}
	
	console.log('No misspelled words found');
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
	const wordRegex = /\b[a-zA-Z]{2,}\b/g; // At least 2 letters
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

interface MisspelledWord {
	word: string;
	line: number;
	ch: number;
}

function findMisspelledWordBeforeCursor(
	editor: Editor,
	cursor: { line: number; ch: number },
	editorEl: HTMLElement
): MisspelledWord | null {
	// Get the cursor position in the document
	const cmEditor = (editor as any).cm;
	if (!cmEditor || !cmEditor.view) {
		return null;
	}
	
	const cursorPos = cmEditor.view.state.doc.line(cursor.line + 1).from + cursor.ch;
	
	// Walk through text nodes in the editor DOM to find misspelled words
	const walker = document.createTreeWalker(
		editorEl,
		NodeFilter.SHOW_TEXT,
		null
	);
	
	let textNode: Node | null;
	const misspelledWords: MisspelledWord[] = [];
	
	while ((textNode = walker.nextNode())) {
		if (!textNode.textContent) continue;
		
		// Check if this text node contains misspelled words
		// Misspelled words are typically wrapped in <mark> elements or have special styling
		// We'll check the parent element for spellcheck markers
		const parent = textNode.parentElement;
		if (!parent) continue;
		
		// Check if the parent has spellcheck markers (browsers mark misspelled words)
		// We'll look for text that's marked as misspelled by checking the computed style
		// or by looking for <mark> elements
		
		// Create a range for this text node
		const range = document.createRange();
		range.selectNodeContents(textNode);
		
		// Get the text content and check each word
		const text = textNode.textContent;
		const words = text.match(/\b[a-zA-Z]{2,}\b/g);
		
		if (!words) continue;
		
		// For each word, check if it's misspelled by looking at the DOM structure
		// or by checking if it's in a <mark> element
		let offset = 0;
		for (const word of words) {
			const wordIndex = text.indexOf(word, offset);
			if (wordIndex === -1) continue;
			offset = wordIndex + word.length;
			
			// Check if this word is before the cursor
			// We need to map the DOM position to editor position
			const wordStartInNode = wordIndex;
			const wordEndInNode = wordIndex + word.length;
			
			// Try to find if this word is marked as misspelled
			// by checking if it's in a <mark> element or has spellcheck styling
			const wordRange = document.createRange();
			wordRange.setStart(textNode, wordStartInNode);
			wordRange.setEnd(textNode, wordEndInNode);
			
			// Check if the word is in a mark element (browser spellcheck marker)
			let container = wordRange.commonAncestorContainer;
			if (container.nodeType === Node.TEXT_NODE) {
				container = container.parentElement || container;
			}
			
			// Check if this word is marked as misspelled
			// Browsers typically wrap misspelled words in <mark> elements
			let isMisspelled = false;
			let checkEl: Element | null = container as Element;
			
			while (checkEl && checkEl !== editorEl) {
				if (checkEl.tagName === 'MARK' || 
				    checkEl.classList.contains('spellcheck-error') ||
				    checkEl.getAttribute('spellcheck') === 'false') {
					isMisspelled = true;
					break;
				}
				checkEl = checkEl.parentElement;
			}
			
			// Also check computed style for text-decoration (red underline)
			if (!isMisspelled) {
				const rect = wordRange.getBoundingClientRect();
				if (rect.width > 0 && rect.height > 0) {
					// Create a temporary selection to check styling
					const selection = window.getSelection();
					if (selection) {
						selection.removeAllRanges();
						selection.addRange(wordRange.cloneRange());
						
						// Check if there's a text-decoration underline (spellcheck marker)
						// This is a heuristic - browsers mark misspelled words with underlines
						// We'll use a different approach: check if the word is in a mark element
						
						selection.removeAllRanges();
					}
				}
			}
			
			// If misspelled, try to map to editor coordinates
			if (isMisspelled) {
				// Map DOM position to editor line/ch
				// This is approximate - we'll need to find the line that contains this text
				const paragraphStart = findParagraphStart(editor, cursor.line);
				const paragraphEnd = findParagraphEnd(editor, cursor.line);
				
				// Get paragraph text to find word position
				let paragraphText = '';
				for (let i = paragraphStart; i <= paragraphEnd; i++) {
					paragraphText += editor.getLine(i);
					if (i < paragraphEnd) {
						paragraphText += '\n';
					}
				}
				
				// Find the word in the paragraph text
				const wordIndexInParagraph = paragraphText.indexOf(word);
				if (wordIndexInParagraph !== -1) {
					const position = offsetToLineAndCh(editor, paragraphStart, wordIndexInParagraph);
					const wordEndCh = position.ch + word.length;
					
					// Check if this word is before the cursor
					if (position.line < cursor.line || 
					    (position.line === cursor.line && wordEndCh <= cursor.ch)) {
						misspelledWords.push({
							word: word,
							line: position.line,
							ch: position.ch
						});
					}
				}
			}
		}
	}
	
	// Return the last (closest to cursor) misspelled word
	if (misspelledWords.length > 0) {
		return misspelledWords[misspelledWords.length - 1];
	}
	
	return null;
}

async function getSuggestionForWord(
	word: string,
	line: number,
	ch: number,
	editor: Editor,
	originalCursor: { line: number; ch: number }
): Promise<string | null> {
	console.log('getSuggestionForWord called for:', word);
	
	// Try to access Electron's webFrame API directly
	try {
		const electron = (window as any).require?.('electron');
		if (electron) {
			const webFrame = electron.webFrame || electron.remote?.webFrame;
			if (webFrame) {
				console.log('Found webFrame API');
				const isMisspelled = webFrame.isWordMisspelled(word);
				console.log('Word is misspelled:', isMisspelled);
				
				if (isMisspelled) {
					const suggestions = webFrame.getWordSuggestions(word);
					console.log('Got suggestions:', suggestions);
					if (suggestions && suggestions.length > 0) {
						return suggestions[0];
					}
				}
				return null;
			}
		}
	} catch (err) {
		console.log('Could not access webFrame API:', err);
	}
	
	// Fallback: Try to get suggestions via context menu
	return new Promise((resolve) => {
		// Save current state
		const hadSelection = editor.somethingSelected();
		const originalSelection = hadSelection ? {
			from: editor.getCursor('from'),
			to: editor.getCursor('to')
		} : null;
		
		// Select the word
		editor.setCursor({ line, ch });
		editor.setSelection({ line, ch }, { line, ch: ch + word.length });

		let resolved = false;
		const finish = (suggestion: string | null) => {
			if (resolved) return;
			resolved = true;
			// Restore cursor after we're done
			restoreCursor(editor, originalCursor, originalSelection);
			resolve(suggestion);
		};
		
		// Use MutationObserver to detect when menu appears
		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const node of Array.from(mutation.addedNodes)) {
					if (node.nodeType === Node.ELEMENT_NODE) {
						const el = node as HTMLElement;
						// Check if this is a menu
						if (el.classList.contains('menu') || 
						    el.getAttribute('role') === 'menu' ||
						    el.tagName === 'MENU' ||
						    (el.offsetHeight > 0 && el.offsetWidth > 0 && 
						     (el.classList.contains('context-menu') || el.id.includes('menu')))) {
							observer.disconnect();
							checkMenuForSuggestions(el, word, finish);
							return;
						}
					}
				}
			}
		});
		
		// Start observing
		observer.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: false
		});
		
		// Wait for selection to be rendered in DOM, then open menu
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				// Get the editor's DOM element
				const cmEditor = (editor as any).cm;
				if (!cmEditor || !cmEditor.view) {
					observer.disconnect();
					finish(null);
					return;
				}
				
				const editorEl = cmEditor.view.dom;
				if (!editorEl) {
					observer.disconnect();
					finish(null);
					return;
				}
				
				// Focus the editor to ensure it's active
				editorEl.focus();
				
				// Get the actual DOM selection
				const selection = window.getSelection();
				if (!selection || selection.rangeCount === 0) {
					// Fallback: try to create a range manually
					const from = cmEditor.view.state.doc.line(line + 1).from + ch;
					const to = from + word.length;
					
					// Try Obsidian's command first
					const app = (window as any).app;
					if (app && app.commands) {
						console.log('Executing context menu command');
						try {
							app.commands.executeCommandById('editor:open-context-menu');
						} catch (err) {
							console.log('Context menu command error:', err);
						}
					}
					
					// Also try right-click at calculated position
					setTimeout(() => {
						const coords = cmEditor.view.coordsAtPos(from);
						if (coords) {
							const contextEvent = new MouseEvent('contextmenu', {
								bubbles: true,
								cancelable: true,
								view: window,
								button: 2,
								buttons: 2,
								clientX: coords.left + 10,
								clientY: coords.top + 10
							});
							editorEl.dispatchEvent(contextEvent);
							console.log('Dispatched contextmenu event at', coords.left, coords.top);
						}
					}, 50);
					return;
				}
				
				const range = selection.getRangeAt(0);
				const rect = range.getBoundingClientRect();
				
				// Try to access Electron's webFrame API through the current window
				try {
					// Try accessing through window.require (Electron's require)
					const electron = (window as any).require?.('electron');
					if (electron) {
						const webFrame = electron.webFrame || electron.remote?.webFrame || electron.getCurrentWebContents?.()?.webFrame;
						if (webFrame && typeof webFrame.isWordMisspelled === 'function') {
							console.log('Found webFrame API via electron.require');
							const isMisspelled = webFrame.isWordMisspelled(word);
							if (isMisspelled) {
								const suggestions = webFrame.getWordSuggestions(word);
								if (suggestions && suggestions.length > 0) {
									observer.disconnect();
									finish(suggestions[0]);
									return;
								}
							} else {
								observer.disconnect();
								finish(null);
								return;
							}
						}
					}
					
					// Try accessing through window.webFrame (might be exposed)
					const webFrame = (window as any).webFrame;
					if (webFrame && typeof webFrame.isWordMisspelled === 'function') {
						console.log('Found webFrame API via window.webFrame');
						const isMisspelled = webFrame.isWordMisspelled(word);
						if (isMisspelled) {
							const suggestions = webFrame.getWordSuggestions(word);
							if (suggestions && suggestions.length > 0) {
								observer.disconnect();
								finish(suggestions[0]);
								return;
							}
						} else {
							observer.disconnect();
							finish(null);
							return;
						}
					}
				} catch (err) {
					console.log('Could not access webFrame API:', err);
				}
				
				// Fallback: Try multiple methods to open context menu
				// Method 1: Obsidian's command
				const app = (window as any).app;
				if (app && app.commands) {
					console.log('Executing context menu command');
					try {
						app.commands.executeCommandById('editor:open-context-menu');
					} catch (err) {
						console.log('Context menu command error:', err);
					}
				}
				
				// Method 2: Keyboard shortcut (Shift+F10 or Context Menu key)
				setTimeout(() => {
					const keyEvent = new KeyboardEvent('keydown', {
						bubbles: true,
						cancelable: true,
						key: 'F10',
						code: 'F10',
						shiftKey: true,
						keyCode: 121
					});
					editorEl.dispatchEvent(keyEvent);
					console.log('Dispatched Shift+F10 key event');
				}, 10);
				
				// Method 3: Right-click mouse event
				setTimeout(() => {
					const contextEvent = new MouseEvent('contextmenu', {
						bubbles: true,
						cancelable: false, // Don't cancel - let it propagate
						view: window,
						button: 2,
						buttons: 2,
						clientX: rect.left + rect.width / 2,
						clientY: rect.top + rect.height / 2,
						screenX: rect.left + rect.width / 2,
						screenY: rect.top + rect.height / 2
					});
					
					// Dispatch on multiple elements to increase chances
					const container = range.commonAncestorContainer;
					if (container.nodeType === Node.TEXT_NODE && container.parentElement) {
						container.parentElement.dispatchEvent(contextEvent);
					} else if (container.nodeType === Node.ELEMENT_NODE) {
						(container as HTMLElement).dispatchEvent(contextEvent);
					}
					editorEl.dispatchEvent(contextEvent);
					console.log('Dispatched contextmenu event at', rect.left, rect.top);
				}, 50);
			});
		});
		
		// Check periodically if menu appears (faster than waiting for observer)
		let checkCount = 0;
		const checkInterval = setInterval(() => {
			if (resolved) {
				clearInterval(checkInterval);
				return;
			}
			
			checkCount++;
			const existingMenu = document.querySelector('.menu, .menu-container, [role="menu"]') as HTMLElement;
			if (existingMenu) {
				clearInterval(checkInterval);
				observer.disconnect();
				checkMenuForSuggestions(existingMenu, word, finish);
				return;
			}
			
			// Stop checking after 20 attempts (2 seconds)
			if (checkCount >= 20) {
				clearInterval(checkInterval);
				observer.disconnect();
				console.log('Timeout: menu did not appear after checks');
				finish(null);
			}
		}, 100); // Check every 100ms
		
		// Also keep the timeout as backup
		setTimeout(() => {
			if (!resolved) {
				clearInterval(checkInterval);
				observer.disconnect();
				console.log('Timeout: menu did not appear');
				finish(null);
			}
		}, 2500); // Backup timeout
	});
}

function checkMenuForSuggestions(
	menu: HTMLElement,
	word: string,
	resolve: (value: string | null) => void
) {
	console.log('Menu appeared, checking for suggestions');
	
	setTimeout(() => {
		// Try multiple selectors for menu items
		const menuItems = menu.querySelectorAll(
			'.menu-item, [role="menuitem"], .suggestion-item, button, a, li, .menu-item-content'
		);
		
		console.log('Found', menuItems.length, 'menu items');
		
		// Log all menu items for debugging
		const allTexts: string[] = [];
		for (const item of Array.from(menuItems)) {
			const text = item.textContent?.trim() || '';
			if (text) {
				allTexts.push(text);
				console.log('Menu item:', text, 'Classes:', item.className);
			}
		}
		console.log('All menu texts:', allTexts);
		
		let suggestion: string | null = null;
		
		for (const item of Array.from(menuItems)) {
			const text = item.textContent?.trim() || '';
			
			// Look for spellcheck suggestions - they're usually just words
			if (text && 
			    text !== word && 
			    !text.includes('Add to dictionary') &&
			    !text.includes('Ignore') &&
			    !text.includes('Cut') &&
			    !text.includes('Copy') &&
			    !text.includes('Paste') &&
			    !text.includes('Delete') &&
			    !text.includes('Select all') &&
			    !text.includes('Undo') &&
			    !text.includes('Redo') &&
			    !text.includes('Find') &&
			    !text.includes('Replace') &&
			    !text.includes('Format') &&
			    !text.includes('Bold') &&
			    !text.includes('Italic') &&
			    !text.includes('Link') &&
			    !text.includes('Heading') &&
			    !text.includes('List') &&
			    !text.includes('Checkbox') &&
			    /^[a-zA-Z]+$/.test(text) &&
			    text.length >= 2) {
				suggestion = text;
				console.log('Found suggestion:', suggestion);
				break;
			}
		}
		
		// Close the menu
		menu.style.display = 'none';
		menu.remove();
		
		console.log('Resolving with suggestion:', suggestion);
		resolve(suggestion);
	}, 100); // Wait for menu to render
}

function restoreCursor(editor: Editor, originalCursor: { line: number; ch: number }, originalSelection: { from: any; to: any } | null) {
	if (originalSelection) {
		editor.setSelection(originalSelection.from, originalSelection.to);
	} else {
		editor.setCursor(originalCursor);
		editor.setSelection(originalCursor, originalCursor);
	}
}
