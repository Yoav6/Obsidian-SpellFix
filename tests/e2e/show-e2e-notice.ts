import { createObsidianClient } from "obsidian-e2e";
import { resolveObsidianBin } from "./resolve-obsidian-bin";

const DEFAULT_PLUGIN_NAME = "SpellFix";

export async function showE2ENotice(message: string, durationMs = 10_000): Promise<void> {
	try {
		const obsidian = createObsidianClient({
			vault: process.env.OBSIDIAN_VAULT ?? "Plugin Development Vault",
			bin: resolveObsidianBin(),
		});
		await obsidian.verify();
		await obsidian.dev.eval(`new Notice(${JSON.stringify(message)}, ${durationMs});`);
	} catch {
		// Obsidian not running or CLI unavailable — fail silently
	}
}

export function formatE2ENoticeMessage(
	passed: number,
	failed: number,
	reason: "passed" | "failed" | "interrupted"
): string {
	const pluginName = process.env.E2E_NOTICE_PLUGIN_NAME ?? DEFAULT_PLUGIN_NAME;

	if (reason === "interrupted") {
		return `${pluginName} E2E interrupted (${passed} passed, ${failed} failed)`;
	}

	if (failed > 0) {
		return `${pluginName} E2E failed: ${failed} failed, ${passed} passed`;
	}

	return `${pluginName} E2E passed: ${passed} tests`;
}
