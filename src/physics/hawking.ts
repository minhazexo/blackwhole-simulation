/**
 * Hawking radiation primitives (visualization, illustrative).
 *
 * Mirrors the Rust gravitas::quantum::hawking surface for use in
 * React components. The blackbody Planck shape is the standard
 * pedagogical curve; greybody transmission factors are out of scope
 * per ADR-0026 honest-labeling rule.
 *
 * References:
 * - Hawking 1974, Nature 248, 30.
 * - Hawking 1975, Commun. Math. Phys. 43, 199.
 * - Wien 1893 (modern displacement constant 2.898e-3 m·K → 5.879e10 Hz/K).
 */

import { C as SI_C, G as SI_G, H_BAR as SI_HBAR, KB as SI_KB, WIEN_FREQUENCY_CONSTANT_HZ_PER_K } from "@/physics/constants";

/**
 * Hawking temperature for a Kerr hole of given SI rest mass and
 * dimensionless spin a* in [-1, 1]. Returns 0 at a* = ±1 (extremal
 * limit: surface gravity vanishes).
 */
export function hawkingTemperatureKelvin(
  massKg: number,
  spinStar: number,
): number {
  if (massKg <= 0) return 0;
  const aStar = Math.max(-1, Math.min(1, spinStar));
  const disc = Math.sqrt(Math.max(0, 1 - aStar * aStar));
  const rPlus = 1 + disc;
  const rMinus = 1 - disc;
  // Geometric surface gravity κ; SI conversion below picks up M and the
  // units of the gravitational constant.
  const kappaGeom = (rPlus - rMinus) / (2 * (rPlus * rPlus + aStar * aStar));
  const kappaSi = (kappaGeom * SI_C ** 3) / (SI_G * massKg);
  return (SI_HBAR * kappaSi) / (2 * Math.PI * SI_KB);
}

/**
 * Wien displacement law: peak frequency of the Planck spectrum at T.
 */
export function wienPeakFrequency(temperatureK: number): number {
  return WIEN_FREQUENCY_CONSTANT_HZ_PER_K * Math.max(0, temperatureK);
}

/**
 * Planck spectral radiance B_ν(T) in SI W·m⁻²·Hz⁻¹·sr⁻¹. Returns 0
 * for non-positive inputs and for h ν / k T > 700 (where the
 * exponential overflows IEEE 754).
 */
export function hawkingSpectrumPlanck(
  freqHz: number,
  temperatureK: number,
): number {
  if (freqHz <= 0 || temperatureK <= 0) return 0;
  const h = SI_HBAR * 2 * Math.PI;
  const exponent = (h * freqHz) / (SI_KB * temperatureK);
  if (exponent > 700) return 0;
  const prefactor = (2 * h * freqHz ** 3) / (SI_C * SI_C);
  return prefactor / Math.expm1(exponent);
}

/**
 * Sample the Hawking spectrum on a logarithmically-spaced frequency
 * grid centred on the Wien peak. Returns one (frequency, radiance)
 * pair per sample, suitable for a recharts log-log plot.
 */
export function sampleHawkingSpectrum(
  temperatureK: number,
  decadesEachSide = 3,
  samples = 64,
): Array<{ freqHz: number; radiance: number }> {
  if (temperatureK <= 0 || samples < 2) return [];
  const peak = wienPeakFrequency(temperatureK);
  if (peak <= 0) return [];
  const log10Peak = Math.log10(peak);
  const out: Array<{ freqHz: number; radiance: number }> = [];
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    const log10Freq = log10Peak + (2 * t - 1) * decadesEachSide;
    const freqHz = 10 ** log10Freq;
    out.push({ freqHz, radiance: hawkingSpectrumPlanck(freqHz, temperatureK) });
  }
  return out;
}
