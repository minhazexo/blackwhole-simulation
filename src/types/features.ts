/**
 * Feature toggle definitions for performance optimization.
 */

/**
 * Lensing quality levels:
 * - off: Analytic Hologram (LOD 0, no ray marching)
 * - low/medium: Geometric Approximation (LOD 1, limited steps)
 * - high/ultra: Relativistic Simulation (LOD 2, full GR)
 */
export type RayTracingQuality = "off" | "low" | "medium" | "high" | "ultra";

export interface FeatureToggles {
  gravitationalLensing: boolean;
  rayTracingQuality: RayTracingQuality;
  accretionDisk: boolean;
  dopplerBeaming: boolean;
  backgroundStars: boolean;
  photonSphereGlow: boolean;
  bloom: boolean;
  relativisticJets: boolean;
  gravitationalRedshift: boolean;
  kerrShadow: boolean;
  spacetimeVisualization: boolean;
}

export type PresetName =
  | "maximum-performance"
  | "balanced"
  | "high-quality"
  | "ultra-quality"
  | "custom";

export interface PerformancePreset {
  name: PresetName;
  features: FeatureToggles;
}

export interface FeaturePerformanceCost {
  featureName: keyof FeatureToggles;
  estimatedFrameTimeMs: number;
  actualFrameTimeMs?: number;
}
