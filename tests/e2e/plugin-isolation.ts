import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ObsidianClient } from "obsidian-e2e";
import { createObsidianClient } from "obsidian-e2e";
import { pluginTestOptions } from "./setup";
import { resolveObsidianBin } from "./resolve-obsidian-bin";

const PLUGIN_ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));

export const PLUGIN_ISOLATION_STATE_PATH = resolve(
	PLUGIN_ROOT,
	".obsidian-e2e-artifacts/plugin-isolation.json"
);

/** Community plugins kept enabled during isolated E2E runs. */
export const DEFAULT_E2E_PLUGIN_WHITELIST = [
	"obsidian42-brat",
	"hot-reload",
	pluginTestOptions.pluginId,
] as const;

interface PluginIsolationState {
	disabledPluginIds: string[];
}

export function isPluginIsolationEnabled(): boolean {
	const skip = process.env.E2E_SKIP_PLUGIN_ISOLATION?.trim().toLowerCase();
	return !(skip === "1" || skip === "true" || skip === "yes");
}

export function getPluginWhitelist(pluginUnderTest: string = pluginTestOptions.pluginId): string[] {
	const extra =
		process.env.E2E_PLUGIN_WHITELIST?.split(",")
			.map((id) => id.trim())
			.filter(Boolean) ?? [];

	return [...new Set([...DEFAULT_E2E_PLUGIN_WHITELIST, pluginUnderTest, ...extra])];
}

/** Parse `plugins:enabled filter=community` CLI output. */
export function parseEnabledPluginIds(output: string): string[] {
	return output
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0 && /^[a-z0-9][a-z0-9_-]*$/.test(line));
}

export function pluginsToDisable(enabledPluginIds: string[], whitelist: string[]): string[] {
	const allowed = new Set(whitelist);
	return enabledPluginIds.filter((id) => !allowed.has(id));
}

export async function listEnabledCommunityPlugins(obsidian: ObsidianClient): Promise<string[]> {
	const output = await obsidian.execText("plugins:enabled", { filter: "community" });
	return parseEnabledPluginIds(output);
}

export async function disableCommunityPlugins(
	obsidian: ObsidianClient,
	pluginIds: string[]
): Promise<void> {
	for (const id of pluginIds) {
		await obsidian.plugin(id).disable({ filter: "community" });
	}
}

export async function enableCommunityPlugins(
	obsidian: ObsidianClient,
	pluginIds: string[]
): Promise<void> {
	for (const id of pluginIds) {
		await obsidian.plugin(id).enable({ filter: "community" });
	}
}

async function readIsolationState(): Promise<PluginIsolationState | null> {
	try {
		const raw = await readFile(PLUGIN_ISOLATION_STATE_PATH, "utf-8");
		return JSON.parse(raw) as PluginIsolationState;
	} catch {
		return null;
	}
}

async function writeIsolationState(state: PluginIsolationState): Promise<void> {
	await mkdir(dirname(PLUGIN_ISOLATION_STATE_PATH), { recursive: true });
	await writeFile(PLUGIN_ISOLATION_STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf-8");
}

async function clearIsolationState(): Promise<void> {
	try {
		await unlink(PLUGIN_ISOLATION_STATE_PATH);
	} catch {
		// already removed
	}
}

function createE2EClient(): ObsidianClient {
	return createObsidianClient({
		vault: pluginTestOptions.vault,
		bin: resolveObsidianBin(),
	});
}

export async function isolateCommunityPluginsForE2E(): Promise<string[]> {
	if (!isPluginIsolationEnabled()) {
		return [];
	}

	const obsidian = createE2EClient();
	await obsidian.verify();

	const whitelist = getPluginWhitelist();
	const enabled = await listEnabledCommunityPlugins(obsidian);
	const toDisable = pluginsToDisable(enabled, whitelist);

	if (toDisable.length === 0) {
		return [];
	}

	await disableCommunityPlugins(obsidian, toDisable);
	await writeIsolationState({ disabledPluginIds: toDisable });

	return toDisable;
}

export async function restoreCommunityPluginsFromE2E(): Promise<string[]> {
	const state = await readIsolationState();
	if (!state || state.disabledPluginIds.length === 0) {
		return [];
	}

	try {
		const obsidian = createE2EClient();
		await obsidian.verify();
		await enableCommunityPlugins(obsidian, state.disabledPluginIds);
		return state.disabledPluginIds;
	} finally {
		await clearIsolationState();
	}
}
