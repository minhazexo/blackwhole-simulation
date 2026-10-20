/**
 * Core simulation types.
 */

import type { FeatureToggles, RayTracingQuality } from "./features";
import {
  SIMULATION_CONFIG,
  DEFAULT_PRESET_MODE,
} from "@/config/simulation.config";
import { REFERENCE_SHOT } from "@/config/reference-shot.config";

export type QualityLevel = RayTracingQuality;

export interface SimulationParams {
  mass: number;
  spin: number;
  diskDensity: number;
  diskTemp: number;
  lensing: number;
  paused: boolean;
  zoom: number;
  autoSpin: number;
  diskSize: number;
  diskScaleHeight: number;
  adaptiveResolution?: boolean;
  renderScale: number;
  starDensity?: number;
  features?: FeatureToggles;
  performancePreset?: import("./features").PresetName;
  verticalAngle?: number;
  /** Camera roll about the view axis, in degrees. Raises the right side. */
  roll?: number;
}

export const DEFAULT_PARAMS: SimulationParams = {
  mass: SIMULATION_CONFIG.mass.default,
  spin: SIMULATION_CONFIG.spin.default, // Using direct physics spin
  // Disk + camera defaults follow the reference-shot composition so a fresh
  // visit opens on the framed shot instead of a close-up. The simulation,
  // sliders, and other presets still read from SIMULATION_CONFIG for ranges.
  diskDensity: REFERENCE_SHOT.disk.density,
  diskTemp: REFERENCE_SHOT.disk.temperatureK,
  lensing: REFERENCE_SHOT.lensingStrength,
  paused: false,
  zoom: REFERENCE_SHOT.camera.distance,
  autoSpin: SIMULATION_CONFIG.autoSpin.default,
  diskSize: REFERENCE_SHOT.disk.size,
  diskScaleHeight: REFERENCE_SHOT.disk.scaleHeight,
  // Auto-Tune (adaptive resolution + quality governor) is opt-in: the site
  // opens with the High Quality preset locked in at High ray tracing.
  adaptiveResolution: false,
  renderScale: SIMULATION_CONFIG.renderScale.default,
  starDensity: REFERENCE_SHOT.sky.starDensity,
  features: SIMULATION_CONFIG.features.default,
  performancePreset: DEFAULT_PRESET_MODE,
  verticalAngle: REFERENCE_SHOT.camera.verticalAngleDeg,
  roll: REFERENCE_SHOT.camera.rollDeg,
};

export interface MouseState {
  x: number;
  y: number;
}
