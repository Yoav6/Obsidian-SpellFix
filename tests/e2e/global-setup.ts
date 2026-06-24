import {
	isolateCommunityPluginsForE2E,
	restoreCommunityPluginsFromE2E,
} from "./plugin-isolation";

export async function setup(): Promise<void> {
	await isolateCommunityPluginsForE2E();
}

export async function teardown(): Promise<void> {
	await restoreCommunityPluginsFromE2E();
}
