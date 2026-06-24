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
| `npm run test:unit:file -- <path>` | one unit test file (or `-t "name"` to match tests) |
| `npm run test:unit:watch` | unit tests in watch mode; pass a file after `--` to scope |
| `npm run test:e2e` | E2E tests with other community plugins disabled (Obsidian must be running) |
| `npm run test:e2e:file -- <path>` | one E2E file (or add `-t "name"` after `--`) |
| `npm run test:e2e:all-plugins` | E2E with all community plugins left enabled (conflict check before release) |
| `npm run test:all` | check + isolated E2E |
| `npm run test:release` | check + E2E with all plugins enabled |

## Environment variables

- `OBSIDIAN_VAULT` — defaults to `Plugin Development Vault`
- `OBSIDIAN_BIN` — path to obsidian CLI if not on PATH (e.g. Flatpak install)
- `E2E_NOTICE_PLUGIN_NAME` — label for the E2E completion notice (defaults to `SpellFix`)
- `E2E_SKIP_PLUGIN_ISOLATION` — set to `1` to leave all community plugins enabled during E2E (`test:e2e:all-plugins`)
- `E2E_PLUGIN_WHITELIST` — comma-separated plugin ids to keep enabled during isolated E2E (in addition to BRAT, Hot Reload, and SpellFix)

On **Flatpak** installs, `~/.local/bin/obsidian` is often a broken symlink. E2E auto-detects Flatpak and uses `scripts/obsidian-e2e.sh` as a wrapper. Override with `OBSIDIAN_BIN` if needed.

## E2E notes

- E2E runs via **vite-plus** (`vp test`), not plain `vitest run`.
- `createPluginTest()` must be called in each `tests/e2e/*.test.ts` file (vitest suite context). Shared options live in `tests/e2e/setup.ts`.
- On Linux, if E2E fails with a missing native binding, run: `npm install -D @voidzero-dev/vite-plus-linux-x64-gnu@0.1.24`
- When E2E finishes, Obsidian shows a notice with pass/fail counts (via `e2e-notice-reporter.ts`). Set `E2E_NOTICE_PLUGIN_NAME` to customize the label (defaults to `SpellFix`).
- **Plugin isolation (default):** before E2E, all community plugins except BRAT, Hot Reload, and SpellFix are disabled; they are re-enabled when the run ends (even on failure). Use `npm run test:e2e:all-plugins` or `E2E_SKIP_PLUGIN_ISOLATION=1` to test with your full plugin stack.

## What runs automatically

- **Pre-push hook:** `npm run check`
- **GitHub CI:** `npm run check` on push/PR to main

## What runs manually

- `npm run test:e2e` — before releases, with Obsidian open
- `npm run test:all` — full validation

## Dev workflow

- Plugin lives at `.obsidian/plugins/SpellFix/` inside Plugin Development Vault
- Run `npm run build` (or `npm run dev`) before E2E so Obsidian loads the latest `main.js`
- E2E tests reset plugin settings to defaults before each test (your local `data.json` is not used during E2E)

### Running a single test

During development, run only the tests for the feature you changed instead of the full suite.

**Typical agent loop:**

1. Change logic in `src/utils/` → run the matching unit file
2. Change a command or setting → run the matching E2E file (Obsidian open, `npm run build` first)
3. Before commit → `npm run check`
4. Before release → `npm run test:release`

**Unit — one file:**

```bash
npm run test:unit:file -- tests/unit/spelling-rules.test.ts
```

**Unit — match test names** (substring regex):

```bash
npm run test:unit:file -- -t "plural"
npm run test:unit:file -- tests/unit/code-detection.test.ts -t "fenced"
```

**Unit — watch while editing:**

```bash
npm run test:unit:watch -- tests/unit/suggestion-filter.test.ts
```

**E2E — one file:**

```bash
npm run test:e2e:file -- tests/e2e/autocorrect.test.ts
npm run test:e2e:file -- tests/e2e/commands.test.ts
```

**E2E — one test by name:**

```bash
npm run test:e2e:file -- tests/e2e/commands.test.ts -t "fix previous spelling"
npm run test:e2e:file -- -t "skipCodeBlocks on"
```

Plugin isolation and the completion notice still run for partial E2E invocations (global setup/teardown applies to any `test:e2e:*` run).

**Feature → test file quick reference:**

| Feature | Unit file | E2E file |
|---------|-----------|----------|
| Spelling rules (plural, caps, short words) | `tests/unit/spelling-rules.test.ts` | — |
| Suggestion filter / ignore / prioritize | `tests/unit/suggestion-filter.test.ts` | — |
| Code / math skip regions | `tests/unit/code-detection.test.ts` | `tests/e2e/settings.test.ts` |
| Word extraction | `tests/unit/word-extraction.test.ts` | — |
| Dictionary parsing | `tests/unit/dictionary.test.ts` | — |
| Fix / cycle / restore / ignore commands | — | `tests/e2e/commands.test.ts` |
| Autocorrect on space | — | `tests/e2e/autocorrect.test.ts` |
| Settings persistence / toggle | — | `tests/e2e/settings.test.ts` |
| Plugin load / command registration | — | `tests/e2e/smoke.test.ts` |

## Feature coverage map

| Feature | Unit | E2E |
|---------|------|-----|
| Suggestion filtering | yes | — |
| Code/math skipping | yes | yes |
| Fix previous spelling | — | yes |
| Cycle / restore / ignore | — | yes |
| Autocorrect on space | — | yes |
| Settings persistence | — | yes |
| Custom dictionary loading | partial (parse only) | — |
| Native spellchecker API | — | yes (implicit) |

## E2E helpers

- `tests/e2e/reset-settings.ts` — resets live plugin settings via Obsidian eval (required because plugin folder is `SpellFix` but id is `spellfix`)
- `tests/e2e/helpers.ts` — note opening, autocorrect trigger, settings reads
- `tests/e2e/e2e-notice-reporter.ts` — shows an Obsidian notice when E2E finishes
- `tests/e2e/show-e2e-notice.ts` — CLI helper used by the reporter
- `tests/e2e/plugin-isolation.ts` — disables non-whitelisted community plugins before E2E and restores them after
- `tests/e2e/global-setup.ts` — vitest global setup/teardown for plugin isolation
