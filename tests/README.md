# Test Layout

Three tiers, three homes:

| Tier                         | Location                          | Runner                              |
| ---------------------------- | --------------------------------- | ----------------------------------- |
| Unit + integration (TS)      | `src/__tests__/`                  | `bun run test` (vitest)             |
| Physics regression (Rust)    | `physics-engine/*/tests/`         | `bun run physics:regress` (cargo)   |
| Visual / shader regression   | `tests/visual-regression/` + `tests/golden/` | `bun run shader:check` (vitest, separate config — boots a dev server, never runs in the default suite) |

Script unit tests live next to their scripts in `scripts/__tests__/`
and are included in `bun run test`.
