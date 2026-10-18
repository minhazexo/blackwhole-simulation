import type * as React from "react";
import { SIMULATION_CONFIG } from "@/config/simulation.config";
import { REFERENCE_SHOT } from "@/config/reference-shot.config";
import type { SimulationParams } from "@/types/simulation";

/**
 * Camera state with spherical coordinates and velocity for momentum
 */
export interface CameraState {
  /** Azimuthal angle (0 - 2π) */
  theta: number;
  /** Polar angle (0 - π) */
  phi: number;
  /** Velocity for theta (momentum) */
  thetaVelocity: number;
  /** Velocity for phi (momentum) */
  phiVelocity: number;
  /** Velocity for zoom (momentum) */
  zoomVelocity: number;
  /** Damping factor for momentum decay */
  damping: number;
}

/**
 * Cinematic director mode.
 */
export type CinematicMode =
  "orbit" | "dive" | "viewpoint" | "viewpoints-tour" | null;

/**
 * Extended Cinematic State Machine
 * Tracks the active "Director Mode" and its trajectory parameters.
 */
export interface CinematicState {
  active: boolean;
  mode: CinematicMode;
  startTime: number;
  lastTime: number; // For physics integration (dt)
  startParams: {
    theta: number;
    phi: number;
    zoom: number;
  };
  // Physics State for Infall
  velocity: number; // Radial velocity (dr/dt) in Rs/s
  angularMomentum: number; // Conserved L = r^2 * omega
  // Recovery phase: smooth interpolation back to origin after cinematic ends
  recovering: boolean;
  recoverStartTime: number;
  // --- Viewpoint flight state ---
  viewpointId?: string;
  /** Flying = interpolating to target; Dwelling = at target with characteristic animation */
  viewpointPhase?: "flying" | "dwelling";
  viewpointStartParams?: { theta: number; phi: number; zoom: number };
  viewpointTargetParams?: { theta: number; phi: number; zoom: number };
  viewpointPhaseStartTime?: number;
  viewpointAnimType?: "orbit" | "drift" | "still";
  viewpointAnimSpeed?: number;
  // --- Viewpoints Tour state ---
  /** Ordered list of viewpoint IDs for the auto-tour */
  tourViewpointIds?: string[];
  /** Current index into tourViewpointIds */
  tourIndex?: number;
  /** Total number of viewpoints in this tour */
  tourTotal?: number;
  /** Duration (seconds) each viewpoint dwells before advancing */
  tourDwellDuration?: number;
  /**
   * When true the tour dwell timer is frozen: the camera stops drifting and
   * the tour will not advance to the next scene until resumed. The scene
   * itself stays on screen (unlike pausing the simulation, which would stop
   * the disk as well).
   */
  tourPaused?: boolean;
}

/**
 * Viewport dimensions for camera calculations
 */
export interface ViewportDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

/**
 * Touch gesture state for multi-touch handling
 */
export interface TouchState {
  touches: React.Touch[];
  initialDistance: number;
  initialAngle: number;
  initialCenter: { x: number; y: number };
}

// Constants for camera positioning
export const DEFAULT_ZOOM = SIMULATION_CONFIG.zoom.default;
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 500.0;
export const FOV_DEGREES = 45;
export const TARGET_VIEWPORT_COVERAGE = 0.7; // 70% of viewport (60-80% range)
export const ACCRETION_DISK_OUTER_RADIUS_MULTIPLIER = 12.0; // Outer disk is ~12x event horizon
// Default auto-spin if not provided
export const DEFAULT_AUTO_SPIN = SIMULATION_CONFIG.autoSpin.default;
// Opening pose comes from the reference-shot composition so the camera, the
// disk angle, and the preset in reference-shot.config.ts stay in sync.
export const DEFAULT_VERTICAL_ANGLE =
  (REFERENCE_SHOT.camera.verticalAngleDeg * Math.PI) / 180;

/**
 * Shared mutable camera rig.
 *
 * The composer (`useCamera`) creates the refs once and passes this single
 * object down to the input and tour sub-hooks. Ref state lives ONLY here —
 * sub-hooks must never duplicate it.
 */
export interface CameraRig {
  physicsRef: { current: CameraState };
  cinematicRef: { current: CinematicState };
  isDragging: { current: boolean };
  lastMousePos: { current: { x: number; y: number } };
  touchState: { current: TouchState };
  paramsRef: { current: SimulationParams };
  /**
   * Last camera pose pushed to React + timestamp. Shared by the animation
   * loop gate and the input handlers so neither re-pushes values the other
   * just synced (dedupe for drag + loop overlap).
   */
  lastSynced: { current: { theta: number; phi: number; time: number } };
}

/**
 * Initial physics state (default orbit pose, zero momentum).
 */
export function createInitialCameraState(): CameraState {
  return {
    theta: Math.PI * 0.75,
    phi: DEFAULT_VERTICAL_ANGLE,
    thetaVelocity: 0,
    phiVelocity: 0,
    zoomVelocity: 0,
    damping: 0.92,
  };
}

/**
 * Initial (idle) cinematic state machine.
 */
export function createInitialCinematicState(): CinematicState {
  return {
    active: false,
    mode: null,
    startTime: 0,
    lastTime: 0,
    startParams: { theta: 0, phi: 0, zoom: 0 },
    velocity: 0,
    angularMomentum: 0,
    recovering: false,
    recoverStartTime: 0,
    viewpointId: undefined,
    viewpointPhase: undefined,
    viewpointStartParams: undefined,
    viewpointTargetParams: undefined,
    viewpointPhaseStartTime: undefined,
    viewpointAnimType: undefined,
    viewpointAnimSpeed: undefined,
    tourViewpointIds: undefined,
    tourIndex: undefined,
    tourTotal: undefined,
    tourDwellDuration: undefined,
    tourPaused: false,
  };
}
