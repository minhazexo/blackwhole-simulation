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
    // Stars live on a cube-face grid projected from the ray direction, and
    // every hash input is built from that cell + face id — never time.
    expect(BACKGROUND_CHUNK).toContain(
      "vec2 fuv = cubeFaceCoord(dir, faceId);",
    );
    expect(BACKGROUND_CHUNK).toContain(
      "hash(vec3(cell, faceId * 31.0 + seed))",
    );
    expect(BACKGROUND_CHUNK).not.toMatch(/hash\([^)]*u_time/);
  });

  it("samples the sky plate without time offsets", () => {
    // Only the twinkle term may read u_time; the plate lookup and the star
    // hashes must be a pure function of direction.
    const plateStart = BACKGROUND_CHUNK.indexOf("vec3 sampleSkyPlate");
    const plateEnd = BACKGROUND_CHUNK.indexOf("// Smooth star color");
    expect(plateStart).toBeGreaterThan(-1);
    expect(plateEnd).toBeGreaterThan(plateStart);
    expect(BACKGROUND_CHUNK.slice(plateStart, plateEnd)).not.toMatch(/u_time/);
  });

  it("keeps twinkle separate from star positions", () => {
    // Twinkle is a brightness term (allowed to animate) applied after the
    // cell/position hashes, never a coordinate offset.
    expect(BACKGROUND_CHUNK).toMatch(
      /twinkle\s*=\s*0\.955\s*\+\s*0\.045\s*\*\s*sin\(/,
    );
    expect(BACKGROUND_CHUNK).toContain("col * bright * shape * twinkle");
  });
});
