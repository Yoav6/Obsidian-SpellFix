import { accessSync, constants, existsSync, readlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { homedir } from "node:os";

function isExecutable(path: string): boolean {
	try {
		let current = resolve(path);
		const seen = new Set<string>();

		while (!seen.has(current)) {
			seen.add(current);
			if (!existsSync(current)) {
				return false;
			}

			let link: string;
			try {
				link = readlinkSync(current);
			} catch {
				break;
			}
			current = resolve(dirname(current), link);
		}

		accessSync(current, constants.X_OK);
		return true;
	} catch {
		return false;
	}
}

function findOnPath(): string | undefined {
	try {
		const candidate = execSync("command -v obsidian", {
			encoding: "utf-8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
		if (candidate && isExecutable(candidate)) {
			return candidate;
		}
	} catch {
		// not on PATH
	}
	return undefined;
}

function findFlatpakWrapper(): string | undefined {
	const flatpakApp = join(
		homedir(),
		".local/share/flatpak/app/md.obsidian.Obsidian",
	);
	if (!existsSync(flatpakApp)) {
		return undefined;
	}

	const wrapper = resolve(
		fileURLToPath(new URL("../..", import.meta.url)),
		"scripts/obsidian-e2e.sh",
	);
	return isExecutable(wrapper) ? wrapper : undefined;
}

/** Resolve Obsidian CLI for obsidian-e2e (handles broken Flatpak PATH symlinks). */
export function resolveObsidianBin(): string {
	if (process.env.OBSIDIAN_BIN) {
		return process.env.OBSIDIAN_BIN;
	}

	return findOnPath() ?? findFlatpakWrapper() ?? "obsidian";
}
