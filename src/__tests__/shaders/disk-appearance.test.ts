/**
 * Regression tests for the accretion-disk appearance model.
 *
 * The disk used to be coloured by a single global slider colour, so the whole
 * disk read as silver at high temperatures even though the reference frame
 * (public/Disk Data/Blackwhole.jpg) is a warm gold ribbon with a white-hot
 * rim. The photon ring used to be a hard-coded saturated orange ellipse.
 * These tests lock in the model that reproduces the reference frame.
 */

import { describe, it, expect } from "vitest";
import { DISK_CHUNK } from "@/shaders/blackhole/chunks/disk";
import { fragmentShaderSource } from "@/shaders/blackhole/fragment.glsl";
import { REFERENCE_SHOT } from "@/config/reference-shot.config";
import { DEFAULT_PARAMS } from "@/types/simulation";

function readAnchor(name: string): [number, number, number] {
  const match = DISK_CHUNK.match(
    new RegExp(`vec3\\s+${name}\\s*=\\s*vec3\\(([^)]+)\\)`),
  );
  const raw = match && match[1];
  expect(raw, `ramp anchor "${name}" not found`).toBeTypeOf("string");
  const parts = String(raw)
    .split(",")
    .map((v) => Number.parseFloat(v.trim()));
  expect(parts).toHaveLength(3);
  const [r, g, b] = parts;
  if (r === undefined || g === undefined || b === undefined) {
    throw new Error(`ramp anchor "${name}" is malformed`);
  }
  return [r, g, b];
}

describe("accretion disk colour model", () => {
  it("keeps the blackbody ramp ordered red -> orange -> yellow -> white", () => {
    const red = readAnchor("red");
    const orange = readAnchor("orange");
    const yellow = readAnchor("yellow");
    const white = readAnchor("white");

    // Each step warms: the green channel rises all the way to the white
    // anchor, which is what keeps the ramp a blackbody progression.
    expect(orange[1]).toBeGreaterThan(red[1]);
    expect(yellow[1]).toBeGreaterThan(orange[1]);
    expect(white[1]).toBeGreaterThan(yellow[1]);
    expect(white[0]).toBeGreaterThanOrEqual(0.99);
  });

  it("keeps the hot anchor warm so clipped highlights do not render silver", () => {
    const white = readAnchor("white");
    // A neutral (or blue) white anchor desaturates to silver in the tone
    // mapper; the reference frame's hottest pixels are warm (252, 247, 225).
    expect(white[0]).toBeGreaterThan(0.95);
    expect(white[1]).toBeGreaterThan(0.85);
    expect(white[2]).toBeLessThan(0.9);
  });

  it("colours the disk from the local (radial) temperature", () => {
    expect(DISK_CHUNK).toContain("radialTempGradient");
    expect(DISK_CHUNK).toContain("localTemp");
    // The old model mixed one global slider colour into the whole disk.
    expect(DISK_CHUNK).not.toContain("localColorInfluence");
    expect(DISK_CHUNK).not.toContain("globalTemperatureColor");
  });

  it("does not draw the photon ring as a saturated orange ellipse", () => {
    expect(fragmentShaderSource).not.toContain("vec3(0.92, 0.24, 0.05)");
    expect(fragmentShaderSource).toContain("photonTint");
  });
});

describe("reference-shot disk composition", () => {
  it("opens on the reference frame's disk temperature", () => {
    expect(REFERENCE_SHOT.disk.temperatureK).toBe(10000);
    expect(DEFAULT_PARAMS.diskTemp).toBe(REFERENCE_SHOT.disk.temperatureK);
  });

  it("keeps the disk exposure inside the band that does not clip the rim", () => {
    // The strands are thin and sparse, so the disk needs a high exposure to
    // reach the reference frame's brightness; the bound keeps the hottest
    // pixels just above the ACES knee instead of clipping every highlight to
    // white (which is what turned the disk silver instead of gold).
    expect(REFERENCE_SHOT.disk.gain).toBeGreaterThan(8);
    expect(REFERENCE_SHOT.disk.gain).toBeLessThanOrEqual(32);
  });

  it("places the photon ring on the critical impact parameter", () => {
    // The ring is the lensed image of the photon sphere, so it belongs on the
    // shadow's edge (the critical impact parameter). Measuring it from the
    // ray's final position made the rim flicker and disappear.
    expect(fragmentShaderSource).toContain("kerr_shadow_radius");
    expect(fragmentShaderSource).not.toContain("distToPhotonRing");
  });

  it("derives the page defaults from the reference-shot composition", () => {
    expect(DEFAULT_PARAMS.diskSize).toBe(REFERENCE_SHOT.disk.size);
    expect(DEFAULT_PARAMS.diskScaleHeight).toBe(
      REFERENCE_SHOT.disk.scaleHeight,
    );
  });
});
