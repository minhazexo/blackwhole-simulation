/**
 * "Reference shot" composition.
 *
 * One place for every artistic constant that shapes the opening image, so the
 * scene is tuned against the reference frame instead of accumulating magic
 * numbers in the renderer, the shaders, and the page defaults.
 *
 * The reference frame (public/Disk Data/Blackwhole.jpg, 4500x3000) measures:
 *   - mean luminance ~21, 64.6% of the pixels below luma 6, 20.3% warm pixels
 *     (luma > 25);
 *   - top 5% luminous pixels avg RGB (217, 177, 143), top 1% (252, 247, 225):
 *     a warm cream ribbon, never a neutral silver;
 *   - a pitch-black shadow whose limb diameter is ~29.5% of the frame height
 *     (885 px of 3000), centred just above the middle of the frame;
 *   - a gold-orange accretion disk crossing the frame diagonally at ~12 deg
 *     (lower-left to upper-right), its lensed far side arcing over the shadow
 *     and its near side passing in front of it, with hair-like filaments and
 *     dark channels between the strands;
 *   - a very subtle, near-black sky in the reference frame (this app keeps
 *     its own photographic plate and procedural stars untouched).
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
   * distance 34  -> u_zoom 68  -> shadow limb diameter ~20% of the frame
   * height (220 px of 1080, measured in the live render at that zoom).
   */
  camera: {
    distance: 34,
    /** Polar angle in degrees (90 = exactly in the disk plane). Slightly
     *  above the plane so the far side of the disk lifts over the shadow. */
    verticalAngleDeg: 95.5,
    /** Screen tilt of the disk axis, degrees. Positive raises the right side. */
    rollDeg: 22,
    /**
     * Extra tilt applied to the accretion disk only, degrees. The sky is
     * counter-rotated when it is sampled, so the star field keeps the
     * camera's own orientation while the disk takes the reference frame's
     * ~12 degree angle.
     */
    diskRollDeg: -9,
  },

  /** Disk appearance at the reference framing. */
  disk: {
    /** Inner-edge (ISCO) temperature. The disk cools outward from here, so
     *  the rim is white-hot, the middle gold and the outer band orange. */
    temperatureK: 10000,
    /** Optical density multiplier (0-5 in the UI). */
    density: 5.0,
    /** Physical outer radius in M. The visible edge fades well inside this. */
    size: 40,
    /** H/R scale height. Thin enough for a crisp edge-on silhouette: the
     *  reference frame's strands are separated by genuinely dark channels,
     *  which only happens when the sight line crosses less than one strand
     *  period inside the disk's density layer. */
    scaleHeight: 0.024,
    /**
     * Linear HDR exposure of the disk emission. The strands are thin and
     * sparse, so the exposure has to be high for the disk to reach the
     * reference frame's brightness (mean luminance of the bright pixels
     * ~110-135, top 1% at 252, 247, 225) without the tone mapper clipping
     * the highlights to white: the emission of a single strand peaks around
     * 4-8 in linear light, which sits just above the ACES knee.
     */
    gain: 28.0,
  },

  /** Sky exposure. */
  sky: {
    /** Gain applied to the linearised Milky Way plate. Tuned so the space
     *  matches public/textures/Background.jpg at its natural brightness. */
    gain: 0.3,
    /**
     * Procedural star density. Kept subtle so the photographic plate from
     * public/textures/Background.jpg remains the dominant sky feature.
     */
    starDensity: 0.2,
  },

  /** Lensing strength (eta) at the reference framing. */
  lensingStrength: 0.5,
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
