export function parseDictionaryFile(content: string): Set<string> {
	const words = content
		.split('\n')
		.map((w) => w.trim())
		.filter((w) => w.length > 0);
	return new Set(words);
}

export function getLinuxDictionaryPaths(homeDir: string): string[] {
	return [
		`${homeDir}/.var/app/md.obsidian.Obsidian/config/obsidian/Custom Dictionary.txt`,
		`${homeDir}/snap/obsidian/current/.config/obsidian/Custom Dictionary.txt`,
		`${homeDir}/.config/obsidian/Custom Dictionary.txt`,
	];
}

export function loadCustomDictionary(): Set<string> {
	const customDictionaryWords = new Set<string>();

	try {
		const fs = (window as { require?: (id: string) => unknown }).require?.('fs') as
			| {
					existsSync: (path: string) => boolean;
					readFileSync: (path: string, encoding: string) => string;
			  }
			| undefined;
		const path = (window as { require?: (id: string) => unknown }).require?.('path') as
			| { join: (...parts: string[]) => string }
			| undefined;
		const os = (window as { require?: (id: string) => unknown }).require?.('os') as
			| { homedir: () => string }
			| undefined;

		if (!fs || !path || !os) {
			return customDictionaryWords;
		}

		const homeDir = os.homedir();
		let dictPath: string | null = null;

		if (process.platform === 'win32') {
			const appData = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
			dictPath = path.join(appData, 'obsidian', 'Custom Dictionary.txt');
		} else if (process.platform === 'darwin') {
			dictPath = path.join(homeDir, 'Library', 'Application Support', 'obsidian', 'Custom Dictionary.txt');
		} else {
			for (const possiblePath of getLinuxDictionaryPaths(homeDir)) {
				try {
					if (fs.existsSync(possiblePath)) {
						return parseDictionaryFile(fs.readFileSync(possiblePath, 'utf8'));
					}
				} catch {
					continue;
				}
			}
			return customDictionaryWords;
		}

		if (dictPath) {
			try {
				if (fs.existsSync(dictPath)) {
					return parseDictionaryFile(fs.readFileSync(dictPath, 'utf8'));
				}
			} catch {
				// File doesn't exist or can't be read
			}
		}
	} catch {
		// Silently fail if dictionary cannot be loaded
	}

	return customDictionaryWords;
}
