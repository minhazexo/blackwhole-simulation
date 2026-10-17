# Homepage Visual & UX Audit

## Overview

Audit of `src/app/page.tsx` and all rendered UI components. The app is a full-screen black hole simulation canvas with
HUD overlays. The design language is **dark/glass-morphism** with a **cyan accent** and **monospace/sci-fi typography**.

---

## 1. Loading / First-Paint Experience

### Current
- `WasmLoadingOverlay`: black full-screen, pulsing concentric rings, "Compiling Physics Kernel" text, an indeterminate
  gradient progress bar, and a dim hint line. Falls back to the canvas after 15s timeout.

### Issues
- **No visual preview during load.** The user stares at a black screen with text for 2–15s. A spinning ring is generic.
- **No emotional hook.** No black hole silhouette, accretion-disk gradient, or particle system to create excitement.
- **Abrupt transition.** The loading overlay disappears → canvas appears instantly with no crossfade.

### Recommendations
| Priority | Change | Rough effort |
|----------|--------|-------------|
| **P0** | Add a subtle animated SVG black hole silhouette or accretion-disk gradient behind the loading text. Even a blurred radial gradient with a `rotate` animation would feel thematic. | 1h |
| **P1** | Fade the loading overlay into the canvas (`AnimatePresence` + `opacity` crossfade instead of `visible={!physicsReady}` instant swap). | 10min |
| **P2** | Show estimated compilation progress if the WASM worker can report phases (instantiate → compile → ready). | 2h |

---

## 2. Mobile / First-Time Visitor Experience

### Current
- `isMobile && !isCompact` hides the IdentityHUD and Telemetry entirely.
- The canvas fills the screen, the "Take A Tour" CTA appears, and the "Quantum Effects" button floats top-right.
- No tooltip, swipe hint, or onboarding overlay.

### Issues
- **Black void.** A new mobile visitor sees a black screen with no indication of interactivity.
- **No touch/gesture guidance.** The canvas supports `onTouchStart/Move/End` but nothing tells the user to drag to orbit.
- **"Quantum Effects" button** positioned at `top-24 right-4` — conflicts with the notch/cutout on modern phones.
- **Viewport is locked** (`userScalable: false`, `maximumScale: 1`) — accessibility concern for low-vision users.

### Recommendations
| Priority | Change | Effort |
|----------|--------|--------|
| **P0** | Add a **first-visit gesture hint** (e.g., a pulsing "Drag to orbit" label + finger-swipe icon that fades after 3s or on first interaction). Respect `localStorage` to show only once. | 2h |
| **P1** | Float the "Quantum Effects" button to `top-28 left-4` on mobile to avoid notch area. | 10min |
| **P2** | Consider removing `userScalable: false` — pinch-to-zoom is an accessibility requirement in many regions. | 5min |

---

## 3. SEO Block — Hidden Content Risk

### Current
- `page.tsx` lines 337–839 (~500 lines) is a single `<section className="sr-only">` block containing 11 headings,
  15+ paragraphs, 2 tables, 5 lists, a BibTeX citation, and an FAQ section — all hidden from visual users.
- The phrase **"black hole"** appears ~80 times, **"black hole simulation"** ~25 times.
- `layout.tsx` injects **16 separate JSON-LD `<script>` blocks** (SoftwareApplication, TechArticle, FAQPage,
  ScholarlyArticle ×4, Dataset, ResearchProject, Service, HowTo, Person, ProfilePage, WebSite, BreadcrumbList,
  SoftwareSourceCode).

### Issues
- **Extreme keyword density.** Hidden text at this ratio is a well-known search-engine spam signal. Google's
  guidelines explicitly warn against "large amounts of text that are not visible to users."
- **Schema overload.** 16 schema blocks on a single-page app is unusual. Google may ignore all if they appear
  self-promotional or redundant.
- **Maintenance burden.** The `sr-only` text must stay in sync with the actual simulation behavior or it becomes
  misleading.

### Recommendations
| Priority | Change | Effort |
|----------|--------|--------|
| **P0** | Reduce the `sr-only` block to **2–3 concise paragraphs** with natural keyword density (1–2% max). Move the detailed educational content to a separate `/learn` or `/physics` route where it's visible and valuable. | 2h |
| **P1** | Merge the 16 JSON-LD schemas into **1–2 combined blocks** (e.g., a single `@graph` array). Remove schemas that have no distinct content on the page (Dataset, ResearchProject, Service). | 1h |
| **P2** | Serve a static HTML shell with the educational content for crawlers, hydrate to the full app on client. | 4h |

---

## 4. Color Palette & Visual Hierarchy

### Current
- **Accent:** `#00f2ff` (cyan) — used for borders, text highlights, hover states, loading rings.
- **Warning:** red (`text-red-500`, `border-red-500`) — used for horizon proximity, compat HUD.
- **Grays:** white at various opacities (`text-white/80`, `text-white/50`, `border-white/10`, etc.).
- **Backgrounds:** `bg-black`, glass layers at `rgba(255,255,255,0.02-0.08)`.

### Issues
- **Monochromatic.** Everything is black/white/cyan/red. No warm tones for energy, no purple for quantum effects.
- **Low contrast on labels.** Many UI labels use `text-white/50` or `text-white/30` — hard to read on bright displays.
- **No semantic color for quantum panel.** The BekensteinHawkingReadout and HawkingSpectrumPanel use the same glass
  styles as everything else, making them visually indistinct.

### Recommendations
| Priority | Change | Effort |
|----------|--------|--------|
| **P1** | Introduce **amber/gold** (`#fbbf24`) as a secondary accent for energy/plasma states (accretion disk, temperature). | 30min |
| **P1** | Use **purple/violet** (`#a78bfa`) for quantum-panel backgrounds to visually separate classical vs. quantum domains. | 30min |
| **P2** | Audit all `text-white/50` and lower — bump to `text-white/70` minimum for body labels. | 30min |

---

## 5. Glass System Inconsistency

### Current
- Three glass utilities exist: `liquid-glass`, `frosted-glass-apple`, `glass-subtle-frost`, and `glass-panel`.
- `ControlPanel` uses `glass-subtle-frost` (blur 3px, saturate 140%).
- `SimulationInfo` uses `liquid-glass` (collapsed) and `frosted-glass-apple` (expanded, blur 50px, saturate 210%).
- `CompatibilityHUD` uses hard-coded inline classes.
- `CinematicOverlay` title pill uses `bg-black/40 backdrop-blur-md`.

### Issues
- **Four glass styles with no documented tier system.** Each component chooses independently.
- `frosted-glass-apple` (blur 50px) may cause **performance drops** on integrated GPUs due to the extreme blur radius.

### Recommendations
| Priority | Change | Effort |
|----------|--------|--------|
| **P1** | Define a **glass tier system** in `globals.css` and document it: `glass-1` (subtle, panels), `glass-2` (prominent, modals), `glass-3` (apple-style, hero elements). Retrofit all components. | 1h |
| **P2** | Reduce max blur to **30px** on mobile / low-end devices via `@media (prefers-reduced-motion)` or a runtime GPU tier check. | 30min |

---

## 6. Typography & Readability

### Current
- Inter font loaded via Next.js font system.
- Extensive use of small monospace sizes: `text-[7px]`, `text-[8px]`, `text-[9px]`, `text-[11px]`.
- Tracking (letter-spacing) is very wide: `tracking-[0.2em]` to `tracking-[0.4em]`.

### Issues
- **7px–9px text** is illegible on high-DPI mobile screens and fails WCAG SC 1.4.4 (minimum 12px for text).
- **Wide tracking + small size** makes HUD text decorative, not readable.
- **No responsive font scaling.** HUD uses fixed pixel values, not `clamp()` or viewport units.

### Recommendations
| Priority | Change | Effort |
|----------|--------|--------|
| **P0** | Set a **minimum font size of 10px** for all UI text. Use `text-[clamp(10px,1.5vw,14px)]` for HUD values. | 30min |
| **P1** | Reduce tracking in body-size labels (below `tracking-[0.1em]` for anything in `text-[11px]` or smaller). | 15min |

---

## 7. Canvas-First Layout Risks

### Current
- `<body>` is `overflow: hidden; position: fixed; height: 100%; width: 100%` to prevent scrolling.
- The only interactive elements are canvas mouse/touch handlers and the UI overlays.

### Issues
- **No scroll fallback.** If any UI element overflows the viewport (e.g., ControlPanel with many viewpoints), content is clipped.
- **Keyboard navigation gaps.** The canvas renders at z-0, UI at z-30/50. Tab order and focus management rely on `useKeyboard` hook, but many buttons lack visible focus rings.
- **No safe-area-inset** handling for iPhone notch/home indicator. The bottom-mounted ControlPanel may overlap the home indicator.

### Recommendations
| Priority | Change | Effort |
|--------|--------|--------|
| **P0** | Add `env(safe-area-inset-bottom)` padding to all bottom-fixed elements (ControlPanel, Take A Tour button). | 15min |
| **P1** | Ensure **all interactive elements** have visible `:focus-visible` rings (add Tailwind `focus-visible:ring-2 focus-visible:ring-accent-cyan` to buttons). | 30min |
| **P2** | Add `@media (pointer: coarse)` styles to enlarge touch targets to minimum 44×44px on mobile. | 30min |

---

## 8. Animation & Interaction Polish

### Current
- `AnimatePresence` used for UI fade transitions, spring-based panel sizes.
- "Take A Tour" button has animated pulse dots, hover glow, and scale on active.
- `CinematicOverlay` has proximity-based critical warnings.

### Issues
- **No parallax or depth layering.** HUD elements are flat — no subtle z-translation or parallax relative to the canvas.
- **"Take A Tour" button** is always present (when `physicsReady && showUI && !isCinematic && isCompact`). It competes with ControlPanel for bottom space.
- **No micro-interactions on slider/value changes.** When mass/spin changes, there's no visual feedback beyond the number changing.

### Recommendations
| Priority | Change | Effort |
|--------|--------|--------|
| **P1** | Add a **subtle parallax** to IdentityHUD and Telemetry (move at 2–5px offset based on mouse position via `useMouse`). Maps to the "live instrument panel" sci-fi feel. | 1h |
| **P1** | Show the **"Take A Tour" CTA only once** (per session) via a `sessionStorage` flag after first interaction. Or reposition it to bottom-left above SimulationInfo to avoid overlap. | 30min |
| **P2** | Add a **brief glow/ring animation** on the canvas periphery when mass/spin crosses a threshold (e.g., `spin > 0.9` triggers a subtle frame glow). | 2h |

---

## 9. Canvas Empty State (No Features Enabled)

### Current
- If a user disables _all_ features (lensing, disk, bloom, stars, etc.), the canvas renders only the black hole shadow
  (if enabled) or a plain black field.

### Issue
- The app becomes a black screen with HUD numbers — confusing and broken-looking.

### Recommendation
| Priority | Change | Effort |
|----------|--------|--------|
| **P1** | When all visual features are off, overlay a **faint reference grid or coordinate axes** on the canvas so the user still sees _something_ spatial. | 1h |

---

## 10. Summary: Priority Roadmap

| Priority | Area | Quick wins (<1h) | Larger efforts |
|----------|------|-----------------|----------------|
| **P0** | Mobile first-visit | Gesture hint overlay | — |
| **P0** | SEO spam risk | Trim `sr-only` to 3 paragraphs | Merge 16→2 schema blocks |
| **P0** | Accessibility | Add `env(safe-area-inset-bottom)`, bump min font to 10px | Focus rings audit |
| **P1** | Loading experience | SVG black hole silhouette + crossfade | WASM phase progress |
| **P1** | Color palette | Add amber/purple accents | Full theme token pass |
| **P1** | Glass system | Define tiered glass utilities | Retrofit all components |
| **P1** | Animation | Session-storage CTA, HUD parallax | Threshold glow effects |
| **P2** | Canvas empty state | Reference grid overlay | — |
| **P2** | Performance | Cap blur radius on low-end | — |

---

*Generated from `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `tailwind.config.js`, and all UI components.*
