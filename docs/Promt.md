# Mission: Upgrade Black Hole Simulation into a Professional Cinematic Astrophysics Experience

You are working inside my existing repository and live production project:

- **Live application:** https://blackholesimulation.vercel.app/#preset=high-quality
- **GitHub repository:** https://github.com/minhazexo/blackholesimulation
- **Stack:** Next.js, React, TypeScript, custom GLSL/WebGL rendering, Three.js ecosystem, and a Rust/WebAssembly physics engine.

I have provided a screen recording of the current production application. Study its visual behavior and use the current codebase as the source of truth.

Your goal is to transform the existing simulation into a polished, cinematic, scientifically credible black-hole visualization inspired by premium space documentaries and high-end astrophysics visualizations.

**Do not redesign the project from scratch. Improve the actual rendering, camera behavior, visual composition, interface, and performance that already exist.**

## Phase 1 — Audit the actual implementation

Before changing anything, inspect the repository and establish how the production scene is built.

Investigate the relevant existing files and their real equivalents, including:

- `src/app/page.tsx`
- `src/shaders/blackhole/fragment.glsl.ts`
- The shader chunks for disk rendering, blackbody color, gravitational metrics, background stars, noise, and lensing.
- `src/rendering/` and the adaptive-resolution implementation.
- The existing camera hook, cinematic tour, camera uniforms, and scene/preset configurations.
- `src/components/canvas/WebGLCanvas.tsx` and the WebGPU implementation, where applicable.
- The existing cinematic overlay and other UI components.
- The Rust/WASM physics engine, shared types, tests, and configuration that affect rendered state.

Locate the true data flow from camera state and physics parameters into shader uniforms and the final rendered frame. Verify which features are actually active in the production path; do not assume documentation or an unused component proves that a feature works.

Capture a baseline screenshot and record the current rendering performance.

Produce a short internal implementation plan, then proceed with the improvements.

## Phase 2 — Correct the visual problems in the recording

### A. Create a more convincing accretion disk

The current disk has broad, cloudy orange and gold spiral patterns. Improve its structure and visual depth so that it reads as a rotating accretion disk rather than a collection of concentric swirling bands.

Implement or refine the existing shader to provide:

- A clearly defined disk plane, appropriate thickness, and natural radial falloff.
- A gradual temperature-based color progression, with restrained white-hot or pale-gold highlights near hotter regions and warmer orange/red tones farther out where the model supports them.
- Fine-scale turbulence and layered detail that remain visible at both wide and close camera distances.
- Continuous rotational flow and differential angular motion consistent with the existing simulation model.
- Convincing brightness asymmetry from relativistic Doppler beaming, driven by the correct camera, velocity, and physics state.
- A visually distinct inner region and a disk edge that does not dissolve into a uniform orange cloud.
- Stable detail during camera movement, without harsh flickering, obvious repeating textures, large flat color bands, or excessive noise.

Avoid simply increasing saturation, bloom, or noise. Improve the actual spatial structure of the existing disk shader. Use the project's existing blackbody lookup table or equivalent color pipeline where appropriate.

### B. Improve the event horizon, photon ring, and gravitational lensing

The black-hole silhouette should remain the primary focal point.

Refine the current implementation so that:

- The shadow boundary is clean and appropriately dark.
- The photon ring is narrow, luminous, and detailed without becoming an unnaturally thick white outline.
- The background starfield and disk exhibit convincing distortion around the black hole.
- The near-side and far-side parts of the disk appear in physically consistent positions.
- The lensing and disk geometry respond smoothly to changes in camera inclination, spin, and other supported parameters.
- Close-up views retain fine detail, while wide shots communicate the scale and geometry of the whole scene.
- Highlights retain detail instead of clipping into large featureless white or yellow regions.

Preserve the existing Kerr-related calculations and physics architecture. Do not replace the renderer with a static image, a video, a fake circular overlay, or decorative CSS rings.

Do not invent physically inaccurate effects just to make the scene more dramatic. If a visual approximation is necessary, keep it consistent with the existing simulation model and document the limitation.

### C. Make the starfield look like deep space

In the recording, many bright star-like objects look more like snow, debris, or fast-moving particles.

Improve the existing starfield using a natural distribution of sizes, brightness, and depth:

- Most stars should be small, sharp, and subtle.
- Only a small proportion should be bright enough to stand out.
- Avoid excessive white streaks, oversized square particles, and uniform visual density.
- Use camera-relative movement and parallax only where supported by the current rendering approach.
- If motion trails are used, keep them restrained and intentional.
- Maintain a rich, nearly black background so the luminous disk remains the visual anchor.
- Prevent stars from appearing as a flat layer pasted over the black-hole silhouette.

Keep procedural generation deterministic where practical and maintain good performance.

### D. Establish professional cinematic lighting and color grading

Develop a coherent visual palette based on deep black, midnight blue, subtle neutral highlights, and controlled gold/orange emission from the accretion disk.

Improve contrast, highlight roll-off, local separation, and overall tonal balance.

Use the existing post-processing pipeline where possible. Avoid stacking redundant bloom or tone-mapping passes, applying gamma correction twice, washing out the starfield, or illuminating the event-horizon interior in ways that undermine its appearance.

The final result should feel atmospheric and visually sophisticated, not oversaturated, overly glossy, or game-like.

## Phase 3 — Redesign the cinematic camera experience

Audit the existing camera hook, scene configurations, cinematic mode, and viewpoint tour before implementing anything new.

Create a deliberate cinematic sequence that can include:

1. A restrained opening fade-in from deep space.
2. A wide establishing shot that communicates the complete black-hole system.
3. A slow, controlled orbit or change of inclination.
4. A gradual push-in toward the photon ring and inner disk.
5. A close-up that reveals structural detail.
6. A smooth transition back to a wider composition or the user's chosen camera position.

Requirements:

- Use delta-time-based movement and stable interpolation.
- Use appropriate easing curves for transitions.
- Prevent camera jumps, sudden changes in scale, jitter, oscillation, and discontinuities in uniforms.
- Maintain a deliberate focal point and a comfortable sense of motion.
- Ensure camera motion remains consistent across refresh rates.
- Allow the user to pause, resume, exit cinematic mode, and regain manual control.
- Manual input must not fight against a running automated camera sequence.
- Respect reduced-motion accessibility preferences.
- Clean up animation loops, event listeners, and resources correctly.
- Reuse existing scene and camera systems rather than introducing a competing animation architecture.

Make transitions between the existing viewpoint-tour scenes visually deliberate. Verify that any displayed camera angle and scene description match the actual camera state.

## Phase 4 — Fix the interface composition

In the recording, the main scene's title, explanatory paragraphs, metadata, and bullet points occupy the center of the screen and overlap the black hole.

Preserve the project's distinctive identity, but improve its visual hierarchy.

Requirements:

- Keep the central black-hole silhouette and its most important visual details unobstructed.
- Move explanatory content into a compact, responsive information panel or a suitable screen-edge safe area.
- Adapt panel placement to the current camera framing instead of permanently covering one part of the simulation.
- Use restrained typography, readable text sizes, consistent spacing, and intentional alignment.
- Improve the contrast and legibility of small controls, scene-navigation buttons, and scientific metadata.
- Give primary controls a clear visual hierarchy without turning the screen into a dashboard.
- Make scene titles and supporting text appear and disappear with smooth, restrained transitions.
- Avoid excessive glass panels, borders, glowing outlines, labels, and decorative elements.
- Ensure that cinematic mode can minimize interface distractions, with essential controls still accessible.
- Fix truncation, overlap, clipping, and responsive layout problems.

Retain useful scientific information, but distinguish essential live telemetry from explanatory narration and secondary metadata.

Verify that all scientific values and labels are derived from the correct simulation state. Do not display fabricated FPS values, stale measurements, or static parameters that contradict the actual shader uniforms.

## Phase 5 — Investigate the apparent frame-rate issue

The recording's on-screen FPS indicator reads approximately **10 Hz**. Treat this as a diagnostic signal, not proof of a specific bottleneck.

Measure actual rendering performance on the running application and investigate the source of any low frame rate.

Examine:

- Shader instruction and ray-marching costs.
- Expensive loops, branches, and repeated calculations.
- Render-target and post-processing overhead.
- Drawing-buffer resolution, device pixel ratio, and adaptive-resolution behavior.
- Excessive per-frame allocations, React updates, and unnecessary state changes.
- Camera or animation loops that may be duplicated.
- GPU timing and browser limitations, where measurable.

Prefer profiling and evidence-based optimization over arbitrary reductions in quality.

Preserve the high-quality visual preset. Use the existing adaptive-resolution system where appropriate, and ensure any quality scaling is gradual, stable, and reversible.

The target is smooth, consistent motion on capable desktop hardware, with graceful quality scaling on less powerful systems. Report actual measured results and testing limitations honestly. Never hide a performance problem by changing or falsifying the FPS display.

## Phase 6 — Preserve architecture and compatibility

- Keep the existing Next.js, React, TypeScript, GLSL, and Rust/WASM architecture intact.
- Preserve the existing simulation and scientific computations unless a verified defect requires a correction.
- Retain WebGL 2 support and the existing WebGPU path or fallback behavior.
- Do not introduce unnecessary dependencies.
- Avoid React state updates on every animation frame.
- Avoid memory leaks, shader compilation regressions, and unbounded resource creation.
- Maintain responsive layouts and usability on desktop and mobile.
- Respect reduced motion and keyboard accessibility.
- Keep working functionality, presets, camera controls, and diagnostics operational.

Make focused, maintainable changes. Do not rewrite large parts of the project solely to impose a new design.

## Phase 7 — Verify the actual result

After implementation:

1. Run the project using its documented Bun workflow.
2. Run the applicable type-checking, linting, shader validation, automated tests, physics regressions, and production build.
3. Launch the application and inspect the actual browser rendering.
4. Test the high-quality preset and the cinematic viewpoint tour.
5. Compare baseline and updated screenshots from equivalent camera positions.
6. Inspect a wide establishing shot, a normal viewing angle, and a close-up.
7. Test scene transitions, manual controls, pause/resume, and exit behavior.
8. Check the layout at desktop and mobile viewport sizes.
9. Measure real frame rate or frame time before and after optimization when possible.
10. Fix regressions introduced by the changes.

Do not mark a test as passing unless it was actually run successfully. If a browser or GPU benchmark is unavailable, explicitly report that limitation.

## Acceptance criteria

The implementation is complete only when:

- The accretion disk has clearer structure and more convincing temperature and brightness variation.
- The event horizon, photon ring, and surrounding lensing read as one coherent visual system.
- The starfield feels like deep space rather than snowfall or debris.
- The camera sequence feels smooth, intentional, and controllable.
- Main explanatory text no longer distracts from the central black-hole visual.
- The interface is readable, responsive, and consistent.
- The FPS measurement is verified and any identified bottlenecks are addressed where possible.
- The existing physics, rendering compatibility, controls, and presets continue to work.
- The final result has been checked visually in the browser, not merely assumed correct from code inspection.

## Final report

When finished, summarize:

- The visual and technical problems discovered.
- The exact files changed and why.
- The shader, camera, interface, and performance improvements made.
- Tests and builds actually run, including any failures.
- Before-and-after performance measurements, where available.
- Any remaining limitations or recommended next steps.

Do not commit or push changes. Do not discard unrelated user modifications. Work in small, verifiable steps and prioritize the largest improvements to the actual rendered experience.
