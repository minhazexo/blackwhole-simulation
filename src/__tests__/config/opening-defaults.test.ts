/**
 * Deterministic opening state guards.
 *
 * The site must open on High Quality with High ray tracing, with Auto-Tune
 * off, regardless of hardware calibration. Any future change that makes the
 * first paint depend on a stress-test recommendation should fail here.
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_PRESET_MODE,
  SIMULATION_CONFIG,
} from "@/config/simulation.config";
import { getPreset } from "@/config/feature-flags";
import { DEFAULT_PARAMS } from "@/types/simulation";

describe("opening defaults", () => {
  it("opens on the high-quality preset", () => {
    expect(DEFAULT_PRESET_MODE).toBe("high-quality");
    expect(DEFAULT_PARAMS.performancePreset).toBe("high-quality");
  });

  it("opens with the high ray-tracing rung", () => {
    expect(getPreset(DEFAULT_PRESET_MODE).rayTracingQuality).toBe("high");
    expect(DEFAULT_PARAMS.features?.rayTracingQuality).toBe("high");
    expect(SIMULATION_CONFIG.presets["high-quality"].rayTracingQuality).toBe(
      "high",
    );
  });

  it("opens with Auto-Tune off", () => {
    expect(DEFAULT_PARAMS.adaptiveResolution).toBe(false);
  });
});
