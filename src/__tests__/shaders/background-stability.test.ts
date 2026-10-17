/**
 * Regression guards for the stationary-background fix.
 *
 * The sky used to slide for two reasons: a nonzero default camera auto-spin,
 * and time terms inside the star/nebula sampling. These tests pin the
 * intended behavior: stars and gas are a pure function of view direction,
 * while the disk and twinkle keep animating from u_time.
 */

import { describe, it, expect } from "vitest";
import { SIMULATION_CONFIG } from "@/config/simulation.config";
import { DEFAULT_PARAMS } from "@/types/simulation";
import { BACKGROUND_CHUNK } from "@/shaders/blackhole/chunks/background";

describe("stationary background", () => {
  it("ships with camera auto-spin disabled by default", () => {
    expect(SIMULATION_CONFIG.autoSpin.default).toBe(0);
    expect(DEFAULT_PARAMS.autoSpin).toBe(0);
    // Users can still opt in through the control panel.
    expect(SIMULATION_CONFIG.autoSpin.max).toBeGreaterThan(0);
  });

  it("anchors star cells to the view direction only", () => {
    expect(BACKGROUND_CHUNK).not.toContain("pmOffset");
    expect(BACKGROUND_CHUNK).toContain(
      "vec3 gridPos = dir * gridScale + gridOffset;",
    );
  });

  it("samples nebula noise without time offsets", () => {
    expect(BACKGROUND_CHUNK).not.toMatch(/warpedPos\d?\s*=[^;]*u_time/);
  });

  it("keeps twinkle separate from star positions", () => {
    // Twinkle is a brightness term (allowed to animate) applied after the
    // cell/position hashes, never a coordinate offset.
    expect(BACKGROUND_CHUNK).toMatch(/twinkle\s*=\s*0\.88\s*\+/);
  });
});
