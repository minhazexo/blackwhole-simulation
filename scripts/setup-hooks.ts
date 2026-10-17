#!/usr/bin/env bun
/**
 * postinstall: install lefthook git hooks (lint, type-check, tests).
 *
 * Never fails the install. On machines where the lefthook binary cannot
 * execute (e.g. Windows Application Control / SmartScreen blocks the
 * unsigned exe), it warns and continues — hooks are a local convenience,
 * CI (.github/workflows) remains the enforcement point.
 *
 * Uses only node: APIs so `tsc --noEmit` stays green without extra types.
 */

import { spawnSync } from "node:child_process";

const bin = "node_modules/lefthook/bin/index.js";
const result = spawnSync(process.execPath, [bin, "install"], {
  stdio: "inherit",
});

if (result.status === 0) {
  console.log("lefthook: git hooks installed");
} else {
  console.warn(
    "lefthook: skipped (binary blocked or unavailable on this machine). " +
      "Installs still succeed; CI enforces the same checks. " +
      "To retry manually: bunx lefthook install",
  );
}
