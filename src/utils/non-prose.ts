export interface TextRange {
	start: number;
	end: number;
}

// Each pattern covers text that must keep its exact spelling for the note to work.
const NON_PROSE_PATTERNS = [
	/\[\[[^\]]*(?:\]\]|$)/g, // wikilinks and embeds, including ones still being typed
	/\]\([^)]*(?:\)|$)/g, // Markdown link targets
	/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, // URLs with a scheme
	/\bwww\.\S+/gi, // URLs without a scheme
	/[^\s@]+@[^\s@]+\.[^\s@]+/g, // email addresses
	/(?:^|(?<=\s))#[^\s#]+/g, // tags (a heading's `#` is followed by a space)
	/\[[!^][^\]]*\]/g, // callout types and footnote references
	/(?:^|(?<=\s))\^[\w-]+/g, // block references
];

export function findNonProseRanges(lineText: string): TextRange[] {
	const ranges: TextRange[] = [];
	for (const pattern of NON_PROSE_PATTERNS) {
		for (const match of lineText.matchAll(pattern)) {
			ranges.push({ start: match.index, end: match.index + match[0].length });
		}
	}
	return ranges;
}

export function isInsideNonProse(lineText: string, wordStart: number, wordEnd: number): boolean {
	return findNonProseRanges(lineText).some(
		(range) => wordStart >= range.start && wordEnd <= range.end
	);
}

/** Only a closed block counts, so a `---` divider on the first line is not frontmatter. */
export function isInsideFrontmatterFromLines(
	getLine: (line: number) => string,
	lineCount: number,
	line: number
): boolean {
	if (lineCount === 0 || getLine(0).trimEnd() !== '---') {
		return false;
	}
	for (let i = 1; i < lineCount; i++) {
		if (getLine(i).trimEnd() === '---') {
			return line <= i;
		}
	}
	return false;
}
