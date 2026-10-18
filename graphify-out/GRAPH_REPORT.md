# Graph Report - blackhole-remote (2026-10-17)

## Corpus Check

- 38 files · ~410,324 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary

- 1659 nodes · 2940 edges · 120 communities (81 shown, 39 thin omitted)
- Extraction: 94% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 161 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)

- WebGL/WebGPU Rendering Stack
- Polarization Stokes Calculus
- Camera Rig & Cinematic State
- WebGPU Renderer Core
- Site Metadata & Layout
- Visual Regression Harness
- Hawking Thermodynamics UI
- WASM Physics Bridge
- Blackbody Radiation Constants
- TypeScript Type Packages
- Test Tooling Dependencies
- Benchmark Results UI
- ISCO & Plunge Orbits
- Control Panel Features Tab
- Metric Tensor Components
- Hamiltonian Mechanics
- Settings Storage Layer
- WASM Engine API Surface
- Audio & Brand Icon UI
- Performance Monitor & Calibration
- Numerical Audit Invariants
- Radiative Transfer Solver Tests
- App Shell HUD & Debug
- Idle Activity Tracking
- Magnetosphere Wald Field Tests
- WebGL Uniform Management
- Geodesic Conservation Tests
- Geodesic Integrator Steps
- Synchrotron Emission Tests
- TypeScript Compiler Config
- Error & Normalization Types
- Control Panel Shell
- Hardware Detection & Tiers
- Geodesic Termination Logic
- Synchrotron Plasma Physics
- Feature Flags & Presets
- Metric Tensor Algebra
- Error Boundary UI
- Bloom Post-Processing
- GLSL Shader Chunks
- Accretion Disk Thermodynamics
- Adaptive Resolution Controller
- Vercel Deploy Config
- SAB Memory Layout
- Physics SI Constants
- Lensing & Shadow Optics
- Worker SAB Protocol
- System Profile & Presets
- Stress Test & Shader Mocks
- Vercel Build Config
- SAB Offset Definitions
- Shadow Curve Kernels
- Project Identity Concepts
- Kerr Metric Unit Tests
- Runtime Dependencies
- WebGL Renderer Lifecycle
- Performance Config & Monitor
- Camera Touch & Damping
- Adaptive RKF45 Stepper
- WASM Camera Bindings
- Spectral Bands & Opacity
- Redshift Factor Tests
- Spacetime Embedding Geometry
- Architecture Concept Hub
- WASM LUT Generators
- Timelike Renormalization Tests
- Bloom Shader Pipeline
- Temporal Reprojection
- Shader Variant Cache
- Photon Sphere Tests
- Golden Manifest Config
- SAB Bounds Tests
- PWA Manifest & Identity
- Image Diff Tooling
- OG Cover Image
- System Profile Screen
- Constants of Motion
- Curvature Invariants
- Frame Dragging Field
- Light Cone Tilt
- Christoffel Symbols
- App Touch Icon
- Starmap Texture
- Cinematic Overlay UI
- URL Hash State
- Test Storage Shim
- EXR Conversion Script
- Disk LUT & SAB Ticks
- Brand Logo Identity
- Milky Way 4K Texture
- Milky Way Texture Role
- Performance Module Hub
- Benchmark & Test Strategy
- Future Research Roadmap
- ESLint Configuration
- Git Hooks & CI
- Next.js Configuration
- SAB Tick Kernels
- Vercel Build Script
- Mobile UI Patterns
- SEO Guardrails
- Code Health Audits
- Deploy Operator Scripts
- Geodesic Regularization
- Rust Workspace Crates
- Tailwind Configuration
- AI Agent Instructions
- Redshift Concept
- Physics Module Index
- Quantum Module Index
- Spacetime Module Index
- TAA Variance Clipping
- Noise Textures & Shaders
- Performance Optimization Patterns

## God Nodes (most connected - your core abstractions)

1. `Kerr` - 52 edges
2. `PhysicsEngine` - 47 edges
3. `react` - 44 edges
4. `PhysicsBridge` - 38 edges
5. `FeatureToggles` - 33 edges
6. `GeodesicState` - 31 edges
7. `vitest` - 30 edges
8. `SimulationParams` - 27 edges
9. `MetricTensor4` - 27 edges
10. `PresetName` - 26 edges

## Surprising Connections (you probably didn't know these)

- `WASM Bridge Doc Mirror` --semantically_similar_to--> `Gravitas WASM Bridge` [INFERRED] [semantically similar]
  public/wasm/README.md → physics-engine/gravitas-wasm/README.md
- `Ambient Background Music Transcript` --conceptually_related_to--> `Interactive Black Hole Simulation` [AMBIGUOUS]
  graphify-out/transcripts/background-music.txt → README.md
- `Lefthook Git Hooks` --conceptually_related_to--> `Production Pipeline Hybrid WASM Web` [INFERRED]
  lefthook.yml → .github/workflows/production.yml
- `SEO Hidden Content Risk` --conceptually_related_to--> `SEO Provenance Check` [INFERRED]
  docs/archive/homepage-visual-audit.md → scripts/README.md
- `Vercel Production Deploy` --conceptually_related_to--> `Operator CI Scripts` [INFERRED]
  .github/workflows/production.yml → scripts/README.md

## Import Cycles

- 2-file cycle: `physics-engine/gravitas-core/src/metric/minkowski.rs -> physics-engine/gravitas-core/src/metric/mod.rs -> physics-engine/gravitas-core/src/metric/minkowski.rs`
- 2-file cycle: `physics-engine/gravitas-core/src/metric/mod.rs -> physics-engine/gravitas-core/src/metric/schwarzschild.rs -> physics-engine/gravitas-core/src/metric/mod.rs`

## Hyperedges (group relationships)

- **hyperedge_zero_copy_reactive_pipeline** — readme_zero_copy_pipeline, docs_architecture_zero_copy_pipeline, docs_architecture_sharedarraybuffer_protocol, physics_engine_gravitas_wasm_readme_wasm_bridge [INFERRED]

## Communities (120 total, 39 thin omitted)

### Community 0 - "WebGL/WebGPU Rendering Stack"

Cohesion: 0.06
Nodes (33): blackhole-physics, @react-three/drei, @react-three/fiber, three, SpacetimeCanvas, ErgosphereMesh(), ErgosphereMeshProps, FrameDragField() (+25 more)

### Community 1 - "Polarization Stokes Calculus"

Cohesion: 0.06
Nodes (23): complex64, consts, evpa_rotation(), initial_disk_stokes(), Complex64, Self, StokesVector, .UNPOLARISED_UNIT (+15 more)

### Community 2 - "Camera Rig & Cinematic State"

Cohesion: 0.10
Nodes (42): getViewpoint(), pushLiveCamera(), CameraPose, computeDiveFrame(), computeOrbitFrame(), computeViewpointFlyPose(), DiveFrame, driftDwellStep() (+34 more)

### Community 3 - "WebGPU Renderer Core"

Cohesion: 0.08
Nodes (19): gl-matrix, MetricsUpdate, NOTE: the renderer exposes no device-lost signal (no `device.lost` /, NOTE: WebGPURenderer exposes no cleanup/dispose method, so the, WebGPUCanvasProps, useAdaptiveResolution(), UseAdaptiveResolutionOptions, AdaptiveResolutionController (+11 more)

### Community 4 - "Site Metadata & Layout"

Cohesion: 0.06
Nodes (33): next, src_app_globals, inter, metadata, viewport, siteMetadata, siteViewport, APP_VERSION (+25 more)

### Community 5 - "Visual Regression Harness"

Cohesion: 0.09
Nodes (32): ref_node_child_process, ref_node_fs, ref_node_path, ref_node_process, @playwright/test, ENDPOINTS, fetchSitemapUrls(), findIndexNowKey() (+24 more)

### Community 6 - "Hawking Thermodynamics UI"

Cohesion: 0.12
Nodes (29): recharts, BekensteinHawkingReadout, HawkingSpectrumPanel, BekensteinHawkingReadout(), BekensteinHawkingReadoutProps, ADR-0026, HawkingSpectrumPanel(), HawkingSpectrumPanelProps (+21 more)

### Community 8 - "Blackbody Radiation Constants"

Cohesion: 0.09
Nodes (28): bekenstein, constants, C1, C2, cie_1931(), generate_blackbody_lut(), H, integrate_planck_xyz() (+20 more)

### Community 9 - "TypeScript Type Packages"

Cohesion: 0.06
Nodes (31): author, name, packageManager, private, trustedDependencies, version, autoprefixer, concurrently (+23 more)

### Community 10 - "Test Tooling Dependencies"

Cohesion: 0.06
Nodes (32): devDependencies, autoprefixer, concurrently, cross-env, eslint, eslint-config-next, fast-check, jsdom (+24 more)

### Community 11 - "Benchmark Results UI"

Cohesion: 0.11
Nodes (13): BenchmarkResults, BenchmarkResults, BenchmarkResultsProps, getTierInfo(), useBenchmark(), UsePresetsReturn, BenchmarkCompleteCallback, BenchmarkController (+5 more)

### Community 12 - "ISCO & Plunge Orbits"

Cohesion: 0.13
Nodes (27): Orbit, circular_angular_velocity(), circular_specific_angular_momentum(), circular_specific_energy(), plunge_emissivity_envelope(), plunge_entry_state(), PlungeEntryState, radiative_efficiency() (+19 more)

### Community 13 - "Control Panel Features Tab"

Cohesion: 0.12
Nodes (24): ControlPanel, ControlSlider(), FeaturesTabProps, PerformanceTabProps, PRESETS, QUALITY_LEVELS, SectionHeader(), SimulationTabProps (+16 more)

### Community 14 - "Metric Tensor Components"

Cohesion: 0.13
Nodes (7): CoordinateSystem, Kerr, test_metric_signature(), ergosphere_mesh(), frame_drag_field(), frame_dragging_omega(), Vec

### Community 15 - "Hamiltonian Mechanics"

Cohesion: 0.10
Nodes (5): Minkowski, HamiltonianDerivatives, Metric, Self, Schwarzschild

### Community 16 - "Settings Storage Layer"

Cohesion: 0.12
Nodes (12): DEFAULT_FEATURES, validateFeatureToggles(), settingsStorage, STORAGE_KEYS, localStorageMock, navigatorMock, windowMock, featureTogglesArbitrary (+4 more)

### Community 17 - "WASM Engine API Surface"

Cohesion: 0.07
Nodes (3): CameraState, PhysicsEngine, Option

### Community 18 - "Audio & Brand Icon UI"

Cohesion: 0.12
Nodes (19): framer-motion, lucide-react, react, SimulationInfo, AudioControl(), AudioControlProps, FacebookIcon(), GithubIcon() (+11 more)

### Community 20 - "Numerical Audit Invariants"

Cohesion: 0.10
Nodes (18): NumericalAudit, NumericalAudit<'a, M>, M, Self, combined_g_factor(), doppler_factor(), gravitational_factor(), kerr_g_factor() (+10 more)

### Community 21 - "Radiative Transfer Solver Tests"

Cohesion: 0.12
Nodes (16): integrate_bands(), integrate_radiative_transfer(), RadiativeTransferSample, Vec, analytic_step_solution_matches_closed_form(), beer_lambert_composes_across_steps(), integrate_bands_matches_per_band_scalar_call(), integrate_bands_returns_one_intensity_per_band() (+8 more)

### Community 22 - "App Shell HUD & Debug"

Cohesion: 0.12
Nodes (17): ADR-0026, App(), DebugOverlay, WebGPUCanvas(), DebugMetrics, DebugOverlay, DebugOverlayProps, WasmLoadingOverlay (+9 more)

### Community 23 - "Idle Activity Tracking"

Cohesion: 0.10
Nodes (4): debounce(), IdleDetector, PhysicsCache, UniformBatcher

### Community 24 - "Magnetosphere Wald Field Tests"

Cohesion: 0.14
Nodes (19): magnetosphere, asymptotic_b_z_from_potential(), wald_field_tensor(), wald_horizon_charge(), wald_potential_down(), asymptotic_helper_zero_at_polar_axis(), at_zero_spin_a_phi_reduces_to_flat_uniform_field(), at_zero_spin_a_t_vanishes() (+11 more)

### Community 25 - "WebGL Uniform Management"

Cohesion: 0.11
Nodes (5): fast-check, vitest, MockWebGLContext, updateUniforms(), featureTogglesArbitrary

### Community 26 - "Geodesic Conservation Tests"

Cohesion: 0.13
Nodes (3): ref_fs, ref_path, PhysicsEngine

### Community 27 - "Geodesic Integrator Steps"

Cohesion: 0.15
Nodes (17): @testing-library/react, Telemetry, CanvasError, WebGLCanvasProps, fixedWidth(), Telemetry, TelemetryProps, useKeyboard() (+9 more)

### Community 28 - "Synchrotron Emission Tests"

Cohesion: 0.11
Nodes (12): cyclotron_frequency(), pandya_2016_thermal_fit(), synchrotron_characteristic_frequency(), theta_e(), cyclotron_frequency_at_one_gauss_in_megahertz_range(), cyclotron_frequency_scales_linearly_with_b(), fit_function_decays_exponentially_at_large_x(), fit_function_diverges_via_inverse_two_thirds_at_small_x() (+4 more)

### Community 29 - "TypeScript Compiler Config"

Cohesion: 0.09
Nodes (21): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+13 more)

### Community 30 - "Error & Normalization Types"

Cohesion: 0.16
Nodes (16): Display, Error, Formatter, invariants, NormalizationError, renormalize_null(), renormalize_timelike(), ROUNDING_TOLERANCE (+8 more)

### Community 31 - "Control Panel Shell"

Cohesion: 0.19
Nodes (10): get_state_derivative(), M, adaptive_rkf45_step(), M, step_rk4(), step_symplectic(), GeodesicState, integrate() (+2 more)

### Community 32 - "Hardware Detection & Tiers"

Cohesion: 0.19
Nodes (13): CompatibilityHUD(), HardwareSupport, useHardwareSupport(), MobileOptimizationConfig, useMobileOptimization(), buildDeviceProfile(), detectGPUVendor(), getHardwareInfo() (+5 more)

### Community 33 - "Geodesic Termination Logic"

Cohesion: 0.14
Nodes (14): christoffel_from_metric_derivs, compute_constants, constantsofmotion, geodesic, kerr, metrictensor4, numericalaudit, equatorial_null_ray() (+6 more)

### Community 34 - "Synchrotron Plasma Physics"

Cohesion: 0.17
Nodes (14): hawking, hawking_spectrum_planck(), hawking_temperature(), wien_peak_frequency(), extremal_kerr_temperature_is_zero(), planck_handles_large_exponent_without_nan(), planck_low_frequency_rayleigh_jeans_limit(), planck_peaks_near_wien_frequency() (+6 more)

### Community 35 - "Feature Flags & Presets"

Cohesion: 0.11
Nodes (19): scripts, build, build:vercel, build:wasm, clean, dev, dev:watch, format (+11 more)

### Community 36 - "Metric Tensor Algebra"

Cohesion: 0.23
Nodes (11): getMaxRaySteps(), getMobilePreset(), getPreset(), matchesPreset(), PERFORMANCE_PRESETS, usePresets(), applyPreset(), FEATURE_COSTS (+3 more)

### Community 37 - "Error Boundary UI"

Cohesion: 0.12
Nodes (10): ANALYTIC_TOLERANCE, bardeen_r_isco_prograde(), bardeen_r_isco_retrograde(), DRIFT_THRESHOLD, MASS_M, REGRESSION_SPIN_GRID, STEP_COUNT, isco_prograde_matches_bardeen_across_spin_grid() (+2 more)

### Community 38 - "Bloom Post-Processing"

Cohesion: 0.16
Nodes (7): Index, MetricTensor4, Self, test_diagonal_metric(), test_minkowski_determinant(), test_raise_index(), super

### Community 39 - "GLSL Shader Chunks"

Cohesion: 0.14
Nodes (6): ErrorBoundary, Props, State, ErrorCategoryInfo, ErrorDisplay(), ErrorDisplayProps

### Community 41 - "Adaptive Resolution Controller"

Cohesion: 0.17
Nodes (11): get_state_derivative, Option, Vec, Trajectory, TerminationReason, plunge_trajectory(), plunge_advances_inward(), plunge_at_zero_spin_starts_at_six_m() (+3 more)

### Community 42 - "Vercel Deploy Config"

Cohesion: 0.20
Nodes (15): alpha_thermal_synchrotron(), band_emissivity_and_absorption(), ELECTRON_CHARGE_ESU, ELECTRON_MASS_GRAM, j_thermal_synchrotron(), planck_cgs(), PlasmaState, Vec (+7 more)

### Community 43 - "SAB Memory Layout"

Cohesion: 0.22
Nodes (8): PHYSICS_CONSTANTS, BACKGROUND_CHUNK, BLACKBODY_CHUNK, COMMON_CHUNK, DISK_CHUNK, METRIC_CHUNK, NOISE_CHUNK, fragmentShaderSource

### Community 44 - "Physics SI Constants"

Cohesion: 0.27
Nodes (13): angular_velocity(), generate_temperature_lut(), page_thorne_flux(), Vec, specific_angular_momentum(), specific_energy(), temperature(), temperature_profile() (+5 more)

### Community 45 - "Lensing & Shadow Optics"

Cohesion: 0.22
Nodes (10): liveCamera, NOTE: bloomEffective, not the raw toggle — when bloom is shed the, NOTE: Sampler uniforms MUST be set with integer calls (set/uniform1i),, WebGLError, vertexShaderSource, createBlueNoiseTexture(), createNoiseTexture(), createTextureFromData() (+2 more)

### Community 46 - "Worker SAB Protocol"

Cohesion: 0.23
Nodes (13): computeOverallProgress(), determineOptimalPreset(), ProfileStage, setStage(), STAGE_LABELS, STAGE_WEIGHTS, STAGES_IN_ORDER, SystemProfile (+5 more)

### Community 47 - "System Profile & Presets"

Cohesion: 0.22
Nodes (8): IMPORTANT: Only emit #define when feature is ENABLED., ShaderVariant, reprojectionFragmentShader, reprojectionVertexShader, createProgram(), createQuadBuffer(), createShader(), getSharedQuadBuffer()

### Community 48 - "Stress Test & Shader Mocks"

Cohesion: 0.14
Nodes (13): build, env, buildCommand, cleanUrls, crons, CARGO_BUILD_JOBS, RUSTFLAGS, framework (+5 more)

### Community 49 - "Vercel Build Config"

Cohesion: 0.15
Nodes (11): coordinatesystem, physics, OFFSET_CAMERA, OFFSET_CONTROL, OFFSET_LUTS, OFFSET_PHYSICS, OFFSET_TELEMETRY, _SHADOW_CURVE_FITS (+3 more)

### Community 50 - "SAB Offset Definitions"

Cohesion: 0.15
Nodes (12): C, G, PLANCK_LENGTH, RS_SOLAR_METERS, SI_C, SI_G, SI_H, SI_HBAR (+4 more)

### Community 51 - "Shadow Curve Kernels"

Cohesion: 0.26
Nodes (10): bardeen_shadow(), critical_params(), CriticalOrbitParams, einstein_angle(), Vec, schwarzschild_shadow_radius(), test_einstein_angle_scaling(), test_kerr_shadow_is_asymmetric() (+2 more)

### Community 52 - "Project Identity Concepts"

Cohesion: 0.17
Nodes (12): Rust Physics Kernel WASM, SharedArrayBuffer v2 Protocol, Duplicated Physics Constants, Spectral Basis Functions LUT, WASM Engine Build Step, Gravitas Core Library, Kretschmann Scalar Curvature, Gravitas WASM Bridge (+4 more)

### Community 53 - "Kerr Metric Unit Tests"

Cohesion: 0.26
Nodes (7): frac_pi_2, Self, test_event_horizon(), test_extreme_kerr_isco(), test_hamiltonian_consistency_bl_vs_ks(), test_photon_sphere(), test_schwarzschild_isco()

### Community 54 - "Runtime Dependencies"

Cohesion: 0.17
Nodes (12): dependencies, framer-motion, gl-matrix, lucide-react, next, react, react-dom, @react-three/drei (+4 more)

### Community 56 - "Performance Config & Monitor"

Cohesion: 0.29
Nodes (8): PERFORMANCE_CONFIG, GOVERNOR_STEP_DOWN_FPS, GOVERNOR_STEP_UP_FPS, GovernorAction, GovernorQuality, governorStep(), PerformanceWarning, QUALITY_LADDER

### Community 57 - "Camera Touch & Damping"

Cohesion: 0.24
Nodes (5): useControlHandlers(), calculateInitialZoom(), clampAndValidate(), isValidNumber(), isWithinCanvasBounds()

### Community 60 - "Spectral Bands & Opacity"

Cohesion: 0.29
Nodes (6): BloomConfig, DEFAULT_BLOOM_CONFIG, bloomVertexShader, blurShader, brightPassShader, combineShader

### Community 62 - "Spacetime Embedding Geometry"

Cohesion: 0.31
Nodes (6): Default, AdaptiveStepper, GeodesicKind, IntegrationMethod, IntegrationOptions, Self

### Community 63 - "Architecture Concept Hub"

Cohesion: 0.28
Nodes (6): DQuat, DVec3, CameraInput, CameraState, Self, update_camera()

### Community 64 - "WASM LUT Generators"

Cohesion: 0.31
Nodes (8): Band, BAND_BROADBAND, BANDS_3_INDICES, BANDS_5, OPTICAL_DEPTH_FLOOR, wavelength_metres(), wavelength_eht_band_in_millimetre_range(), wavelength_optical_band_near_600_nm()

### Community 65 - "Timelike Renormalization Tests"

Cohesion: 0.25
Nodes (8): Adaptive RKF45 Precise Geodesics, Hybrid Integrator Strategy, Zero-Copy Reactive Data Pipeline, Curvature-Adaptive Stepping, Kerr-Schild Coordinates, Ambient Background Music Transcript, Interactive Black Hole Simulation, Kerr-Schild Metric Horizon Stability

### Community 67 - "Temporal Reprojection"

Cohesion: 0.39
Nodes (7): hamiltonian(), M, build_radial_timelike_state(), null_renormalize_pins_state_on_h_zero_shell(), TIGHT, timelike_renormalize_pins_state_on_h_minus_half_shell(), timelike_renormalize_works_at_kerr_moderate_spin()

### Community 71 - "SAB Bounds Tests"

Cohesion: 0.33
Nodes (4): analytic_photon_sphere_prograde(), photon_sphere_matches_bardeen_across_spin_grid(), PHOTON_SPHERE_TOLERANCE, regression_spin_grid

### Community 72 - "PWA Manifest & Identity"

Cohesion: 0.38
Nodes (4): CinematicOverlay, CinematicOverlay, CinematicOverlayProps, ViewpointDef

### Community 73 - "Image Diff Tooling"

Cohesion: 0.29
Nodes (6): frames, stabilization_frames, version, viewport, height, width

### Community 75 - "System Profile Screen"

Cohesion: 0.33
Nodes (5): OFFSET_CAMERA, OFFSET_CONTROL, OFFSET_LUTS, OFFSET_PHYSICS, OFFSET_TELEMETRY

### Community 76 - "Constants of Motion"

Cohesion: 0.33
Nodes (5): pixelmatch, pngjs, ssim.js, diffPng(), DiffResult

### Community 77 - "Curvature Invariants"

Cohesion: 0.40
Nodes (6): luminous edge-on accretion disk with golden dust and lensing arcs, central black hole shadow with gravitational lensing halo, opengraph-image.jpg social sharing OG cover image, SEO and discoverability purpose for app route metadata, social link preview purpose for Open Graph sharing, dark starfield space background with centered symmetric composition

### Community 78 - "Frame Dragging Field"

Cohesion: 0.60
Nodes (4): compute_constants(), ConstantsOfMotion, Complex64, M

### Community 79 - "Light Cone Tilt"

Cohesion: 0.50
Nodes (3): curvature_field(), kretschner_kerr(), Vec

### Community 80 - "Christoffel Symbols"

Cohesion: 0.60
Nodes (4): light_cone_tilt(), M, Vec, tilt_field()

### Community 81 - "App Touch Icon"

Cohesion: 0.80
Nodes (4): christoffel_from_metric_derivs(), metric_derivative_r(), metric_derivative_theta(), M

### Community 82 - "Starmap Texture"

Cohesion: 0.50
Nodes (5): Accretion Disk Motif, Apple Touch Icon, Black Hole Depiction, iOS Home Screen Icon Purpose, Minimalist Monochrome Design

### Community 83 - "Cinematic Overlay UI"

Cohesion: 0.50
Nodes (5): Role as celestial reference and space scene background texture, Equirectangular panoramic projection for skybox mapping, Milky Way galactic band arching across dark sky, Dense starfield with varied brightness stars on black background, Starmap equirectangular texture depicting night sky with Milky Way

### Community 85 - "Test Storage Shim"

Cohesion: 0.40
Nodes (3): localStorageImpl, MapBackedStorage, sessionStorageImpl

### Community 86 - "EXR Conversion Script"

Cohesion: 0.50
Nodes (3): cv2, numpy, os

### Community 89 - "Milky Way 4K Texture"

Cohesion: 0.67
Nodes (4): Black Hole with Accretion Disk and Lensing Arc Motif, Brand Logo - Stylized Black Hole, Project Brand Identity Purpose for Blackhole Remote, High-Contrast Monochrome Brushstroke Design Decision

### Community 90 - "Milky Way Texture Role"

Cohesion: 0.67
Nodes (4): Equirectangular 3D environment background texture role for immersive space scene, Milky Way galactic plane band with dust lanes galactic center and Magellanic clouds, Milky Way 2020 4K equirectangular starfield texture, Differs from uniform starfield by structured galactic band dust and bright core versus sparse stars

### Community 91 - "Performance Module Hub"

Cohesion: 0.67
Nodes (4): 3D scene environment skybox background texture role, Equirectangular panoramic starfield with bright horizontal galactic band and dark poles, Milky Way galactic plane with central dust lanes star clouds and red emission nebulae, Milky Way starfield texture image

### Community 92 - "Benchmark & Test Strategy"

Cohesion: 0.50
Nodes (4): BenchmarkController, Performance Module, PerformanceMonitor, runStressTest

### Community 93 - "Future Research Roadmap"

Cohesion: 0.67
Nodes (3): Cognitive Supervisor Entropy Scheduler, Extended Kalman Filter Camera Prediction, Neural Radiance Surrogates Roadmap

### Community 95 - "Git Hooks & CI"

Cohesion: 0.67
Nodes (3): Production Pipeline Hybrid WASM Web, Conventional Commits Lint, Lefthook Git Hooks

### Community 96 - "Next.js Configuration"

Cohesion: 0.67
Nodes (3): engines, bun, node

## Ambiguous Edges - Review These

- `Interactive Black Hole Simulation` → `Ambient Background Music Transcript` [AMBIGUOUS]
  graphify-out/transcripts/background-music.txt · relation: conceptually_related_to

## Knowledge Gaps

- **342 isolated node(s):** `CameraPose`, `DiveFrame`, `DwellDriftStep`, `DwellOrbitStep`, `OrbitFrame` (+337 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 676 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **39 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Interactive Black Hole Simulation` and `Ambient Background Music Transcript`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `react` connect `Audio & Brand Icon UI` to `WebGL/WebGPU Rendering Stack`, `Hardware Detection & Tiers`, `Camera Rig & Cinematic State`, `WebGPU Renderer Core`, `Site Metadata & Layout`, `Metric Tensor Algebra`, `Hawking Thermodynamics UI`, `GLSL Shader Chunks`, `PWA Manifest & Identity`, `TypeScript Type Packages`, `Benchmark Results UI`, `Control Panel Features Tab`, `Worker SAB Protocol`, `App Shell HUD & Debug`, `Geodesic Integrator Steps`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Why does `vitest` connect `WebGL Uniform Management` to `WebGL/WebGPU Rendering Stack`, `Hardware Detection & Tiers`, `Geodesic Conservation Tests`, `Metric Tensor Algebra`, `Visual Regression Harness`, `Hawking Thermodynamics UI`, `TypeScript Type Packages`, `Benchmark Results UI`, `Settings Storage Layer`, `URL Hash State`, `Idle Activity Tracking`, `Performance Config & Monitor`, `Camera Touch & Damping`, `Adaptive RKF45 Stepper`, `Geodesic Integrator Steps`, `Spectral Bands & Opacity`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `Kerr` connect `Metric Tensor Components` to `Temporal Reprojection`, `Blackbody Radiation Constants`, `Adaptive Resolution Controller`, `ISCO & Plunge Orbits`, `Physics SI Constants`, `Hamiltonian Mechanics`, `WASM Engine API Surface`, `Shadow Curve Kernels`, `Kerr Metric Unit Tests`, `Magnetosphere Wald Field Tests`, `Error & Normalization Types`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `CameraPose`, `DiveFrame`, `DwellDriftStep` to the rest of the system?**
  _342 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `WebGL/WebGPU Rendering Stack` be split into smaller, more focused modules?**
  _Cohesion score 0.05641025641025641 - nodes in this community are weakly interconnected._
- **Should `Polarization Stokes Calculus` be split into smaller, more focused modules?**
  _Cohesion score 0.055272108843537414 - nodes in this community are weakly interconnected._
