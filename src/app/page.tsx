"use client";

import { useState, useEffect, useCallback } from "react";
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

import { useAdaptiveResolution } from "@/hooks/useAdaptiveResolution";
import { useMobileOptimization } from "@/hooks/useMobileOptimization";
import { usePresets } from "@/hooks/usePresets";
import { type SimulationParams, DEFAULT_PARAMS } from "@/types/simulation";
import type { PerformanceMetrics } from "@/performance/monitor";
import type { DebugMetrics } from "@/components/ui/DebugOverlay";
import { getPreset, type PresetName } from "@/types/features";
import { settingsStorage } from "@/storage/settings";
import { useWebGPUSupport } from "@/hooks/useWebGPUSupport";
import { useSystemProfile } from "@/hooks/useSystemProfile";
import { useAudio } from "@/hooks/useAudio";
import { SystemProfileScreen } from "@/components/ui/SystemProfileScreen";
import { WasmLoadingOverlay } from "@/components/ui/WasmLoadingOverlay";
import { PhysicsGuide } from "@/components/seo/PhysicsGuide";

const App = () => {
  // ── System Profile (Root-level loading gate) ──
  // Runs hardware detection, stress test, and preset recommendation
  // before the main canvas mounts.
  const { profile, stageInfo, isReady: profileReady } = useSystemProfile();

  const { isMobile } = useMobileOptimization();
  const { applyPreset } = usePresets();
  const { isSupported: isWebGPUSupported } = useWebGPUSupport();
  const hardwareSupport = useHardwareSupport();

  const [params, setParams] = useState<SimulationParams>(() => {
    // Start with conservative defaults until the system profile
    // completes and recommends the optimal preset.
    const balancedFeatures = getPreset("balanced");
    return {
      ...DEFAULT_PARAMS,
      quality: balancedFeatures.rayTracingQuality,
      features: balancedFeatures,
      performancePreset: "balanced",
      adaptiveResolution: true,
    };
  });

  // When the system profile completes, apply the recommended preset.
  // This overwrites the conservative defaults above.
  useEffect(() => {
    if (profileReady && profile.recommendedFeatures) {
      setParams((prev) => ({
        ...prev,
        quality: profile.recommendedFeatures.rayTracingQuality,
        features: profile.recommendedFeatures,
        performancePreset: profile.recommendedPreset,
      }));
    }
  }, [profileReady, profile.recommendedPreset, profile.recommendedFeatures]);

  const [showUI, setShowUI] = useState(true);
  const [metrics, setMetrics] = useState<PerformanceMetrics | undefined>(
    undefined,
  );
  const [isCompact, setIsCompact] = useState(true);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  // WASM compilation loading state. Starts true, flips to false when
  // physicsBridge.isReady() confirms the worker + WASM are operational.
  const [physicsReady, setPhysicsReady] = useState(false);

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

  useAdaptiveResolution(metrics?.currentFPS || 60, {
    enabled: params.adaptiveResolution,
    onResolutionChange: (scale) => {
      setParams((prev) => ({ ...prev, renderScale: scale }));
    },
  });

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
  const QUANTUM_DEMO_MASS_KG = 10 * 1.98847e30;

  // Phase 7: Keyboard shortcuts for accessibility
  useKeyboard({
    setParams,
    applyPreset,
    setShowUI,
    nudgeCamera,
    toggleDebug,
    stopCinematic,
  });

  // Phase 7: URL hash state for shareable simulation links
  useUrlState(params, setParams);

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

      if (requested && isWebGPUSupported !== false) {
        setUseWebGPU(true);
      } else {
        setUseWebGPU(false);
      }
    }
  }, [isWebGPUSupported]);

  // SELF-HEALING: If hardware IS supported, force-hide the HUD and clean URL
  useEffect(() => {
    if (hardwareSupport.webgl && forceShowCompat) {
      setForceShowCompat(false);
      const url = new URL(window.location.href);
      url.searchParams.delete("debug_hud");
      window.history.replaceState({}, "", url.toString());
    }
  }, [hardwareSupport.webgl, forceShowCompat]);

  useEffect(() => {
    // Trigger Physics Bridge Initialization
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { physicsBridge } = require("@/engine/physics-bridge");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    physicsBridge.ensureInitialized().catch((err: any) => {
      // eslint-disable-next-line no-console
      console.error("Critical Physics Initialization Failure:", err);
      // Dismiss loading overlay on failure so the user sees the canvas
      // (which falls back to Schwarzschild approximations).
      setPhysicsReady(true);
    });

    // Safety timeout: dismiss loading overlay after 15s even if WASM
    // fails silently, so the user can interact with the canvas in
    // fallback mode rather than being trapped at a spinner.
    const safetyTimeout = setTimeout(() => setPhysicsReady(true), 15000);

    // Poll physicsBridge.isReady() so the loading overlay can disappear
    // once the worker acknowledges WASM initialization.
    const pollInterval = setInterval(() => {
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
      clearInterval(pollInterval);
      clearTimeout(safetyTimeout);
      detachVisibility();
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

  return (
    <div
      className="relative w-full h-screen bg-black overflow-hidden select-none font-sans text-white"
      onClick={handleAudioInteraction}
      onTouchStart={handleAudioInteraction}
    >
      {/* WASM compilation loading overlay. Hides once the physics bridge
          acknowledges the worker + Rust kernel are operational. */}
      <WasmLoadingOverlay visible={!physicsReady} />

      {(forceShowCompat ||
        (hardwareSupport.isReady && !hardwareSupport.webgl)) && (
        <CompatibilityHUD />
      )}

      <ErrorBoundary>
        {params.features?.spacetimeVisualization ? (
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
            onMetricsUpdate={setMetrics}
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
            onMetricsUpdate={setMetrics}
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
            onClose={() => setShowBenchmarkResults(false)}
            onApplyRecommended={applyRecommendedPreset}
          />
        )}

        {/* Debug Overlay */}
        <DebugOverlay
          enabled={showDebug}
          onToggle={setShowDebug}
          metrics={
            metrics
              ? ({
                  ...metrics,
                  totalFrameTimeMs: metrics.frameTimeMs,
                } as DebugMetrics)
              : ({
                  totalFrameTimeMs: 0,
                  currentFPS: 0,
                  rollingAverageFPS: 0,
                  renderResolution: 1,
                } as DebugMetrics)
          }
          backend={useWebGPU ? "WebGPU" : "WebGL (CPU)"}
        />
      </ErrorBoundary>
    </div>
  );
};

export default App;
