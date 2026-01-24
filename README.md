# Quick Spell Fix

Adds keyboard shortcuts to quickly accept spellchecker suggestions without using the context menu.

## Features

- **Fix previous spelling** (`Alt+F`): Automatically finds and fixes the most recent misspelled word before your cursor by accepting the first suggestion from the native spellchecker.
- **Cycle suggestion** (`Alt+C`): After fixing a word, cycle through all available spelling suggestions to find the best match.
- **Restore original word** (`Alt+R`): Restore the original misspelled word if you changed your mind.

## How it works

The plugin scans backwards from your cursor position to find the first misspelled word in the current paragraph. It detects words with spellcheck errors (red underlines) and uses the native browser/Electron spellchecker API to get suggestions, then automatically replaces the word with the first suggestion.

**Important**: The plugin respects your Obsidian custom dictionary. Words you've added to your dictionary won't be corrected.

After fixing a word, you can:
- Press `Alt+C` to cycle through other suggestions
- Press `Alt+R` to restore the original word

Made with ❤️ by [Yoav Ravid](https://x.com/YoavRavid)
