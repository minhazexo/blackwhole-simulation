<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.
<!-- END:nextjs-agent-rules -->

# Repository Agent Guidelines

These instructions apply to the entire `blackwhole-simulation` repository. Follow any more-specific `AGENTS.md` instructions found in subdirectories as well. When instructions appear to conflict, preserve the established architecture and verify behavior in the source code before making assumptions.

## 1. Project Purpose and Engineering Priorities

This repository contains an interactive black-hole simulation built around a Next.js/React application, a TypeScript rendering and orchestration layer, GPU shaders, and a Rust/WASM physics engine.

Priorities, in order:

1. Preserve existing simulation behavior and application functionality.
2. Keep the physics, WebAssembly interface, renderer, shaders, and UI responsibilities separated.
3. Make the smallest targeted change that solves the reported problem.
4. Validate correctness, rendering quality, performance, and compatibility using the checks relevant to the change.
5. Keep documentation and tests consistent with the implementation; do not claim scientific accuracy or performance characteristics that have not been verified.

**Source of truth:** inspect `package.json`, `bun.lock`, Rust manifests, imported source files, and tests. The README may lag behind the current dependency versions or implementation. Do not infer an API from a README claim alone.

## 2. Repository Map

Use the existing structure; do not introduce new architectural layers without a concrete reason.

- `src/app/` — Next.js App Router routes and page-level composition.
- `src/components/` — reusable React UI and rendering components.
- `src/config/` — defaults and simulation/configuration values.
- `src/engine/` — engine integration and WASM/data-bridge code.
- `src/hooks/` — reusable React hooks and stateful UI behavior.
- `src/rendering/` — render orchestration and WebGL/WebGPU paths.
- `src/shaders/` — GPU shader source; follow the actual import chain to identify the active shader.
- `src/workers/` — worker-side processing and off-main-thread orchestration.
- `physics-engine/gravitas-core/` — Rust physics/core implementation.
- `physics-engine/gravitas-wasm/` — Rust-to-WASM interface and build target.
- `public/` — static assets and generated browser-facing WASM output.
- `tests/` — integration, browser, and visual-regression tests where configured.
- `scripts/` — project automation, build helpers, validation, and maintenance scripts.
- `docs/` — architecture, mathematical foundations, engineering decisions, and performance notes.

Before editing, inspect the relevant implementation and its callers. A folder name or architecture document is a navigation aid, not proof that a feature is complete or that a file is active at runtime.

## 3. Runtime and Package Tooling

Use the package manager pinned by the repository: **Bun**. `package.json` declares Bun `>=1.4.3` and Node `>=20`; use a compatible runtime.

Install dependencies:

```bash
bun install
```

Common commands defined by `package.json`:

```bash
bun run dev            # Build the WASM package, then start Next.js with webpack
bun run dev:watch      # Watch/rebuild WASM while running the development server
bun run build          # Build WASM, then create the production Next.js build
bun run build:wasm     # Build the Rust/WASM package into public/wasm
bun run start          # Start the built Next.js application
bun run lint           # Run ESLint
bun run type-check     # Run TypeScript without emitting files
bun run test           # Run the default Vitest suite
bun run shader:check   # Run the dedicated shader/visual-regression suite
bun run physics:regress # Run the configured Rust physics regression suites
bun run seo:check      # Validate the configured SEO structured-data source
```

Builds involving WASM require the Rust toolchain and `wasm-pack`. Follow the actual scripts and manifests if a command fails; report missing tools or environment constraints precisely. Do not report a check as passed unless it completed successfully.

### Test scope

- `bun run test` runs the default Vitest suite. The visual-regression suite is configured separately and is not covered by this command.
- `bun run shader:check` is a more expensive, opt-in check that may start a development server and drive Playwright. Run it for shader/rendering changes when the environment supports it.
- `bun run physics:regress` runs the specific regression targets declared in `package.json`; run the closest relevant Rust tests as well when changing physics code.
- `bun run build` is the production integration check and requires the WASM build prerequisites.

Run the narrowest relevant checks during iteration, then the broader checks appropriate to the risk of the change. If a required check cannot run, explain why and identify what remains unverified.

**Formatting caution:** `bun run format` writes across broad JavaScript, TypeScript, CSS, Markdown, and JSON globs. Do not run it for a small task unless whole-repository formatting was explicitly requested. Format or check only the files you changed.

## 4. Architecture Boundaries

Keep each layer responsible for its own work:

- **React/Next.js and TypeScript:** application lifecycle, user interactions, configuration/state orchestration, and dispatching work to the engine/renderer.
- **Rust/WASM:** numerical and physics routines that belong to the physics kernel.
- **GPU shaders and rendering code:** per-pixel/per-ray computation, disk/radiance appearance, and graphics-specific effects.
- **Workers and shared data interfaces:** communication and scheduling between execution layers.

Before changing a behavior, trace the path from its UI/configuration input through state, renderer uniforms or worker messages, and finally to the implementation that consumes it.

When changing a value or protocol that crosses TypeScript, Rust/WASM, workers, or GPU boundaries:

- Update every producer and consumer consistently.
- Preserve documented binary layouts, alignment, offsets, types, and synchronization rules unless a deliberate protocol migration is required.
- Add or update tests for the boundary and failure modes.
- Update the relevant documentation if the protocol or public configuration changes.

Do not duplicate physics calculations in multiple layers just to make a visual or state change easier. Do not silently change physics constants, coordinate conventions, units, integrator behavior, or shared-buffer layouts as a side effect of a rendering task.

## 5. Rendering and Shader Rules

Rendering changes are performance-sensitive. Follow the real import and runtime path to identify the shader or renderer that is active; do not assume a particular filename, backend, or uniform is authoritative without checking it.

- Keep WebGL and WebGPU implementations consistent where both implement the same supported feature, but do not expand the scope into an unrelated backend without need.
- Keep shader declarations, uniform bindings, texture units, CPU-side values, and TypeScript types in sync.
- Preserve shader compilation, quality-tier behavior, resizing, animation, resource cleanup, and fallback paths.
- Avoid unnecessary per-frame allocations, extra GPU passes, expensive CPU-side image processing, and unbounded loops in shader code.
- Handle edge cases such as zero-length vectors, invalid normalization, singular/near-horizon values, and non-finite intermediate results defensively where appropriate.
- Do not hide a rendering defect by disabling the underlying simulation, ray marching, lensing, temporal anti-aliasing, or other core effects unless the request explicitly calls for that trade-off.
- Use the dedicated shader tests and visual-regression checks for shader changes when available. Update visual goldens only when the visual change is intentional and has been reviewed; never update goldens merely to silence a failing test.

### Scoped visual tasks

When the task requests a specific visual change—such as adjusting only the accretion disk—preserve all unrelated scene elements by default. Do not change page layout, UI/HUD, starfield, background, global camera framing, controls, or unrelated post-processing to compensate for a local rendering issue.

For the accretion-disk reference task, use the exact supplied target and current-scene assets when present:

- `public/Disk Data/Blackwhole.jpg` — target appearance.
- `public/Disk Data/Present Disk 10000kelvin.png` — current appearance.

Inspect both images and trace the active shader before choosing parameters. Prefer a disk-local coordinate or emission/density adjustment over a global camera rotation when the latter would also rotate the background. Do not use the target image as a static overlay, CSS background, or replacement for live rendering. Preserve real-time interaction and lensing. Capture before/after screenshots at the same viewport, camera, quality setting, and state when the environment allows.

## 6. TypeScript, React, and Next.js

- Read the installed Next.js documentation under `node_modules/next/dist/docs/` before relying on framework APIs, conventions, or deprecated behavior. The package version and installed docs take precedence over prior assumptions.
- Follow the repository's current TypeScript, ESLint, and formatting conventions. Prefer explicit, useful types over `any` or unsafe casts.
- Keep components focused; separate rendering/physics orchestration from presentation where the existing architecture does so.
- Clean up animation frames, event listeners, workers, observers, timers, WebGL resources, and other external resources when their owning component or engine is disposed.
- Avoid stale React closures, duplicate render loops, repeated expensive initialization, and state updates that cause unnecessary per-frame React rendering.
- Preserve accessibility, keyboard behavior, responsive sizing, and existing loading/error/fallback UI.
- Do not add a dependency for a small utility when the existing stack already provides a suitable solution.

## 7. Rust and WASM

- Inspect the relevant `Cargo.toml` files before selecting Cargo commands or assuming workspace membership.
- Keep Rust APIs and WASM exports aligned with their TypeScript callers.
- Preserve numerical units, precision assumptions, coordinate conventions, and error handling.
- For numerical changes, test normal values and important boundary cases, including degenerate inputs and high-spin/near-horizon conditions where relevant.
- Treat generated files under `public/wasm/` as build output. Modify Rust source and the build pipeline instead of hand-editing generated JS/WASM artifacts, unless the task explicitly concerns a generated artifact and its generation process.
- Do not describe an approximate visualization as physically exact unless the mathematical implementation and validation support that claim.

## 8. Assets, Configuration, and Generated Files

- Reuse existing assets and configuration mechanisms before introducing new ones.
- Keep defaults centralized and typed where the project already supports that pattern.
- Preserve filenames with spaces and case exactly as they exist on disk; quote paths in shell commands when needed.
- Do not commit local environment files, credentials, API keys, personal data, build outputs, screenshots, or debugging dumps unless explicitly required and safe to publish.
- Do not edit lockfiles manually. Let Bun update `bun.lock` when a justified dependency change is made.
- Avoid changing `next.config.mjs`, `vercel.json`, build scripts, deployment settings, or cross-origin isolation headers for a task that does not require it.

## 9. Working Method for Coding Agents

For each task:

1. **Inspect:** read the relevant instructions, `package.json`, nearby source, active imports, related tests, and documentation.
2. **Define scope:** identify the smallest set of files and layers that can solve the request. Note what must remain unchanged.
3. **Implement:** make the minimal coherent change; avoid speculative refactors or unrelated cleanup.
4. **Validate:** run formatting/lint/type checks and the relevant unit, shader, physics, or production-build checks. Inspect the diff for unintended changes.
5. **Report:** summarize what changed, why, which checks passed, which checks could not run, and any remaining risks.

Additional rules:

- Do not stop at recommendations or pseudocode when the task asks for implementation and the tools permit editing.
- Do not claim visual success based only on code compilation; inspect an actual render when feasible.
- Do not claim tests, screenshots, builds, or repository changes were completed unless they actually were.
- Do not revert or overwrite pre-existing user changes. Inspect `git status` and the diff before editing or cleaning up.
- Do not create commits, push branches, publish releases, or alter remote settings unless explicitly requested.
- Keep comments focused on non-obvious decisions rather than narrating straightforward code.
- Update tests and docs when behavior, configuration, or contracts change.

## 10. Definition of Done

A change is ready to report complete when:

- The requested behavior is implemented in the correct layer.
- Unrelated behavior and files remain unchanged.
- Relevant tests/checks have run, with failures and environmental blockers reported honestly.
- Shader or visual changes have been visually checked when feasible.
- The final diff contains no accidental generated files, debug code, broad formatting churn, or unrelated refactors.
- The completion summary states the changed files, key decisions, validation results, and known limitations.
