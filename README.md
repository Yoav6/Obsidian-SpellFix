# Quick Spell Fix

Quickly fix spelling mistakes without interrupting your flow. Uses keyboard shortcuts to accept spellchecker suggestions without opening the context menu.

## Features

### Commands

- **Fix previous spelling** (`Alt+F`): Automatically finds and fixes the most recent misspelled word on the current line by accepting the first suggestion from the native spellchecker (if your cursor is in the middle of a word, it will check it as well).
- **Cycle suggestion** (`Alt+C`): After fixing a word, cycle through all available spelling suggestions to find the best match.
- **Restore original word** (`Alt+R`): Restore the original misspelled word if you changed your mind.
- **Add to ignored suggestions** (`Alt+X`): Add the current suggestion to your ignore list, remove it from the cycle list, and move to the next suggestion (or restore the original if no more suggestions are available).

### Settings

- **Ignore single letter suggestions** (on by default): Filters out single-character suggestions that are often incorrect, especially with non-Latin scripts.
  - **Single letter exceptions**: Specify single letters that should NOT be filtered (e.g., "I a" for English).
  
- **Suggestions to ignore**: Create a list of specific suggestions that should never be used (e.g., "ht Th").

- **Keep iterating when no valid suggestions are found** (off by default): When enabled, if a misspelled word has all suggestions filtered out, continue searching for other misspelled words on the line instead of stopping.

- **Autocorrect** (off by default): Automatically check and correct the last word when you press space. Uses the same filtering and settings as `Alt+F`.

## Workflow example

1. Type a misspelled word: "teh quick"
2. Press `Alt+F` → "teh" becomes "the"
3. Don't like it? Press `Alt+C` to see other suggestions
4. Still not right? Press `Alt+R` to restore "teh"
5. Want to prevent this suggestion? Press `Alt+X` to add it to your ignore list

With **Autocorrect** enabled, just type "teh " (with space) and it automatically becomes "the ", and then use Alt+C, Alt+R and Alt+X if you need, like in the example above. 

## How it works

The plugin scans backwards from your cursor position on the current line to find misspelled words. It uses the native browser/Electron 
spellchecker API to detect misspellings and get suggestions, then automatically replaces the word with the first valid suggestion.

**Important details:**
- Respects your Obsidian custom dictionary - words you've added won't be corrected
- Works only on the current line (respects line boundaries)
- If your cursor is in the middle of a word, it checks the complete word
- All settings and features apply to both manual correction (`Alt+F`) and autocorrect

## Language support

Should works with any language supported by your system's spellchecker. Tested with:
- English
- Hebrew

---

Made with ❤️ by [Yoav Ravid](https://x.com/YoavRavid)
