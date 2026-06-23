# Testing SpellFix

## Prerequisites

- Obsidian 1.12+ with CLI enabled (Settings → General → Enable CLI)
- `obsidian` CLI on PATH
- **Plugin Development Vault** open in Obsidian
- Plugin built: `npm run build`
- English spellchecker enabled for E2E tests

## Commands

| Command | What it runs |
|---------|--------------|
| `npm run check` | build + lint + unit tests |
| `npm run test:unit` | unit tests only |
| `npm run test:e2e` | E2E tests (Obsidian must be running) |
| `npm run test:all` | check + E2E |

## Environment variables

- `OBSIDIAN_VAULT` — defaults to `Plugin Development Vault`
- `OBSIDIAN_BIN` — path to obsidian CLI if not on PATH (e.g. Flatpak install)

On **Flatpak** installs, `~/.local/bin/obsidian` is often a broken symlink. E2E auto-detects Flatpak and uses `scripts/obsidian-e2e.sh` as a wrapper. Override with `OBSIDIAN_BIN` if needed.

## E2E notes

- E2E runs via **vite-plus** (`vp test`), not plain `vitest run`.
- `createPluginTest()` must be called in each `tests/e2e/*.test.ts` file (vitest suite context). Shared options live in `tests/e2e/setup.ts`.
- On Linux, if E2E fails with a missing native binding, run: `npm install -D @voidzero-dev/vite-plus-linux-x64-gnu@0.1.24`

## What runs automatically

- **Pre-push hook:** `npm run check`
- **GitHub CI:** `npm run check` on push/PR to main

## What runs manually

- `npm run test:e2e` — before releases, with Obsidian open
- `npm run test:all` — full validation

## Folder conventions

- `tests/unit/` — pure logic tests (no Obsidian API)
- `tests/e2e/` — live Obsidian tests via obsidian-e2e
- `src/utils/` — testable pure functions (added in SpellFix-specific plan)
