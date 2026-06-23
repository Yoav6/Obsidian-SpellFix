import { resolveObsidianBin } from "./resolve-obsidian-bin";

export const pluginTestOptions = {
	vault: process.env.OBSIDIAN_VAULT ?? "Plugin Development Vault",
	pluginId: "spellfix",
	bin: resolveObsidianBin(),
	sharedVaultLock: true,
	sandboxRoot: "__obsidian_e2e__",
	timeoutMs: 15_000,
} as const;
