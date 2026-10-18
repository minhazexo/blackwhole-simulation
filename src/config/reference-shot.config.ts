/**
 * "Reference shot" composition.
 *
 * One place for every artistic constant that shapes the opening image, so the
 * scene is tuned against the reference frame instead of accumulating magic
 * numbers in the renderer, the shaders, and the page defaults.
 *
 * The reference frame (public/Space.jpg, 640x400, 16:10) is:
 *   - a pitch-black circular shadow, roughly 28-32% of the viewport height,
 *     centred just above the middle of the frame;
 *   - a gold-orange accretion disk crossing the frame diagonally at ~20-25d
 *     (lower-left to upper-right), its lensed far side arcing over the shadow
 *     and its near side passing in front of it;
 *   - a dense, photographic star field with visible dust lanes.
 *
 * Everything here is a *composition* input. Physical parameters (mass, spin,
 * ISCO, Doppler beaming, Novikov-Thorne temperature) remain untouched: the
 * disk still runs on the real Kerr ray marcher.
 */
import type { FeatureToggles } from "@/types/features";
import { SIMULATION_CONFIG } from "@/config/simulation.config";

export const REFERENCE_SHOT = {
  /**
   * Camera. `distance` is in Schwarzschild radii of observer distance and is
   * multiplied by 2 before reaching the shader (u_zoom = distance * 2), which
   * is the same convention the zoom slider uses.
   *
   * distance 30  -> u_zoom 60  -> shadow ~28% of a 16:10 frame's height.
   */
  camera: {
    distance: 34,
    /** Polar angle in degrees (90 = exactly in the disk plane). Slightly
     *  above the plane so the far side of the disk lifts over the shadow. */
    verticalAngleDeg: 95.5,
    /** Screen tilt of the disk axis, degrees. Positive raises the right side. */
    rollDeg: 22,
  },

  /** Disk appearance at the reference framing. */
  disk: {
    /** Base temperature. The Doppler-shifted inner edge peaks near white-gold. */
    temperatureK: 5600,
    /** Optical density multiplier (0-5 in the UI). */
    density: 4.5,
    /** Physical outer radius in M. The visible edge fades well inside this. */
    size: 50,
    /** H/R scale height. Thin enough for a crisp edge-on silhouette. */
    scaleHeight: 0.1,
    /** Linear HDR exposure of the disk emission. */
    gain: 8.0,
  },

  /** Sky exposure. */
  sky: {
    /** Gain applied to the linearised Milky Way plate. */
    gain: 1.35,
  },

  /** Lensing strength (eta) at the reference framing. */
  lensingStrength: 1.0,
} as const;

/**
 * Feature set for the reference shot: the High Quality preset, minus the
 * relativistic jets (there are none in the reference frame, and a bright
 * blue bipolar jet beside the disk breaks the composition). Lensing, disk,
 * stars, photon-ring glow, Doppler beaming, and bloom stay on; ray tracing
 * stays at High so turbulence and star detail survive.
 */
export const REFERENCE_SHOT_FEATURES: FeatureToggles = {
  ...SIMULATION_CONFIG.presets["high-quality"],
  relativisticJets: false,
};
