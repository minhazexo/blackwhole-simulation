# Codebase Improvement Plan — Black Hole Simulation

> **Generated**: July 17, 2026  
> **Scope**: Full import-graph trace of every `.ts`/`.tsx` file in `src/`, `physics-engine/`, `scripts/`, `tests/`  
> **Methodology**: Systematic grep-based export→import chain analysis for every symbol in the codebase

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Dead Code — Files to Delete](#2-dead-code--files-to-delete)
3. [Dead Code — Exports to Clean Up](#3-dead-code--exports-to-clean-up)
4. [Duplicated Physics Constants](#4-duplicated-physics-constants)
5. [Magic Numbers & Hardcoded Values](#5-magic-numbers--hardcoded-values)
6. [Type Safety Issues](#6-type-safety-issues)
7. [Import Inconsistencies](#7-import-inconsistencies)
8. [Broken Imports / Runtime Failures](#8-broken-imports--runtime-failures)
9. [Per-Frame Allocation Hotspots](#9-per-frame-allocation-hotspots)
10. [Missing JSDoc](#10-missing-jsdoc)
11. [Testing Gaps](#11-testing-gaps)
12. [CI/CD & Build](#12-cicd--build)
13. [Accessibility & Security](#13-accessibility--security)
14. [Architecture & State Management](#14-architecture--state-management)
15. [Priority-Ordered Action Items](#15-priority-ordered-action-items)
16. [File-by-File Dead Code Audit](#16-file-by-file-dead-code-audit)

---

## 1. Executive Summary

This project is a sophisticated real-time Kerr black hole ray-marching engine. The core architecture (Rust WASM kernel, WebGL 2.0 renderer, SharedArrayBuffer protocol) is sound. However, the codebase has accumulated **dead code, duplicated constants, scattered magic numbers, and type-safety gaps** that reduce maintainability and professional polish.

**Key metrics:**
- **16 files** are completely dead (never imported by production code)
- **~2,200 lines** of dead code across those files
- **~6 dead exports** in otherwise-live files
- **3 broken imports** that will fail at runtime (`import("blackhole-physics")`)
- **30+ `any` type usages** with eslint-suppression
- **2 files** duplicating SI constants that should use the canonical source

---

## 2. Dead Code — Files to Delete

These files exist but **nothing in production imports them**. They are:

| # | File | Lines | Notes |
|---|------|-------|-------|
| 1 | `src/hooks/useWebGL.ts` | 366 | Replaced by `WebGLRenderer` class; `WebGLCanvas.tsx` uses `WebGLRenderer` directly |
| 2 | `src/hooks/useScreenshot.ts` | 43 | Screenshot capability never wired into UI |
| 3 | `src/hooks/useSimulationMode.ts` | 69 | Simulation mode state machine — only imported in test file |
| 4 | `src/hooks/useReducedMotion.ts` | 18 | Accessibility hook for `prefers-reduced-motion` — only imported in test file |
| 5 | `src/performance/validation.ts` | 530 | Full `PerformanceValidator` class with feature cost analysis — never instantiated |
| 6 | `src/performance/gpu-timer.ts` | ~40 | GPU timing utility — never imported |
| 7 | `src/physics/kerr-metric.ts` | 43 | Kerr metric JS calculations — superseded by WASM Rust kernel |
| 8 | `src/rendering/spectral.ts` | 83 | `SpectralManager` — marked `@deprecated`, never wired into pipeline |
| 9 | `src/rendering/resource-pool.ts` | 135 | `GPUResourcePool` — never imported by any renderer |
| 10 | `src/rendering/shader-cache.ts` | 45 | `compileWithFallback` — not used by any render pipeline |
| 11 | `src/components/fallback/StaticFallback.tsx` | 43 | Fallback component for no-WebGL — never imported by any component |
| 12 | `src/components/spacetime/EmbeddingDiagram.tsx` | ~100 | Embedding diagram — not in barrel `index.ts`, not imported anywhere |
| 13 | `src/shaders/compute.wgsl.ts` | ~200 | WGSL compute shader — never loaded by `WebGPURenderer` |
| 14 | `src/shaders/postprocess/ataa.wgsl.ts` | ~150 | ATAA anti-aliasing shader — never loaded |
| 15 | `src/shaders/types.wgsl.ts` | ~50 | WGSL type definitions — never imported |
| 16 | `src/shaders/blackhole/raymarching.wgsl.ts` | ~250 | WGSL raymarching kernel — never loaded (WebGPU renderer uses `compute.wgsl.ts` but even that is unloaded) |
| | **Total dead** | **~2,200** | |

**Also delete dead Rust code:**
| # | Path | Lines | Notes |
|---|------|-------|-------|
| 17 | `physics-engine/_legacy_src/` | ~1,200 | Not referenced by any `mod.rs` or `Cargo.toml` |

### Which files have ONLY test-file imports?

These are **effectively dead** in production — only their test files import them:
- `useReducedMotion.ts` — only imported by `useReducedMotion.test.ts`
- `useSimulationMode.ts` — only imported by `useSimulationMode.test.ts`

### Impact assessment before deleting:

| File | Risk if deleted | Mitigation |
|------|----------------|------------|
| `useWebGL.ts` | **None** — `WebGLRenderer` class is the actual renderer | Already fully replaced |
| `useScreenshot.ts` | **Low** — screenshot feature could be wanted later | Export as `git archive` branch |
| `useSimulationMode.ts` | **Low** — cinematic mode logic lives in `useCamera.ts` now | Already superseded by `useCamera.ts` tour system |
| `useReducedMotion.ts` | **Low** — good practice hook but not wired anywhere | Could be re-added when needed |
| `validation.ts` | **None** — unused framework | Delete |
| `gpu-timer.ts` | **None** | Delete |
| `kerr-metric.ts` | **None** — WASM provides these values | Delete |
| `spectral.ts` | **None** — marked deprecated | Delete |
| `resource-pool.ts` | **None** — never integrated | Delete |
| `shader-cache.ts` | **None** — WebGPU uses inline fallback in `WebGPURenderer` | Delete |
| `StaticFallback.tsx` | **Low** — would show "unsupported" message | But `CompatibilityHUD` already handles this path |
| `EmbeddingDiagram.tsx` | **None** — not in barrel export | Delete |
| `_legacy_src/` | **None** — not compiled | Delete |
| WGSL shader files | **Medium** — WebGPU is alpha/incomplete | Keep if WebGPU roadmap is active, delete if not |

---

## 3. Dead Code — Exports to Clean Up

These exports **exist in live files** but are **never imported by any other production file**:

| File | Dead Export | Type |
|------|-------------|------|
| `src/configs/simulation.config.ts` | `ParameterConfig` | Interface — only used internally |
| | `SimulationParameterKey` | Type — only used internally |
| `src/configs/viewpoints.ts` | `getDefaultViewpoint` | Function — never called |
| `src/engine/sab-schema.ts` | `SabByteOffset`, `SabFloatIndex` | Branded types — never used outside file |
| `src/physics/constants.ts` | `H_BAR`, `SIGMA`, `SOLAR_MASS` | Constants — defined but `hawking.ts`/`bekenstein.ts` redeclare their own copies |
| `src/rendering/bloom.ts` | `BloomConfig`, `DEFAULT_BLOOM_CONFIG` | Type + default — bloom config is set internally |
| `src/utils/webgl-utils.ts` | `warmupShader` | Function — unused |
| `src/utils/validation.ts` | `isWithinCanvasBounds` | Function — unused |
| `src/utils/device-detection.ts` | `HardwareInfo`, `detectGPUVendor`, `hasFloatFramebufferSupport` | Type + functions — `DeviceCapabilityProfile` is the current interface |
| `src/utils/errorTracking.ts` | `TrackedErrorEvent` | Interface — only used internally |
| `src/types/features.ts` | `FeaturePerformanceCost`, `PerformancePreset` | Types — defined but not imported by name |
| `src/types/webgpu.ts` | `RAY_PAYLOAD_SIZE` | Constant — defined but unused |
| `src/shaders/manager.ts` | `ShaderVariant` | Interface — only used internally |

---

## 4. Duplicated Physics Constants

### Problem
`hawking.ts` and `bekenstein.ts` redeclare their own SI constants instead of importing from the canonical `@/physics/constants`.

### Current duplication:

| Constant | `constants.ts` | `hawking.ts` | `bekenstein.ts` |
|----------|---------------|-------------|-----------------|
| `C` (speed of light) | `299792458` | `299_792_458` | `299_792_458` |
| `G` (gravitational) | `6.6743e-11` | `6.6743e-11` | `6.6743e-11` |
| `H_BAR` (Planck reduced) | `1.0545718e-34` | `1.054_571_817e-34` | `1.054_571_817e-34` |
| `KB` (Boltzmann) | **MISSING** | `1.380649e-23` | **MISSING** |
| `WIEN_FREQUENCY` | **MISSING** | `5.878_925_757e10` | **MISSING** |

### Fix
1. Add `KB` and `WIEN_FREQUENCY_CONSTANT_HZ_PER_K` to `src/physics/constants.ts`
2. Import `C`, `G`, `H_BAR` from `@/physics/constants` in `hawking.ts` and `bekenstein.ts`

---

## 5. Magic Numbers & Hardcoded Values

| File | Value | Location |
|------|-------|----------|
| `useAudio.ts` | `AUDIO_SRC = "/videoplayback.mp3"` | Line 6 |
| `useAudio.ts` | `STORAGE_KEY_VOLUME = "blackhole_audio_volume"` | Line 5 |
| `physics.worker.ts` | `IDLE_THRESHOLD_MS = 3000` | Line 25 |
| `useSimulationMode.ts` | `TRANSITION_MS = 500` | Line 17 (dead file, but pattern exists) |
| `useKeyboard.ts` | `ORBIT_STEP = 0.05` | Line 45 |
| `CinematicOverlay.tsx` | `HORIZON_LIMIT = 2.0`, `WARNING_LIMIT = 4.0`, `CRITICAL_LIMIT = 2.5` | Lines 18-20 |
| `sab-schema.ts` | `SHADOW_CURVE_MAX_POINTS = 56` | Line 54 |
| `WebGPUCanvas.tsx` | `fov = (60 * Math.PI) / 180` | Line 150 |

**Fix**: Extract to config files or module-level named constants.

---

## 6. Type Safety Issues

### `any` types with eslint-suppression:

| File | Line(s) | Instance |
|------|---------|----------|
| `physics-bridge.ts` | 5-8 | `engine: any`, `wasmModule: any` |
| `physics-bridge.ts` | 72 | `(self as any).wasmMemory` |
| `WebGPUCanvas.tsx` | 18 | `onMetricsUpdate?: (metrics: any) => void` |
| `ErrorDisplay.tsx` | 24 | `errorInfo?: any` |
| `ErrorDisplay.tsx` | 39 | `classifyError(error: any)` |
| `ErrorDisplay.tsx` | 85 | `CATEGORY_MAP: Record<string, any>` |
| `errorTracking.ts` | 47 | `error: any` in `captureException` |
| `device-detection.ts` | 174 | `(navigator as any).deviceMemory` |
| `physics.worker.ts` | 72, 124 | `(self as any).wasmMemory` |

**Fix**: Define proper interfaces for WASM FFI boundary types. Use `unknown` with type guards instead of `any`.

---

## 7. Import Inconsistencies

| File | Issue | Fix |
|------|-------|-----|
| `rendering/bloom.ts` | Uses relative paths: `"../shaders/..."`, `"../utils/..."` | Change to `@/shaders/...`, `@/utils/...` |
| `rendering/webgl/renderer.ts` | Correct — uses `@/` aliases | No change needed |
| `WebGPUCanvas.tsx` | `gl-matrix` import (line 5) is after internal aliases | Group external > internal |

---

## 8. Broken Imports / Runtime Failures

| Import Statement | File | Issue |
|-----------------|------|-------|
| `import("blackhole-physics")` | `physics-bridge.ts:77` | Package `"blackhole-physics"` doesn't exist as a resolvable module. Relies on path alias + WASM build output that may not exist |
| `import("blackhole-physics")` | `physics.worker.ts:60` | Same issue |
| `import type { PhysicsEngine } from "blackhole-physics"` | `physics.worker.ts:13` | Same — type import fails if WASM not built |

**Note**: This works in practice because:
1. `tsconfig.json` has `"blackhole-physics": ["./public/wasm"]` path alias
2. `vitest.config.ts` has matching alias
3. WASM is built to `public/wasm/` before dev server starts (`build:wasm && next dev`)

But there's **no validation** that `public/wasm/blackhole_physics.js` exists before these imports resolve. If the WASM build fails silently or is skipped, the entire app crashes at runtime with a module-not-found error.

**Fix**: Add a startup check script.

---

## 9. Per-Frame Allocation Hotspots

| File | Allocation | Fix |
|------|-----------|-----|
| `reprojection.ts:474` | `[0, 0, this.width, this.height]` viewport array allocated every `resolve()` | Pre-allocate as `Float32Array([0, 0, 0, 0])` and update values on resize |
| `bloom.ts:486-487, 522-523` | `halfWidth = Math.floor(width/2)`, `halfHeight` — division + Math.floor on every frame | Cache bloom pass dimensions, recalculate on resize |
| `WebGPUCanvas.tsx:173-174` | `new Float32Array()` for camera uniforms per frame | Pre-allocate and reuse |
| `physics-bridge.ts:93-94` | `new Worker(...)` and `new SharedArrayBuffer(2MB)` on every `initializeWorker()` call | Only created once via `initializationPromise` guard — but verify no re-creation on hot reload |

---

## 10. Missing JSDoc

| File | Functions missing docs |
|------|----------------------|
| `physics/kerr-metric.ts` | ALL 4 functions: `calculateEventHorizon`, `calculatePhotonSphere`, `calculateISCO`, `calculateTimeDilation` |
| `lib/physics/hawking.ts` | `hawkingTemperatureKelvin`, `wienPeakFrequency` — missing `@param`/`@returns` |
| `lib/physics/bekenstein.ts` | ALL functions — missing `@param`/`@returns` |
| `hooks/useReducedMotion.ts` | Entire file (but is dead code) |
| `hooks/useWebGPUSupport.ts` | Minimal docs |

---

## 11. Testing Gaps

### Untested critical paths:

| Module | Risk Level | Notes |
|--------|-----------|-------|
| `PhysicsBridge` (479 lines) | **Critical** | Central nervous system — zero unit tests |
| `physics.worker.ts` (181 lines) | **Critical** | Worker message handling, idle detection, SAB sync |
| `BloomManager` (727 lines) | **High** | Complex multi-pass post-processing |
| `ReprojectionManager` (314 lines) | **High** | TAA implementation |
| `ShaderCache` (45 lines) | **Medium** | Fallback compilation logic |
| `GPUResourcePool` (135 lines) | **Low** | Simple pool, but still untested |

### Untested hooks:

| Hook | Notes |
|------|-------|
| `useAudio` | Audio playback lifecycle, persistence |
| `useWebGL` (dead) | N/A — will be deleted |
| `useKeyboard` | Keybinding logic |
| `useBenchmark` | Benchmark lifecycle |
| `useSystemProfile` | Startup calibration pipeline |
| `useHardwareSupport` | Feature detection |
| `useWebGPUSupport` | WebGPU detection |
| `useMobileOptimization` | Mobile detection |
| `useAdaptiveResolution` | Resolution controller |

### WASM integration tests:
- **Zero tests** exercise the actual WASM module from TypeScript
- All 30 test files mock or avoid `physicsBridge`
- Rust API changes silently break the frontend

---

## 12. CI/CD & Build

| Issue | Detail | Fix |
|-------|--------|-----|
| **No Rust CI** | `ci.yml` doesn't exist; only `production.yml` (deploy) | Add CI workflow with `cargo check`, `cargo clippy`, `cargo test` |
| **No PR checks** | No workflow for pull requests | Add `pull_request` trigger to CI |
| **Windows build broken** | `vercel-build.sh` is bash-only | Add PowerShell equivalent or convert to Node.js script |
| **No WASM build validation** | No check that `public/wasm/blackhole_physics.js` exists | Add check script |
| **Missing lint in CI** | CI only runs `test`, not `lint` or `type-check` | Add `lint` and `type-check` steps |

---

## 13. Accessibility & Security

| Issue | Severity | Fix |
|-------|----------|-----|
| `maximumScale: 1, userScalable: false` in viewport | **A11y violation (WCAG 1.4.4)** | Remove or document as intentional for simulation UX |
| 14x `dangerouslySetInnerHTML` in `layout.tsx` | **Security (XSS surface)** | Add CSP header, use `nonce` on JSON-LD scripts |
| No `Content-Security-Policy` header | **Security** | Add CSP in `next.config.mjs` headers |
| No `aria-label` audit on interactive elements | **A11y** | Audit and add labels |

---

## 14. Architecture & State Management

| Issue | Detail | Fix |
|-------|--------|-----|
| `page.tsx` is 1,041 lines | All simulation state in one component | Extract state into zustand store or `useReducer` |
| `ControlPanel.tsx` is 1,083 lines | Monolithic component | Extract `FeatureToggleSection`, `TelemetryRail`, `TabBar`, `ParameterSlider` |
| 300-line SEO screen-reader section in `page.tsx` | Inline HTML for SEO | Extract to separate component file |
| 15+ `useState` + 10+ `useEffect` in `page.tsx` | Re-render cascading | Use `useReducer` or state management library |
| `EmbeddingDiagram` excluded from spacetime barrel | Not exported from `index.ts` | Either wire it in or delete the file |

---

## 15. Priority-Ordered Action Items

### Phase 1 — Safety & Correctness (DO FIRST)
```
P0  [BROKEN IMPORTS]  Add startup check for WASM build output existence
P0  [RUNTIME CRASH]   Fix physics.worker.ts:72 `(self as any).wasmMemory` — use typed interface
P0  [RUNTIME CRASH]   Fix physics-bridge.ts:77 — guard against missing WASM module
```

### Phase 2 — Dead Code Removal
```
P1  [DELETE]  src/performance/validation.ts           (530 lines, never imported)
P1  [DELETE]  src/performance/gpu-timer.ts             (40 lines, never imported)
P1  [DELETE]  src/physics/kerr-metric.ts               (43 lines, never imported)
P1  [DELETE]  src/rendering/spectral.ts                (83 lines, marked deprecated)
P1  [DELETE]  src/rendering/resource-pool.ts           (135 lines, never imported)
P1  [DELETE]  src/rendering/shader-cache.ts            (45 lines, never imported)
P1  [DELETE]  src/hooks/useWebGL.ts                    (366 lines, dead — replaced by WebGLRenderer)
P1  [DELETE]  src/hooks/useScreenshot.ts               (43 lines, never imported)
P1  [DELETE]  src/hooks/useSimulationMode.ts           (69 lines, only test imports)
P1  [DELETE]  src/hooks/useReducedMotion.ts            (18 lines, only test imports)
P1  [DELETE]  src/components/fallback/StaticFallback.tsx (43 lines, never imported)
P1  [DELETE]  src/components/spacetime/EmbeddingDiagram.tsx (~100 lines, not in barrel)
P1  [DELETE]  physics-engine/_legacy_src/              (~1200 lines, not compiled)
P1  [CONSIDER] src/shaders/compute.wgsl.ts             — keep if WebGPU roadmap active
P1  [CONSIDER] src/shaders/postprocess/ataa.wgsl.ts    — keep if WebGPU roadmap active
P1  [CONSIDER] src/shaders/blackhole/raymarching.wgsl.ts — keep if WebGPU roadmap active
P1  [CONSIDER] src/shaders/types.wgsl.ts               — keep if WebGPU roadmap active
```

### Phase 3 — Code Hygiene
```
P2  [CONSTANTS]  Add KB, WIEN_FREQUENCY to src/physics/constants.ts
P2  [CONSTANTS]  Import SI constants from @/physics/constants in hawking.ts + bekenstein.ts
P2  [MAGIC NUMBERS] Extract AUDIO_SRC, IDLE_THRESHOLD, ORBIT_STEP, etc. to config
P2  [MAGIC NUMBERS] Extract HORIZON_LIMIT, WARNING_LIMIT, CRITICAL_LIMIT to config
P2  [IMPORTS]    Fix bloom.ts relative paths → @/ aliases
P2  [IMPORTS]    Fix WebGPUCanvas.tsx import ordering
P2  [TYPES]      Fix engine: any → typed interface in physics-bridge.ts
P2  [TYPES]      Fix ErrorDisplay.tsx any → React.ErrorInfo | null
P2  [TYPES]      Fix errorTracking.ts any → unknown
P2  [TYPES]      Fix WebGPUCanvas.tsx metrics: any → MetricsUpdate type
P2  [TYPES]      Fix device-detection.ts navigator cast
P2  [EXPORTS]    Remove dead exports: BloomConfig, DEFAULT_BLOOM_CONFIG, warmupShader, etc.
```

### Phase 4 — Testing
```
P2  [TEST]  Add PhysicsBridge unit tests (mock WASM, test retry/tick/fallback)
P2  [TEST]  Add physics.worker.ts tests (message handlers, idle detection)
P2  [TEST]  Add BloomManager tests (multi-pass blur, brightness extraction)
P2  [TEST]  Add ReprojectionManager tests (ping-pong, blend, camera-move detection)
P3  [TEST]  Add hook tests: useAudio, useKeyboard, useBenchmark, useSystemProfile
P3  [TEST]  Add WASM integration test from TypeScript
P3  [TEST]  Add ShaderManager snapshot tests for generated shader source
```

### Phase 5 — Performance
```
P2  [PERF]  Pre-allocate viewport array in reprojection.ts
P2  [PERF]  Cache bloom pass dimensions on resize
P2  [PERF]  Pre-allocate Float32Array in WebGPUCanvas.tsx
P3  [PERF]  Verify PhysicsBridge.initializeWorker() is never called twice
```

### Phase 6 — CI/CD & Build
```
P2  [CI]   Add GitHub Actions ci.yml: lint + type-check + test + cargo check + clippy
P2  [CI]   Add pull_request trigger to CI
P2  [BUILD] Fix vercel-build.sh → cross-platform Node.js or PowerShell script
P3  [CI]   Add WASM build validation step
```

### Phase 7 — Architecture
```
P3  [STATE]  Extract simulation state from page.tsx into useReducer or zustand store
P3  [STATE]  Decompose ControlPanel.tsx (1083 lines → smaller components)
P3  [STATE]  Extract SEO section from page.tsx to separate component
P3  [ARCH]   If WebGPU roadmap is active: wire WGSL shaders into WebGPURenderer
```

### Phase 8 — Accessibility & Security
```
P3  [A11Y]  Relax maximumScale: 1 or document WCAG exemption
P3  [A11Y]  Add aria-label audit
P3  [SEC]   Add Content-Security-Policy header
P3  [SEC]   Use nonce on JSON-LD dangerouslySetInnerHTML
```

### Phase 9 — Documentation
```
P3  [DOCS]  Add JSDoc to lib/physics/hawking.ts, bekenstein.ts (missing @param/@returns)
P3  [DOCS]  Clean up the existing IMPROVEMENTS.md (this file replaces it)
P3  [DOCS]  Add CONTRIBUTING.md with setup instructions
```

---

## 16. File-by-File Dead Code Audit

### Legend
- **DEAD** = file has zero imports from production code
- **TEST-ONLY** = file only imported by test files
- **PARTIAL** = file is imported but has dead exports
- **LIVE** = file is actively imported

```
src/app/
├── layout.tsx            LIVE  — Next.js root layout
├── page.tsx              LIVE  — Main simulation page (1041 lines)
├── globals.css           LIVE  — Global styles + glass UI tokens
├── error.tsx             LIVE  — Next.js error boundary
├── global-error.tsx      LIVE  — Next.js global error boundary
├── manifest.ts           LIVE  — PWA manifest
├── robots.ts             LIVE  — Robots.txt
├── sitemap.ts            LIVE  — Sitemap.xml
├── opengraph-image.jpg   LIVE  — OG image
├── twitter-image.jpg     LIVE  — Twitter card image
├── google71f68cb94e351e26.html LIVE — Google Search Console verification

src/components/
├── canvas/
│   ├── WebGLCanvas.tsx   LIVE  — WebGL canvas wrapper
│   └── WebGPUCanvas.tsx  LIVE  — WebGPU canvas wrapper
├── debug/
│   ├── ErrorBoundary.tsx LIVE  — Error boundary wrapper
│   └── ErrorDisplay.tsx  LIVE  — Error display component
├── fallback/
│   └── StaticFallback.tsx DEAD  — Never imported anywhere
├── quantum/
│   ├── BekensteinHawkingReadout.tsx LIVE — Imported by page.tsx
│   └── HawkingSpectrumPanel.tsx    LIVE — Imported by page.tsx
├── spacetime/
│   ├── index.ts          LIVE  — Barrel export
│   ├── SpacetimeCanvas.tsx LIVE — Imported by page.tsx
│   ├── VolumetricGrid.tsx  LIVE — Used by SpacetimeCanvas
│   ├── ErgosphereMesh.tsx  LIVE — Used by SpacetimeCanvas
│   ├── LightCones.tsx      LIVE — Used by SpacetimeCanvas
│   ├── FrameDragField.tsx  LIVE — Used by SpacetimeCanvas
│   └── EmbeddingDiagram.tsx DEAD — Not in barrel, not imported
└── ui/
    ├── AudioControl.tsx      LIVE — Used by ControlPanel
    ├── BenchmarkResults.tsx  LIVE — Imported by page.tsx
    ├── CinematicOverlay.tsx  LIVE — Imported by page.tsx
    ├── CompatibilityHUD.tsx  LIVE — Imported by page.tsx
    ├── ControlPanel.tsx      LIVE — Imported by page.tsx (1083 lines)
    ├── DebugOverlay.tsx      LIVE — Imported by page.tsx
    ├── IdentityHUD.tsx       LIVE — Imported by page.tsx
    ├── SimulationInfo.tsx    LIVE — Imported by page.tsx
    ├── SystemProfileScreen.tsx LIVE — Imported by page.tsx
    ├── Telemetry.tsx         LIVE — Imported by page.tsx
    ├── UserProfile.tsx       LIVE — Used by ControlPanel
    └── WasmLoadingOverlay.tsx LIVE — Imported by page.tsx

src/configs/
├── simulation.config.ts  LIVE  — Used everywhere (134 imports)
├── performance.config.ts  LIVE  — Used everywhere (33 imports)
├── physics.config.ts      LIVE  — Used by renderer (14 imports)
└── viewpoints.ts          LIVE  — Used by useCamera (5 imports)

src/engine/
├── physics-bridge.ts     LIVE  — Used everywhere (25 imports)
└── sab-schema.ts         LIVE  — Used by bridge + worker (39 imports)

src/hooks/
├── useAdaptiveResolution.ts LIVE — Imported by page.tsx
├── useAudio.ts              LIVE — Imported by page.tsx
├── useBenchmark.ts          LIVE — Imported by page.tsx
├── useCamera.ts             LIVE — Imported by page.tsx
├── useHardwareSupport.ts    LIVE — Imported by page.tsx
├── useKeyboard.ts           LIVE — Imported by page.tsx
├── useMobileOptimization.ts LIVE — Imported by page.tsx
├── usePhysicsState.ts       LIVE — Imported by page.tsx
├── usePresets.ts            LIVE — Imported by page.tsx
├── useReducedMotion.ts      TEST-ONLY — Only imported by test file
├── useScreenshot.ts         DEAD  — Never imported anywhere
├── useSimulationMode.ts     TEST-ONLY — Only imported by test file
├── useSystemProfile.ts      LIVE — Imported by page.tsx
├── useUrlState.ts           LIVE — Imported by page.tsx
├── useWebGL.ts              DEAD  — Never imported anywhere (replaced by WebGLRenderer)
├── useWebGPUSupport.ts      LIVE — Imported by page.tsx

src/lib/physics/
├── bekenstein.ts        LIVE  — Imported by BekensteinHawkingReadout
└── hawking.ts           LIVE  — Imported by HawkingSpectrumPanel

src/performance/
├── benchmark.ts          LIVE  — Imported by useBenchmark
├── gpu-timer.ts          DEAD  — Never imported anywhere
├── monitor.ts            LIVE  — Imported by renderer (19 imports)
├── stress-test.ts        LIVE  — Imported by useSystemProfile
└── validation.ts         DEAD  — Never imported anywhere (530 lines)

src/physics/
├── constants.ts          LIVE  — Imported by kerr-metric + tests
└── kerr-metric.ts        DEAD  — Never imported by production code

src/rendering/
├── adaptive-resolution.ts LIVE — Imported by useAdaptiveResolution
├── bloom.ts               LIVE — Imported by WebGLRenderer
├── reprojection.ts        LIVE — Imported by WebGLRenderer
├── resource-pool.ts       DEAD  — Never imported anywhere
├── shader-cache.ts        DEAD  — Never imported anywhere
├── spectral.ts            DEAD  — Never imported anywhere (marked deprecated)
├── webgl/
│   └── renderer.ts        LIVE — Imported by WebGLCanvas
└── webgpu/
    └── renderer.ts        LIVE — Imported by WebGPUCanvas

src/shaders/
├── blackhole/
│   ├── vertex.glsl.ts     LIVE — Imported by WebGLRenderer
│   ├── fragment.glsl.ts   LIVE — Imported by WebGLRenderer
│   ├── chunks/*.ts         LIVE — All imported by fragment.glsl.ts
│   └── raymarching.wgsl.ts DEAD — Never imported (WebGPU WGSL)
├── compute.wgsl.ts        DEAD  — Never imported
├── manager.ts             LIVE — Imported by WebGLRenderer
├── postprocess/
│   ├── bloom.glsl.ts      LIVE — Imported by BloomManager
│   ├── reprojection.glsl.ts LIVE — Imported by ReprojectionManager
│   └── ataa.wgsl.ts       DEAD  — Never imported
├── types.wgsl.ts          DEAD  — Never imported
├── compute/               LIVE — Used by WebGPURenderer

src/storage/
└── settings.ts            LIVE — Imported by page.tsx

src/types/
├── features.ts            LIVE — Used everywhere (84+ imports)
├── simulation.ts          LIVE — Used everywhere (52+ imports)
└── webgpu.ts              LIVE — Used by WebGPU renderer

src/utils/
├── cpu-optimizations.ts   LIVE — Imported by WebGLRenderer
├── device-detection.ts    LIVE — Imported by useSystemProfile
├── errorTracking.ts       LIVE — Imported by ErrorDisplay
├── validation.ts          LIVE — Imported by control panel + tests
├── webgl-utils.ts         LIVE — Imported by BloomManager + WebGLRenderer

src/workers/
└── physics.worker.ts      LIVE — Imported by physics-bridge.ts (Worker URL)

physics-engine/
├── gravitas-core/         LIVE — Rust physics kernel
├── gravitas-wasm/         LIVE — WASM FFI layer
├── _legacy_src/           DEAD  — Not compiled by any Cargo.toml
└── deny.toml              LIVE — Cargo deny config
```
