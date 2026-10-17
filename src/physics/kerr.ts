/**
 * Single-source pure JS Kerr black-hole math.
 *
 * Geometric units (G = c = 1). Convention: `mass` is the geometric mass M,
 * `spin` is the dimensionless spin parameter a* in [-1, 1].
 *
 * These functions back the no-WASM fallbacks and the spacetime
 * visualization components. The WASM engine remains the primary path
 * wherever it is available (see `src/engine/physics-bridge.ts`).
 *
 * References:
 * - Bardeen, Press & Teukolsky (1972). "Rotating Black Holes".
 * - Bardeen (1973). "Timelike and null geodesics in the Kerr metric".
 */

const SPIN_LIMIT = 0.9999;

/** Clamp dimensionless spin to [-0.9999, 0.9999] for numerical safety. */
function clampSpin(spin: number): number {
  return Math.min(SPIN_LIMIT, Math.max(-SPIN_LIMIT, spin));
}

/**
 * Outer event-horizon radius: r_+ = M + sqrt(max(0, M^2 - a^2)),
 * where a = a* M.
 */
export function horizonRadius(mass: number, spin: number): number {
  const aStar = clampSpin(spin);
  const a = aStar * mass;
  return mass + Math.sqrt(Math.max(0, mass * mass - a * a));
}

/**
 * Equatorial photon-sphere (photon orbit) radius.
 * Prograde: r = 2M (1 + cos(2/3 acos(-a*))).
 * Retrograde mirrors the spin term: acos(+a*), like the GLSL
 * `kerr_photon_sphere` / `kerr_photon_sphere_retro` pair.
 */
export function photonSphere(
  mass: number,
  spin: number,
  prograde = true,
): number {
  const aStar = clampSpin(spin);
  const arg = Math.min(1, Math.max(-1, prograde ? -aStar : aStar));
  return 2 * mass * (1 + Math.cos((2 / 3) * Math.acos(arg)));
}

/**
 * Equatorial ISCO radius (Bardeen-Press-Teukolsky).
 * Uses Math.cbrt (negative-base safe). Near-zero spin (|a*| < 1e-3)
 * short-circuits to the Schwarzschild value 6M.
 * `prograde=true` selects the minus branch, `false` the plus branch.
 */
export function iscoRadius(
  mass: number,
  spin: number,
  prograde = true,
): number {
  const aStar = clampSpin(spin);
  const absS = Math.abs(aStar);
  if (absS < 1e-3) return 6 * mass;
  const z1 =
    1 +
    Math.cbrt(1 - absS * absS) *
      (Math.cbrt(1 + absS) + Math.cbrt(1 - absS));
  const z2 = Math.sqrt(3 * absS * absS + z1 * z1);
  const root = Math.sqrt(
    Math.max(0, (3 - z1) * (3 + z1 + 2 * z2)),
  );
  return prograde ? mass * (3 + z2 - root) : mass * (3 + z2 + root);
}

/**
 * Static-limit (ergosphere) radius at polar cosTheta:
 * r_ergo = M + sqrt(max(0, M^2 - a^2 cos^2(theta))).
 * Defaults to the equatorial plane (cosTheta = 0 -> r = 2M).
 */
export function ergosphereRadius(
  mass: number,
  spin: number,
  cosTheta = 0,
): number {
  const aStar = clampSpin(spin);
  const a = aStar * mass;
  return (
    mass + Math.sqrt(Math.max(0, mass * mass - a * a * cosTheta * cosTheta))
  );
}

/** Schwarzschild shadow (critical impact parameter): 3 sqrt(3) M. */
export function shadowRadius(mass: number): number {
  return 3 * Math.sqrt(3) * mass;
}
