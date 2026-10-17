# Scripts

One-off operator and CI scripts (Bun + TypeScript, unless noted). Run from
the repo root with `bun scripts/<name>.ts`.

| Script               | Command                                   | Purpose                                                              |
| -------------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| `seo-provenance.ts`  | `bun run seo:check`                       | Fails if any JSON-LD object in `src/seo/structured-data.ts` lacks a `// SOURCE:` provenance comment |
| `indexnow-ping.ts`   | `bun run seo:ping` (also in vercel-build) | Notifies Bing + Yandex (IndexNow) about sitemap changes after deploy |
| `update-goldens.ts`  | `bun run shader:update-goldens`           | Re-captures visual-regression golden PNGs via Playwright (`--confirm` required) |
| `vercel-build.sh`    | `bun run build:vercel`                    | Production build: installs Rust, builds the WASM engine, `next build`, IndexNow ping |
| `lint-commit.ts`     | (lefthook `commit-msg` hook)              | Enforces Conventional Commits on commit messages                     |
| `setup-hooks.ts`     | (npm `postinstall`)                       | Installs lefthook git hooks; warns and continues if the binary is blocked |
| `one-shot/convert_exr.py` | manual                               | One-shot EXR → texture conversion (archived utility, not in CI)      |

Unit tests for scripts live in `scripts/__tests__/` and run inside the
default `bun run test` suite.
