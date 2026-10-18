/**
 * Cinematic viewpoint catalog invariants.
 *
 * The tour's job is to put every stop in a frame the visitor can actually
 * read, together with correct physics copy. These tests pin both sides:
 *
 *  - every viewpoint is fully described (name, subtitle, description, facts);
 *  - every camera pose is inside the accepted ranges and, crucially, outside
 *    the shader's inner clamp and the disk's inner edge, so a stop can never
 *    render an all-black frame (r = zoom * 2 in units of M, see the shader's
 *    `length(ro) < rh * 1.5` kamikaze guard).
 */

import { describe, it, expect } from "vitest";
import {
  TOUR_DWELL_SECONDS,
  VIEWPOINTS,
  getDefaultViewpoint,
  getViewpoint,
} from "@/config/viewpoints.config";
import { iscoRadius, horizonRadius, photonSphere } from "@/physics/kerr";
import { MAX_ZOOM, MIN_ZOOM } from "@/hooks/camera/types";

const M = 1;
const A_STAR = 0.5; // default spin the fact strings are written against

describe("viewpoint catalog", () => {
  it("ships at least the twelve tour scenes", () => {
    expect(VIEWPOINTS.length).toBeGreaterThanOrEqual(12);
  });

  it("has unique ids", () => {
    const ids = VIEWPOINTS.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("describes every scene completely", () => {
    for (const vp of VIEWPOINTS) {
      expect(vp.id.length, "id").toBeGreaterThan(0);
      expect(vp.name.length, `${vp.id} name`).toBeGreaterThan(0);
      expect(vp.subtitle.length, `${vp.id} subtitle`).toBeGreaterThan(0);
      expect(vp.description.length, `${vp.id} description`).toBeGreaterThan(30);
      expect(vp.facts.length, `${vp.id} facts`).toBeGreaterThanOrEqual(3);
      for (const fact of vp.facts) {
        expect(fact.trim().length, `${vp.id} fact`).toBeGreaterThan(10);
      }
      expect(vp.hue).toBeGreaterThanOrEqual(0);
      expect(vp.hue).toBeLessThan(360);
      expect(vp.duration).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps every camera pose in range", () => {
    for (const vp of VIEWPOINTS) {
      const { theta, phi, zoom } = vp.camera;
      expect(Number.isFinite(theta), `${vp.id} theta`).toBe(true);
      expect(theta).toBeGreaterThanOrEqual(0);
      expect(theta).toBeLessThanOrEqual(Math.PI * 2);
      expect(phi).toBeGreaterThan(0);
      expect(phi).toBeLessThan(Math.PI);
      expect(zoom).toBeGreaterThanOrEqual(MIN_ZOOM);
      expect(zoom).toBeLessThanOrEqual(MAX_ZOOM);
    }
  });

  it("places every camera outside the horizon clamp and the disk edge", () => {
    const horizon = horizonRadius(M, A_STAR);
    const isco = iscoRadius(M, A_STAR, true);
    const photon = photonSphere(M, A_STAR, true);

    for (const vp of VIEWPOINTS) {
      // The shader receives r = zoom * 2 * M, and yanks any origin closer
      // than rh * 1.5 back out to it.
      const r = vp.camera.zoom * 2 * M;
      expect(r, `${vp.id} above the horizon clamp`).toBeGreaterThan(
        horizon * 1.5,
      );
      expect(r, `${vp.id} outside the disk inner edge`).toBeGreaterThan(isco);
      expect(horizon).toBeLessThan(photon);
    }
  });

  it("gives orbit scenes a positive angular speed", () => {
    for (const vp of VIEWPOINTS) {
      if (vp.animation.type === "orbit") {
        expect(vp.animation.speed, `${vp.id} orbit speed`).toBeGreaterThan(0);
      }
    }
  });

  it("dwells long enough to read each scene", () => {
    // Description lands at ~0.5s and the last fact at ~0.8s.
    expect(TOUR_DWELL_SECONDS).toBeGreaterThanOrEqual(8);
    expect(TOUR_DWELL_SECONDS).toBeLessThanOrEqual(60);
  });

  it("resolves viewpoints by id", () => {
    for (const vp of VIEWPOINTS) {
      expect(getViewpoint(vp.id)).toBe(vp);
    }
    expect(getViewpoint("does-not-exist")).toBeUndefined();
    expect(getDefaultViewpoint()).toBe(VIEWPOINTS[0]);
  });
});
