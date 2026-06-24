import { afterEach, describe, expect, it } from "vitest";
import {
	getPluginWhitelist,
	isPluginIsolationEnabled,
	parseEnabledPluginIds,
	pluginsToDisable,
} from "../e2e/plugin-isolation";

describe("parseEnabledPluginIds", () => {
	it("ignores CLI noise and keeps plugin ids", () => {
		const output = [
			"Gtk-Message: 12:28:10.937: Failed to load module",
			"hot-reload",
			"spellfix",
			"obsidian42-brat",
		].join("\n");

		expect(parseEnabledPluginIds(output)).toEqual([
			"hot-reload",
			"spellfix",
			"obsidian42-brat",
		]);
	});
});

describe("pluginsToDisable", () => {
	it("disables every enabled plugin not on the whitelist", () => {
		const enabled = [
			"spellfix",
			"hot-reload",
			"obsidian42-brat",
			"copy-outline",
			"folder-notes",
		];
		const whitelist = ["spellfix", "hot-reload", "obsidian42-brat"];

		expect(pluginsToDisable(enabled, whitelist)).toEqual([
			"copy-outline",
			"folder-notes",
		]);
	});
});

describe("getPluginWhitelist", () => {
	it("always includes the plugin under test", () => {
		expect(getPluginWhitelist("my-plugin")).toContain("my-plugin");
		expect(getPluginWhitelist("my-plugin")).toContain("obsidian42-brat");
		expect(getPluginWhitelist("my-plugin")).toContain("hot-reload");
	});
});

describe("isPluginIsolationEnabled", () => {
	const original = process.env.E2E_SKIP_PLUGIN_ISOLATION;

	afterEach(() => {
		if (original === undefined) {
			delete process.env.E2E_SKIP_PLUGIN_ISOLATION;
		} else {
			process.env.E2E_SKIP_PLUGIN_ISOLATION = original;
		}
	});

	it("defaults to enabled", () => {
		delete process.env.E2E_SKIP_PLUGIN_ISOLATION;
		expect(isPluginIsolationEnabled()).toBe(true);
	});

	it("can be disabled with E2E_SKIP_PLUGIN_ISOLATION", () => {
		process.env.E2E_SKIP_PLUGIN_ISOLATION = "1";
		expect(isPluginIsolationEnabled()).toBe(false);
	});
});
