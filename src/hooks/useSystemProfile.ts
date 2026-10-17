/**
 * useSystemProfile – Startup Device Calibration Hook
 *
 * Orchestrates the initial device capability detection, offscreen stress
 * test, preset recommendation, and signals readiness so the root-level
 * loading gate (SystemProfileScreen) can dismiss.
 *
 * Unlike the previous chained-effects approach, this hook uses a single
 * orchestration effect that awaits each step sequentially, avoiding the
 * race conditions inherent to cascade-style React state updates.
 */

import { useState, useEffect, useRef } from "react";
import { runStressTest, type StressTestResult } from "@/performance/stress-test";
import { buildDeviceProfile, type DeviceCapabilityProfile } from "@/utils/device-detection";
import { PERFORMANCE_CONFIG } from "@/config/performance.config";
import { DEFAULT_PRESET_MODE } from "@/config/simulation.config";
import type { PresetName, FeatureToggles } from "@/types/features";
import { getPreset } from "@/config/feature-flags";

export type ProfileStage =
  | "detecting-hardware"
  | "running-stress-test"
  | "optimizing-settings"
  | "loading-physics"
  | "ready"
  | "error";

export interface ProfileStageInfo {
  stage: ProfileStage;
  /** Human-readable label shown in the loading UI */
  label: string;
  /** Normalised progress for this stage (0–1) */
  stageProgress: number;
  /** Overall progress across all stages (0–1) */
  overallProgress: number;
  /** Any error message for the error stage */
  errorMessage?: string;
}

export interface SystemProfile {
  /** Device capability snapshot */
  capability: DeviceCapabilityProfile | null;
  /** Stress test result (null if not yet completed) */
  stressTest: StressTestResult | null;
  /** Recommended preset discovered through calibration */
  recommendedPreset: PresetName;
  /** Features corresponding to the recommended preset */
  recommendedFeatures: FeatureToggles;
  /** Current stage of the calibration pipeline */
  stage: ProfileStage;
}

/** Weight of each stage toward the overall progress bar. Sums to 1.0. */
const STAGE_WEIGHTS: Record<ProfileStage, number> = {
  "detecting-hardware": 0.15,
  "running-stress-test": 0.40,
  "optimizing-settings": 0.10,
  "loading-physics": 0.35,
  ready: 1.0,
  error: 1.0,
};

const STAGES_IN_ORDER: ProfileStage[] = [
  "detecting-hardware",
  "running-stress-test",
  "optimizing-settings",
  "loading-physics",
  "ready",
];

const STAGE_LABELS: Record<ProfileStage, string> = {
  "detecting-hardware": "Detecting Hardware",
  "running-stress-test": "Running Stress Test",
  "optimizing-settings": "Optimising Settings",
  "loading-physics": "Loading Physics Engine",
  ready: "System Calibration Complete",
  error: "Calibration Error",
};

function computeOverallProgress(
  stage: ProfileStage,
  stageProgress: number,
): number {
  let accumulated = 0;
  for (const s of STAGES_IN_ORDER) {
    if (s === stage) {
      return accumulated + (STAGE_WEIGHTS[s] ?? 0) * stageProgress;
    }
    if (s === "ready") break;
    accumulated += STAGE_WEIGHTS[s] ?? 0;
  }
  return accumulated;
}

function setStage(
  stage: ProfileStage,
  stageProgress: number,
  errorMessage?: string,
): ProfileStageInfo {
  return {
    stage,
    label: STAGE_LABELS[stage] ?? stage,
    stageProgress,
    overallProgress: computeOverallProgress(stage, stageProgress),
    errorMessage,
  };
}

export function useSystemProfile() {
  const [profile, setProfile] = useState<SystemProfile>({
    capability: null,
    stressTest: null,
    recommendedPreset: DEFAULT_PRESET_MODE,
    recommendedFeatures: getPreset(DEFAULT_PRESET_MODE),
    stage: "detecting-hardware",
  });

  const [stageInfo, setStageInfo] = useState<ProfileStageInfo>(
    setStage("detecting-hardware", 0),
  );

  // Track whether the component is still mounted to avoid state updates
  // after unmount.
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Single orchestration function that runs all stages sequentially.
    async function calibrate() {
      // Yield to a macrotask before starting. Two reasons: (1) dev
      // StrictMode runs mount effects, cleanups, and re-mounts back to
      // back — starting synchronously lets the dead mount's probe block
      // the thread and resolve anyway, producing a SECOND preset that a
      // per-mount guard cannot stop (each mount has fresh refs). With the
      // yield, the dead mount's cleanup flips its flag first and it aborts
      // before measuring. (2) It lets WASM download + canvas init settle
      // so the probe measures the GPU, not boot contention.
      await new Promise<void>((r) => setTimeout(r, 250));
      if (!mountedRef.current) return;
      try {
        // ── Stage 1: Detect hardware ──
        const probeCanvas = document.createElement("canvas");
        probeCanvas.width = 1;
        probeCanvas.height = 1;

        const gl = probeCanvas.getContext("webgl2", {
          alpha: false,
          depth: false,
          stencil: false,
          antialias: false,
          powerPreference: "high-performance",
          preserveDrawingBuffer: false,
        });

        if (!mountedRef.current) return;

        // Update progress to 50% of this stage (context acquired)
        setStageInfo(setStage("detecting-hardware", 0.5));

        const capability = buildDeviceProfile(gl);

        if (!mountedRef.current) return;
        setProfile((prev) => ({ ...prev, capability }));
        setStageInfo(setStage("detecting-hardware", 1.0));

        // ── Stage 2: Run stress test ──
        if (!mountedRef.current) return;
        setProfile((prev) => ({ ...prev, stage: "running-stress-test" }));
        setStageInfo(setStage("running-stress-test", 0));

        const stressTest = await runStressTest();

        if (!mountedRef.current) return;
        setProfile((prev) => ({ ...prev, stressTest }));
        setStageInfo(setStage("running-stress-test", 1.0));

        // ── Stage 3: Determine optimal preset ──
        if (!mountedRef.current) return;
        setProfile((prev) => ({ ...prev, stage: "optimizing-settings" }));
        setStageInfo(setStage("optimizing-settings", 0));

        const recommended = determineOptimalPreset(capability, stressTest);
        const features = getPreset(recommended);

        if (!mountedRef.current) return;
        setProfile((prev) => ({
          ...prev,
          recommendedPreset: recommended,
          recommendedFeatures: features,
        }));
        setStageInfo(setStage("optimizing-settings", 1.0));

        // ── Stage 4: Signal ready ──
        // (Physics init is handled by page.tsx's existing effect, which
        //  runs in parallel with this calibration.)
        if (!mountedRef.current) return;
        setProfile((prev) => ({
          ...prev,
          stage: "ready",
        }));
        setStageInfo(setStage("ready", 1.0));
      } catch (err) {
        if (!mountedRef.current) return;
        const msg = err instanceof Error ? err.message : String(err);
        setProfile((prev) => ({ ...prev, stage: "ready" }));
        setStageInfo(setStage("ready", 1.0, msg));
      }
    }

    calibrate();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isReady = profile.stage === "ready";

  return {
    profile,
    stageInfo,
    isReady,
  };
}

/**
 * Determine the optimal quality preset based on hardware info and
 * stress test results.
 */
function determineOptimalPreset(
  capability: DeviceCapabilityProfile | null,
  stressTest: StressTestResult | null,
): PresetName {
  const cfg = PERFORMANCE_CONFIG.startup;

  // ── Fallback: no reliable stress test → default to the project preset ──
  // (high-quality / photo-1). The runtime governor still steps down if the
  // device genuinely cannot sustain it, so this is safe on weaker hardware.
  if (!stressTest?.reliable) {
    if (capability?.isMobile) {
      return "balanced";
    }
    return DEFAULT_PRESET_MODE;
  }

  // ── Use stress test FPS thresholds ──
  const avgFps = stressTest.averageFPS;
  let recommended: PresetName = DEFAULT_PRESET_MODE;

  if (avgFps >= cfg.ultraThreshold) {
    recommended = "ultra-quality";
  } else if (avgFps >= cfg.highThreshold) {
    recommended = "high-quality";
  } else if (avgFps < cfg.balancedThreshold) {
    // Genuinely too slow even for the balanced probe rung.
    recommended = "balanced";
  }
  // Otherwise (balancedThreshold ≤ fps < highThreshold): keep the default
  // high-quality preset and let the runtime governor fine-tune/rescue.

  // ── Mobile / integrated GPU hard cap ──
  if (capability?.isMobile || capability?.hasIntegratedGPU) {
    if (recommended === "ultra-quality") {
      recommended = "high-quality";
    } else if (recommended === "high-quality") {
      recommended = "balanced";
    }
  }

  return recommended;
}
