import { clampAndValidate, isValidNumber } from "@/utils/validation";
import { SCHWARZSCHILD_RADIUS_SOLAR } from "@/physics/constants";
import {
  ACCRETION_DISK_OUTER_RADIUS_MULTIPLIER,
  DEFAULT_VERTICAL_ANGLE,
  DEFAULT_ZOOM,
  FOV_DEGREES,
  MAX_ZOOM,
  MIN_ZOOM,
  TARGET_VIEWPORT_COVERAGE,
} from "./types";

/**
 * Pure keyframe / easing math for the cinematic camera sequences.
 *
 * Every function here is pure: it takes (t, params) and returns a pose or
 * per-frame deltas. All ref mutation, setParams calls, and phase transitions
 * stay in the composer's animation loop.
 */

// --- Durations (relocated verbatim from the animation loop) ---
/** Seconds spent easing back to the pre-cinematic pose after a sequence ends. */
export const RECOVER_DURATION = 3.5;
/** Seconds spent flying from the current pose to a viewpoint target. */
export const VIEWPOINT_FLY_DURATION = 4.0;
/** Hard cap (seconds) for the orbit tour before it auto-recovers. */
export const ORBIT_MAX_DURATION = 120.0;

/** Camera pose in spherical coordinates + distance. */
export interface CameraPose {
  theta: number;
  phi: number;
  zoom: number;
}

/** Per-frame orbit keyframe targets for the 4-act grand survey. */
export interface OrbitFrame {
  targetDist: number;
  targetPhi: number;
  orbitSpeed: number;
  minSafe: number;
}

/** Organic handheld feel layered on top of the orbit keyframes. */
export interface OrbitFeel {
  breathe: number;
  wobbleX: number;
  wobbleY: number;
}

/** Per-frame dive dynamics for the 3-act infall. */
export interface DiveFrame {
  gravityScale: number;
  phiDriftRate: number;
  thetaWobble: number;
  phiWobble: number;
}

/** Per-frame deltas for a dwelling orbit-type viewpoint (slow majestic orbit). */
export interface DwellOrbitStep {
  dTheta: number;
  dPhi: number;
  breathe: number;
}

/** Per-frame deltas for a dwelling drift-type viewpoint (gentle meditative drift). */
export interface DwellDriftStep {
  dTheta: number;
  dPhi: number;
  pulse: number;
}

/**
 * Hermite smoothstep for act transitions (no pops or sudden changes).
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const v = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return v * v * (3 - 2 * v);
}

/**
 * Quartic ease-in-out: smooth acceleration then deceleration (viewpoint fly).
 */
export function quarticEaseInOut(progress: number): number {
  return progress < 0.5
    ? 8 * progress * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 4) / 2;
}

/**
 * Quartic ease-out: stronger initial pull, very gentle deceleration (recovery).
 */
export function quarticEaseOut(progress: number): number {
  return 1.0 - Math.pow(1.0 - progress, 4);
}

/**
 * Accelerating convergence rate for the post-cinematic recovery.
 */
export function recoveryLerpRate(ease: number): number {
  return 0.05 + ease * 0.06;
}

/**
 * Shortest signed angular distance from `from` to `to` (wraps at ±π).
 */
export function shortestAngularDelta(from: number, to: number): number {
  let diff = ((to - from + Math.PI) % (2 * Math.PI)) - Math.PI;
  if (diff < -Math.PI) diff += 2 * Math.PI;
  return diff;
}

/**
 * Interpolated pose for the viewpoint fly phase.
 * Theta follows the shortest angular path, phi interpolates linearly,
 * and zoom interpolates exponentially for a natural feel.
 */
export function computeViewpointFlyPose(
  start: CameraPose,
  target: CameraPose,
  ease: number,
): CameraPose {
  const theta =
    start.theta + shortestAngularDelta(start.theta, target.theta) * ease;
  const phi = start.phi + (target.phi - start.phi) * ease;
  const zoomRatio = target.zoom / Math.max(start.zoom, 0.01);
  const zoom = start.zoom * Math.pow(zoomRatio, ease);
  return { theta, phi, zoom };
}

/**
 * Per-frame deltas for a dwelling orbit-type viewpoint:
 * slow majestic orbit + subtle breathing oscillation + organic micro-wobble.
 */
export function orbitDwellStep(
  dwellT: number,
  speed: number,
  dt: number,
): DwellOrbitStep {
  const dTheta =
    dt * speed +
    Math.sin(dwellT * 0.31) * 0.003 +
    Math.cos(dwellT * 0.17) * 0.002;
  const dPhi =
    Math.cos(dwellT * 0.23) * 0.002 + Math.sin(dwellT * 0.41) * 0.001;
  const breathe = Math.sin(dwellT * 0.5) * 0.1;
  return { dTheta, dPhi, breathe };
}

/**
 * Per-frame deltas for a dwelling drift-type viewpoint:
 * gentle meditative drift + very subtle zoom pulse.
 */
export function driftDwellStep(dwellT: number): DwellDriftStep {
  const dTheta = Math.sin(dwellT * 0.2) * 0.004;
  const dPhi = Math.cos(dwellT * 0.15) * 0.003;
  const pulse = Math.sin(dwellT * 0.3) * 0.002;
  return { dTheta, dPhi, pulse };
}

/**
 * 4-act orbit keyframes for "THE GRAND SURVEY".
 * Act 1: The Reveal (0-15s). Act 2: The Descent & Sweep (15-45s).
 * Act 3: The Close Pass (45-75s). Act 4: The Contemplation (75-120s).
 * Keplerian speed variation, dramatic vertical sweeps, and zoom breathing.
 */
export function computeOrbitFrame(t: number, mass: number): OrbitFrame {
  const ACT1_END = 15.0; // The Reveal
  const ACT2_END = 45.0; // The Descent & Sweep
  const ACT3_END = 75.0; // The Close Pass
  // ACT4: 75 - 120       // The Contemplation

  let targetDist: number;
  let targetPhi: number;
  let orbitSpeed: number;

  const minSafe = Math.max(15.0, mass * 3.5);

  if (t < ACT1_END) {
    // ACT 1: THE REVEAL -- Pull back to wide establishing shot
    // Camera rises above the disk (low phi = looking down)
    const actProgress = t / ACT1_END;
    const easeIn = smoothstep(0, 1, actProgress);

    // Zoom out from current to a commanding wide shot
    targetDist = minSafe + 18.0 + easeIn * 8.0; // ~33 -> 41 Rs
    // Rise above the disk: from default angle toward ~70 deg (more overhead)
    const overheadAngle = (70 * Math.PI) / 180;
    targetPhi =
      DEFAULT_VERTICAL_ANGLE +
      (overheadAngle - DEFAULT_VERTICAL_ANGLE) * easeIn;
    // Slow, majestic rotation
    orbitSpeed = 0.15 + easeIn * 0.1; // 0.15 -> 0.25 rad/s
  } else if (t < ACT2_END) {
    // ACT 2: THE DESCENT & SWEEP -- Drop back to disk level, speed up
    const actProgress = (t - ACT1_END) / (ACT2_END - ACT1_END);
    const ease = smoothstep(0, 1, actProgress);

    // Come closer and back to disk plane
    targetDist = minSafe + 18.0 - ease * 10.0; // 41 -> 23 Rs
    // Descend back toward equatorial view
    const overheadAngle = (70 * Math.PI) / 180;
    targetPhi =
      overheadAngle + (DEFAULT_VERTICAL_ANGLE - overheadAngle) * ease;
    // Speed up as we get closer (Kepler's 2nd law feel)
    orbitSpeed = 0.25 + ease * 0.3; // 0.25 -> 0.55 rad/s
  } else if (t < ACT3_END) {
    // ACT 3: THE CLOSE PASS -- Skim near the photon sphere
    const actProgress = (t - ACT2_END) / (ACT3_END - ACT2_END);

    // Elliptical path: close periapsis at center of act, wider at edges
    // Use a smooth pulse that dips close then pulls back
    const periapsisPhase = Math.sin(actProgress * Math.PI); // 0->1->0
    targetDist = minSafe + 8.0 - periapsisPhase * 6.0; // 23 -> 17 -> 23
    // Slight dip below equatorial for drama, then back
    const equatorialTilt = (3 * Math.PI) / 180;
    targetPhi =
      DEFAULT_VERTICAL_ANGLE -
      equatorialTilt * Math.sin(actProgress * Math.PI * 2);
    // Fastest at periapsis (whip effect)
    orbitSpeed = 0.55 + periapsisPhase * 0.35; // 0.55 -> 0.90 -> 0.55
  } else {
    // ACT 4: THE CONTEMPLATION -- Wide, reverent, slow
    const actProgress = (t - ACT3_END) / (ORBIT_MAX_DURATION - ACT3_END);
    const ease = smoothstep(0, 1, actProgress);

    // Pull way back for the "big picture" moment
    targetDist = minSafe + 10.0 + ease * 18.0; // 25 -> 43 Rs
    // Gentle rise for a slightly elevated perspective
    const contemplativeAngle = (85 * Math.PI) / 180;
    targetPhi =
      DEFAULT_VERTICAL_ANGLE +
      (contemplativeAngle - DEFAULT_VERTICAL_ANGLE) * ease * 0.5;
    // Decelerate to a meditative pace
    orbitSpeed = 0.55 - ease * 0.35; // 0.55 -> 0.20 rad/s
  }

  return { targetDist, targetPhi, orbitSpeed, minSafe };
}

/**
 * Breathing + handheld micro-wobble (2-axis) layered over the orbit
 * keyframes for realism.
 */
export function orbitFeel(t: number): OrbitFeel {
  // Subtle "breathing" -- micro zoom oscillation for organic feel
  const breathe = Math.sin(t * 0.7) * 0.3;

  // "Handheld" micro-wobble (2-axis) for realism
  const wobbleX =
    Math.sin(t * 0.31) * 0.008 + Math.cos(t * 0.17) * 0.005;
  const wobbleY =
    Math.cos(t * 0.23) * 0.006 + Math.sin(t * 0.41) * 0.004;

  return { breathe, wobbleX, wobbleY };
}

/**
 * 3-act dive dynamics for "THE DESCENT INTO GARGANTUA".
 * Act 1: The Hesitation (0-8s) -- Deep breath before the fall
 * Act 2: The Commitment (8-20s) -- Point of no return
 * Act 3: The Maelstrom (20s+) -- Physics takes over
 * Each act has escalating gravitational intensity ("Nolan pacing").
 */
export function computeDiveFrame(t: number): DiveFrame {
  const ACT1_END = 8.0;
  const ACT2_END = 20.0;

  let gravityScale: number;
  let phiDriftRate: number; // How fast camera aligns to equatorial
  let thetaWobble: number; // Organic camera shake

  if (t < ACT1_END) {
    // ACT 1: THE HESITATION
    // Almost no gravity. Camera floats. You feel weightless.
    // A slight pull-back even, for the "establishing wide."
    const actProgress = t / ACT1_END;
    gravityScale = 3.0 + actProgress * 3.0; // 3 -> 6 (gentle)
    phiDriftRate = 0.05; // Very slow tilt

    // Subtle "last look" wobble -- the camera is studying the black hole
    thetaWobble = Math.sin(t * 0.4) * 0.003;
  } else if (t < ACT2_END) {
    // ACT 2: THE COMMITMENT
    // Gravity becomes real. The spiral tightens. No turning back.
    const actProgress = (t - ACT1_END) / (ACT2_END - ACT1_END);
    gravityScale = 6.0 + actProgress * 12.0; // 6 -> 18
    phiDriftRate = 0.1 + actProgress * 0.15; // Accelerating tilt

    // Growing unease - camera vibration increases
    thetaWobble = Math.sin(t * 0.8) * 0.005 * (1 + actProgress);
  } else {
    // ACT 3: THE MAELSTROM
    // Full Newtonian fury. The vortex consumes everything.
    // Gravity is overwhelming. Spin is frantic.
    const actDuration = t - ACT2_END;
    const intensity = Math.min(actDuration * 0.15, 1.0); // Ramps over ~7s
    gravityScale = 18.0 + intensity * 20.0; // 18 -> 38
    phiDriftRate = 0.25 + intensity * 0.25; // Fast equatorial lock

    // Violent camera shake near the horizon
    const shakeIntensity = 0.008 + intensity * 0.015;
    thetaWobble =
      Math.sin(t * 2.1) * shakeIntensity +
      Math.cos(t * 3.7) * shakeIntensity * 0.6;
  }

  // Subtle phi wobble for "tumbling through spacetime" feel
  const phiWobble =
    t > ACT2_END ? Math.sin(t * 1.7) * 0.004 + Math.cos(t * 2.9) * 0.003 : 0;

  return { gravityScale, phiDriftRate, thetaWobble, phiWobble };
}

/**
 * Calculate optimal initial zoom distance based on black hole mass and viewport dimensions
 */
export function calculateInitialZoom(
  mass: number,
  viewportWidth: number,
  viewportHeight: number,
): number {
  if (!isValidNumber(mass) || mass <= 0) return DEFAULT_ZOOM;

  if (
    !isValidNumber(viewportWidth) ||
    !isValidNumber(viewportHeight) ||
    viewportWidth <= 0 ||
    viewportHeight <= 0
  ) {
    return DEFAULT_ZOOM;
  }

  try {
    const aspectRatio = viewportWidth / viewportHeight;
    const eventHorizonRadius = mass * SCHWARZSCHILD_RADIUS_SOLAR;
    const diskOuterRadius =
      eventHorizonRadius * ACCRETION_DISK_OUTER_RADIUS_MULTIPLIER;
    const fovRadians = (FOV_DEGREES * Math.PI) / 180;
    const halfFov = fovRadians / 2;
    const tanHalfFov = Math.tan(halfFov);

    if (tanHalfFov <= 0) return DEFAULT_ZOOM;

    const baseDistance = diskOuterRadius / tanHalfFov;
    const adjustedDistance = baseDistance / TARGET_VIEWPORT_COVERAGE;
    let aspectRatioAdjustment = 1.0;
    if (aspectRatio < 1.0) {
      aspectRatioAdjustment = 1.0 / aspectRatio;
    }

    const finalDistance = adjustedDistance * aspectRatioAdjustment;
    const normalizedZoom = (finalDistance / diskOuterRadius) * (mass * 3.5);

    return clampAndValidate(normalizedZoom, MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("Error calculating initial zoom:", error);
    return DEFAULT_ZOOM;
  }
}
