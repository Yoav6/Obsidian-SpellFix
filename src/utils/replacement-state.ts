export interface ReplacementPosition {
	line: number;
	ch: number;
	endCh: number;
}

/** False once the note was edited so that the stored range no longer holds the replacement. */
export function isReplacementInPlace(
	lineText: string,
	position: ReplacementPosition,
	expectedText: string
): boolean {
	return lineText.slice(position.ch, position.endCh) === expectedText;
}
