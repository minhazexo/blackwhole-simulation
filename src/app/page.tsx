"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, Compass } from "lucide-react";
import { WebGLCanvas } from "@/components/canvas/WebGLCanvas";
import { WebGPUCanvas } from "@/components/canvas/WebGPUCanvas";
import ErrorBoundary from "@/components/debug/ErrorBoundary";
import { IdentityHUD } from "@/components/ui/IdentityHUD";
import { CompatibilityHUD } from "@/components/ui/CompatibilityHUD";
import { useHardwareSupport } from "@/hooks/useHardwareSupport";

// Dynamic Imports for Performance Optimization (SEO)
const ControlPanel = dynamic(
  () => import("@/components/ui/ControlPanel").then((mod) => mod.ControlPanel),
  { ssr: false },
);
const Telemetry = dynamic(
  () => import("@/components/ui/Telemetry").then((mod) => mod.Telemetry),
  { ssr: false },
);
const SimulationInfo = dynamic(
  () =>
    import("@/components/ui/SimulationInfo").then((mod) => mod.SimulationInfo),
  { ssr: true },
);
const BenchmarkResults = dynamic(
  () =>
    import("@/components/ui/BenchmarkResults").then(
      (mod) => mod.BenchmarkResults,
    ),
  { ssr: false },
);
const DebugOverlay = dynamic(
  () => import("@/components/ui/DebugOverlay").then((mod) => mod.DebugOverlay),
  { ssr: false },
);
const CinematicOverlay = dynamic(
  () =>
    import("@/components/ui/CinematicOverlay").then(
      (mod) => mod.CinematicOverlay,
    ),
  { ssr: false },
);
const SpacetimeCanvas = dynamic(
  () => import("@/components/spacetime").then((mod) => mod.SpacetimeCanvas),
  { ssr: false },
);
const HawkingSpectrumPanel = dynamic(
  () =>
    import("@/components/quantum/HawkingSpectrumPanel").then(
      (mod) => mod.HawkingSpectrumPanel,
    ),
  { ssr: false },
);
const BekensteinHawkingReadout = dynamic(
  () =>
    import("@/components/quantum/BekensteinHawkingReadout").then(
      (mod) => mod.BekensteinHawkingReadout,
    ),
  { ssr: false },
);

import { useCamera } from "@/hooks/useCamera";
import { useBenchmark } from "@/hooks/useBenchmark";
import { useKeyboard } from "@/hooks/useKeyboard";
import { useUrlState } from "@/hooks/useUrlState";

import { useMobileOptimization } from "@/hooks/useMobileOptimization";
import { usePresets } from "@/hooks/usePresets";
import { type SimulationParams, DEFAULT_PARAMS } from "@/types/simulation";
import type { PerformanceMetrics } from "@/performance/monitor";
import type { DebugMetrics } from "@/components/ui/DebugOverlay";
import { DEFAULT_PRESET_MODE } from "@/config/simulation.config";
import { getPreset } from "@/config/feature-flags";
import type { RayTracingQuality } from "@/types/features";
import { settingsStorage } from "@/storage/settings";
import { REFERENCE_SHOT_FEATURES } from "@/config/reference-shot.config";
import { useWebGPUSupport } from "@/hooks/useWebGPUSupport";
import { useAudio } from "@/hooks/useAudio";
import { SOLAR_MASS } from "@/physics/constants";
import { WasmLoadingOverlay } from "@/components/ui/WasmLoadingOverlay";
import { PhysicsGuide } from "@/seo/PhysicsGuide";

const App = () => {
  const { isMobile } = useMobileOptimization();
  const { applyPreset } = usePresets();
  const { isSupported: isWebGPUSupported } = useWebGPUSupport();
  const hardwareSupport = useHardwareSupport();

  const [params, setParams] = useState<SimulationParams>(() => {
    // Deterministic opening state: High Quality preset (High ray tracing)
    // and Auto-Tune off. Nothing recalibrates this after mount, so the first
    // paint and the scene a minute later use the same quality rung.
    // Reference-shot composition: High Quality feature set without jets, so
    // the opening frame matches public/Space.jpg. Camera framing, roll, and
    // disk appearance come from DEFAULT_PARAMS (reference-shot.config.ts).
    return {
      ...DEFAULT_PARAMS,
      features: { ...REFERENCE_SHOT_FEATURES },
      performancePreset: DEFAULT_PRESET_MODE,
      // Auto-Tune starts OFF: the opening view keeps the High Quality preset
      // and its High ray-tracing rung instead of being stepped down by the
      // startup calibration/governor. Users can opt in from Performance.
    };
  });

  // Phase 7: URL hash state.
  useUrlState(params, setParams);

  const [showUI, setShowUI] = useState(true);
  const [metrics, setMetrics] = useState<PerformanceMetrics | undefined>(
    undefined,
  );
  const [isCompact, setIsCompact] = useState(true);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  // WASM compilation loading state. Starts true, flips to false when
  // physicsBridge.isReady() confirms the worker + WASM are operational.
  const [physicsReady, setPhysicsReady] = useState(false);
  // Visible (dismissible) degraded-mode error. Set on init failure or when
  // the bridge reports a stalled/degraded worker; cleared on dismiss.
  const [physicsError, setPhysicsError] = useState<string | null>(null);

  // Phase 5: Extracted benchmark logic into dedicated hook
  const {
    benchmarkReport,
    showBenchmarkResults,
    setShowBenchmarkResults,
    isBenchmarkRunning,
    benchmarkPreset,
    benchmarkProgress,
    startBenchmark,
    cancelBenchmark,
    applyRecommendedPreset,
  } = useBenchmark(params, setParams, metrics, applyPreset);

  // Stable metrics handler: skip React re-render when the incoming
  // metrics are visually identical (same rounded FPS / quality /
  // resolution). The renderer pushes at 2Hz; without this guard every
  // push reconciles the entire App tree even when nothing changed.
  const handleMetricsUpdate = useCallback((next: PerformanceMetrics) => {
    setMetrics((prev) => {
      if (
        prev &&
        prev.currentFPS === next.currentFPS &&
        prev.rollingAverageFPS === next.rollingAverageFPS &&
        prev.quality === next.quality &&
        Math.abs(prev.renderResolution - next.renderResolution) < 0.001
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  // Runtime quality-governor signal from the renderer (fires ≤0.4Hz).
  // Changes ONLY the ray-tracing rung and deliberately preserves the
  // performancePreset label: flipping the preset badge on every auto-tune
  // reads as "presets changing by themselves". The Quality buttons +
  // Telemetry still show the true active rung.
  const handleQualityGovernor = useCallback((q: RayTracingQuality) => {
    setParams((prev) => {
      if (prev.features?.rayTracingQuality === q) return prev;
      const base =
        prev.features ?? getPreset(prev.performancePreset ?? "balanced");
      return { ...prev, features: { ...base, rayTracingQuality: q } };
    });
  }, []);

  // Reduced-blur mode with hysteresis: backdrop-blur re-rasterizes the
  // fullscreen canvas backdrop every frame, which alone can cost 10-20fps
  // on integrated/mobile GPUs. Enter below 40fps rolling average, exit
  // above 48fps (hysteresis prevents flapping at the boundary). Mobile is
  // always degraded: blur(20-50px) glass over a ray-marched canvas is the
  // single biggest mobile GPU cost outside the shader itself.
  // Initialized false to match SSR (isMobile reads navigator/window, which
  // don't exist server-side). The effect below converges to the true value
  // immediately after hydration — one frame of full blur at most.
  const [perfDegraded, setPerfDegraded] = useState(false);
  useEffect(() => {
    const avg = metrics?.rollingAverageFPS ?? 0;
    setPerfDegraded((prev) => {
      if (isMobile) return true;
      if (!prev && avg > 0 && avg < 40) return true;
      if (prev && avg > 48) return false;
      return prev;
    });
  }, [metrics?.rollingAverageFPS, isMobile]);

  useEffect(() => {
    if (params.features) {
      settingsStorage.saveFeatures(params.features);
    }
    settingsStorage.savePreset(params.performancePreset ?? "ultra-quality");
  }, [params.features, params.performancePreset]);

  const {
    mouse,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    nudgeCamera,
    startCinematic,
    startViewpoint,
    startAllViewpointsTour,
    stopCinematic,
    resetCamera,
    isCinematic,
    cinematicMode,
    currentViewpointId,
    currentViewpointDef,
    tourIndex,
    tourTotal,
    nextViewpoint,
    prevViewpoint,
    toggleTourPause,
    tourPaused,
  } = useCamera(params, setParams);

  // Phase 9.5: Debug Overlay
  const [showDebug, setShowDebug] = useState(false);
  const toggleDebug = useCallback(() => setShowDebug((prev) => !prev), []);

  // Quantum visualization toggle (illustrative, per ADR-0026). Default
  // off; the operator opts in via the keyboard shortcut Q. The panels
  // render Bekenstein-Hawking thermodynamics (entropy, area, T_H,
  // evaporation lifetime) and the Planck-shape Hawking spectrum.
  const [showQuantum, setShowQuantum] = useState(false);
  // Stellar-mass default for the readout: 10 M_sun gives T_H ≈ 6e-9 K
  // and a plot peak in the radio band, which makes the operator's
  // "quantum effects" overlay visually meaningful at any spin.
  const QUANTUM_DEMO_MASS_KG = 10 * SOLAR_MASS;

  // Phase 7: Keyboard shortcuts for accessibility
  useKeyboard({
    setParams,
    applyPreset,
    setShowUI,
    nudgeCamera,
    toggleDebug,
    stopCinematic,
    isTourActive: cinematicMode === "viewpoints-tour",
    onTourNext: nextViewpoint,
    onTourPrev: prevViewpoint,
    onToggleTourPause: toggleTourPause,
  });

  // Phase 6: WebGPU Support Hook
  const [useWebGPU, setUseWebGPU] = useState(false);
  const [forceShowCompat, setForceShowCompat] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const requested = urlParams.get("webgpu") === "true";

      if (urlParams.get("debug_hud") === "true") {
        setForceShowCompat(true);
      }

      // If WebGL is software-only (CPU rendering), prefer WebGPU if available.
      // Software WebGL (llvmpipe/SwiftShader) runs at ~10-15 FPS for ray marching.
      const effectiveWebGPU = hardwareSupport.isSoftwareWebGL
        ? (isWebGPUSupported ?? false)
        : (isWebGPUSupported ?? false);

      if (requested && effectiveWebGPU) {
        setUseWebGPU(true);
      } else if (hardwareSupport.isSoftwareWebGL && effectiveWebGPU) {
        // Auto-enable WebGPU when software WebGL is detected
        setUseWebGPU(true);
      } else {
        setUseWebGPU(false);
      }
    }
  }, [isWebGPUSupported, hardwareSupport.isSoftwareWebGL]);

  // SELF-HEALING: If hardware IS supported, force-hide the HUD and clean URL
  useEffect(() => {
    if (
      hardwareSupport.webgl &&
      !hardwareSupport.isSoftwareWebGL &&
      forceShowCompat
    ) {
      setForceShowCompat(false);
      const url = new URL(window.location.href);
      url.searchParams.delete("debug_hud");
      window.history.replaceState({}, "", url.toString());
    }
  }, [hardwareSupport.webgl, hardwareSupport.isSoftwareWebGL, forceShowCompat]);

  useEffect(() => {
    let cancelled = false;
    // Trigger Physics Bridge Initialization
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { physicsBridge } = require("@/engine/physics-bridge");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    physicsBridge.ensureInitialized().catch((err: any) => {
      if (cancelled) return;
      // eslint-disable-next-line no-console
      console.error("Critical Physics Initialization Failure:", err);
      // Dismiss loading overlay on failure so the user sees the canvas
      // (which falls back to Schwarzschild approximations), but surface a
      // dismissible degraded-mode banner with the failure reason.
      setPhysicsError(String(err?.message || err));
      setPhysicsReady(true);
    });

    // Subscribe to bridge status: a stalled worker flips to "degraded".
    // Keep the canvas visible (physicsReady stays true) and show the banner.
    const unsubscribeStatus = physicsBridge.onStatusChange((status: string) => {
      if (cancelled) return;
      if (status === "degraded") {
        const detail = physicsBridge.getLastWorkerError();
        setPhysicsError(
          detail
            ? `Physics worker stalled — ${detail}`
            : "Physics worker stalled — telemetry frozen; retry to restart",
        );
      }
    });

    // Safety timeout: dismiss loading overlay after 15s even if WASM
    // fails silently, so the user can interact with the canvas in
    // fallback mode rather than being trapped at a spinner.
    const safetyTimeout = setTimeout(() => {
      if (!cancelled) setPhysicsReady(true);
    }, 15000);

    // Poll physicsBridge.isReady() so the loading overlay can disappear
    // once the worker acknowledges WASM initialization.
    const pollInterval = setInterval(() => {
      if (cancelled) return;
      if (physicsBridge.isReady()) {
        setPhysicsReady(true);
        clearInterval(pollInterval);
        clearTimeout(safetyTimeout);
      }
    }, 200);

    // Wire visibility listener and capture its teardown function so it
    // is cleaned up on unmount (fixes issue 2.4: event listener leak).
    const detachVisibility = physicsBridge.attachVisibilityListener();

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
      clearTimeout(safetyTimeout);
      detachVisibility();
      unsubscribeStatus();
    };
  }, [isWebGPUSupported]);

  // ── Background Audio ──
  const {
    isPlaying: audioPlaying,
    volume: audioVolume,
    toggle: onAudioToggle,
    setVolume: onAudioVolumeChange,
    handleInteraction: handleAudioInteraction,
  } = useAudio();

  // Stable callbacks for memoized overlays (inline closures would defeat
  // their memo on every App render).
  const handleWasmDismiss = useCallback(async () => {
    // Retry: restart the worker, then clear the banner on success.
    // On failure keep the banner (status already flips to "failed").
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { physicsBridge } = require("@/engine/physics-bridge");
      await physicsBridge.restartWorker();
      setPhysicsError(null);
    } catch {
      // Keep banner visible; bridge status is already "failed".
    }
  }, []);
  const handleBenchmarkClose = useCallback(
    () => setShowBenchmarkResults(false),
    [setShowBenchmarkResults],
  );
  // Stable DebugOverlay metrics object (was rebuilt inline every render,
  // defeating memoization downstream).
  const debugMetrics = useMemo<DebugMetrics>(
    () =>
      metrics
        ? {
            ...metrics,
            totalFrameTimeMs: metrics.frameTimeMs,
          }
        : {
            totalFrameTimeMs: 0,
            frameTimeMs: 0,
            currentFPS: 0,
            rollingAverageFPS: 0,
            quality: "medium",
            renderResolution: 1,
          },
    [metrics],
  );

  return (
    <div
      className="relative w-full h-screen bg-black overflow-hidden select-none font-sans text-white"
      data-perf-degraded={perfDegraded ? "true" : "false"}
      onClick={handleAudioInteraction}
      onTouchStart={handleAudioInteraction}
    >
      {/* WASM compilation loading overlay. Hides once the physics bridge
          acknowledges the worker + Rust kernel are operational. Shows a
          dismissible degraded-mode banner when physicsError is set. */}
      <WasmLoadingOverlay
        visible={!physicsReady || physicsError !== null}
        error={physicsError}
        onDismiss={handleWasmDismiss}
      />

      {(forceShowCompat ||
        (hardwareSupport.isReady && !hardwareSupport.webgl)) && (
        <CompatibilityHUD />
      )}

      <ErrorBoundary>
        {/* Wait for hardware detection before mounting any canvas: otherwise
            WebGL mounts immediately and is torn down seconds later when
            detection resolves (WebGPU switch, software fallback) — a full
            recompile + black flash right at startup. The WASM loading
            overlay already covers the screen meanwhile, so this is free. */}
        {!hardwareSupport.isReady ? (
          <div className="absolute inset-0 z-0 bg-black" />
        ) : params.features?.spacetimeVisualization ? (
          <SpacetimeCanvas
            mass={params.mass}
            spin={params.spin}
            className="absolute inset-0 z-0"
          />
        ) : useWebGPU ? (
          <WebGPUCanvas
            params={params}
            mouse={mouse}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMetricsUpdate={handleMetricsUpdate}
          />
        ) : (
          <WebGLCanvas
            params={params}
            mouse={mouse}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMetricsUpdate={handleMetricsUpdate}
            onQualityChange={handleQualityGovernor}
          />
        )}

        {/* SEO: Hidden physics guide for crawlers */}
        <PhysicsGuide />

        <AnimatePresence>
          {showUI && !isInfoExpanded && !(isMobile && !isCompact) && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-0 left-0 w-full p-4 md:p-8 flex justify-between items-start z-50 pointer-events-none"
            >
              {/* SLEEK IDENTITY HUD */}
              <IdentityHUD
                isCinematic={isCinematic}
                cinematicMode={cinematicMode}
              />

              <Telemetry params={params} metrics={metrics} />
            </motion.div>
          )}
        </AnimatePresence>

        <CinematicOverlay
          isCinematic={isCinematic}
          zoom={params.zoom}
          cinematicMode={cinematicMode}
          currentViewpointDef={currentViewpointDef}
          tourIndex={tourIndex}
          tourTotal={tourTotal}
          spin={params.spin}
          mass={params.mass}
          tourPaused={tourPaused}
          onPrevViewpoint={prevViewpoint}
          onNextViewpoint={nextViewpoint}
          onToggleTourPause={toggleTourPause}
          onExitTour={stopCinematic}
        />

        {showQuantum && (
          <div className="absolute top-24 right-4 z-40 flex flex-col gap-2 w-72 max-w-[40vw] pointer-events-auto">
            <button
              type="button"
              onClick={() => setShowQuantum(false)}
              className="self-end text-[8px] uppercase tracking-[0.2em] text-white/50 hover:text-white/90 font-mono"
              aria-label="Close quantum effects panel"
            >
              close ×
            </button>
            <BekensteinHawkingReadout
              massKg={QUANTUM_DEMO_MASS_KG}
              spinStar={params.spin}
            />
            <HawkingSpectrumPanel
              massKg={QUANTUM_DEMO_MASS_KG}
              spinStar={params.spin}
            />
          </div>
        )}

        {!showQuantum && (
          <button
            type="button"
            onClick={() => setShowQuantum(true)}
            className="absolute top-24 right-4 z-30 px-3 py-1.5 bg-black/30 border border-white/10 rounded-sm text-[9px] font-mono uppercase tracking-[0.2em] text-white/60 hover:text-white/90 hover:border-white/30 transition-colors"
            aria-label="Open quantum effects visualization panel (illustrative)"
          >
            Quantum effects
          </button>
        )}

        <ControlPanel
          params={params}
          onParamsChange={setParams}
          showUI={showUI && !isInfoExpanded}
          onToggleUI={setShowUI}
          isCompact={isCompact}
          onCompactChange={setIsCompact}
          onStartBenchmark={startBenchmark}
          onCancelBenchmark={cancelBenchmark}
          isBenchmarkRunning={isBenchmarkRunning}
          onStartCinematic={startCinematic}
          onStartViewpoint={startViewpoint}
          onStartAllViewpointsTour={startAllViewpointsTour}
          onResetCamera={resetCamera}
          isCinematic={isCinematic}
          cinematicMode={cinematicMode}
          currentViewpointId={currentViewpointId}
          tourIndex={tourIndex}
          tourTotal={tourTotal}
          audioPlaying={audioPlaying}
          audioVolume={audioVolume}
          onAudioToggle={onAudioToggle}
          onAudioVolumeChange={onAudioVolumeChange}
        />

        <SimulationInfo
          isVisible={showUI && isCompact}
          isExpanded={isInfoExpanded}
          onToggleExpanded={setIsInfoExpanded}
        />

        {physicsReady && showUI && !isCinematic && isCompact && (
          <motion.div
            id="cinematic"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.5, ease: "easeOut" }}
            className="fixed top-1/2 left-4 -translate-y-1/2 z-40 sm:left-8"
          >
            <button
              onClick={startAllViewpointsTour}
              className="group relative flex items-center gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full border border-white/20 bg-black/60 backdrop-blur-md hover:bg-white/10 hover:border-accent-cyan/40 transition-all active:scale-95 shadow-xl"
              aria-label="Start guided tour of black hole viewpoints"
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-accent-cyan/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent-cyan group-hover:text-accent-cyan transition-colors" />
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] text-white/90 group-hover:text-white transition-colors">
                Take A Tour
              </span>
            </button>
          </motion.div>
        )}

        {!showUI && (
          <div className="absolute bottom-8 right-8 z-30 animate-fade-in">
            <button
              onClick={() => setShowUI(true)}
              className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full p-3 hover:bg-white/10 transition-all active:scale-95 shadow-lg group"
            >
              <ChevronUp className="w-5 h-5 text-white/80 group-hover:text-white transition-colors" />
            </button>
          </div>
        )}

        <AnimatePresence>
          {isBenchmarkRunning && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div className="relative group overflow-hidden rounded-full liquid-glass border border-white/10 shadow-2xl p-2.5 px-6 flex items-center gap-4">
                  {/* Liquid Glass Infrastructure */}
                  <div className="absolute inset-0 liquid-glass-highlight z-1 pointer-events-none" />
                  <div className="absolute inset-x-0 top-0 liquid-glass-top-line z-30" />

                  <div className="relative z-40 flex items-center gap-4">
                    <div className="w-2.5 h-2.5 rounded-full border border-white/20 border-t-white animate-spin shrink-0" />
                    <span className="text-white text-[9.5px] font-black uppercase tracking-[0.2em] leading-none">
                      Optimizing{" "}
                      {benchmarkPreset?.replace("-", " ") ||
                        "Global Parameters"}
                    </span>
                    <span className="text-white/40 text-[8px] font-mono font-black">
                      {Math.round(benchmarkProgress * 100)}%
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {showBenchmarkResults && benchmarkReport && (
          <BenchmarkResults
            report={benchmarkReport}
            onClose={handleBenchmarkClose}
            onApplyRecommended={applyRecommendedPreset}
          />
        )}

        {/* Debug Overlay */}
        <DebugOverlay
          enabled={showDebug}
          onToggle={setShowDebug}
          metrics={debugMetrics}
          backend={useWebGPU ? "WebGPU" : "WebGL (CPU)"}
        />
      </ErrorBoundary>
    </div>
  );
};

export default App;
