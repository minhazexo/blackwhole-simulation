import { useCallback, useState } from "react";
import type * as React from "react";
import { clampAndValidate } from "@/utils/validation";
import type { SimulationParams } from "@/types/simulation";
import { VIEWPOINTS, getViewpoint } from "@/config/viewpoints.config";
import {
  DEFAULT_AUTO_SPIN,
  DEFAULT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  createInitialCameraState,
} from "./types";
import type { CameraRig, CameraState, CinematicMode } from "./types";
import {
  ORBIT_MAX_DURATION,
  RECOVER_DURATION,
  VIEWPOINT_FLY_DURATION,
  computeDiveFrame,
  computeOrbitFrame,
  computeViewpointFlyPose,
  driftDwellStep,
  orbitDwellStep,
  orbitFeel,
  quarticEaseInOut,
  quarticEaseOut,
  recoveryLerpRate,
} from "./cinematic-sequences";

interface TourDeps {
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>;
  setCameraState: React.Dispatch<React.SetStateAction<CameraState>>;
  /**
   * Coalesced per-frame zoom writer (flushes ≤1/frame). Per-frame steppers
   * MUST use this for zoom; one-shot orchestration keeps setParams.
   */
  queueZoomSync: (z: (prev: number) => number) => void;
}

/**
 * Cinematic tour sub-hook. Owns the tour UI state, the start/stop/reset
 * orchestration, and the per-frame stepping for the tour-owned sequences
 * (recovery, viewpoint fly/dwell, dive). All mutable physics state is read
 * and written through the shared `rig` — no ref state lives here.
 * Keyframe math comes from the pure `cinematic-sequences` module.
 */
export function useCameraTour(rig: CameraRig, deps: TourDeps) {
  const { setParams, setCameraState, queueZoomSync } = deps;

  // Cinematic State (UI Sync)
  const [isCinematic, setIsCinematic] = useState(false);
  const [cinematicMode, setCinematicMode] =
    useState<CinematicMode>(null);
  const [currentViewpointId, setCurrentViewpointId] = useState<
    string | null
  >(null);
  const currentViewpointDef = currentViewpointId
    ? getViewpoint(currentViewpointId)
    : null;
  // Tour progress state
  const [tourIndex, setTourIndex] = useState(0);
  const [tourTotal, setTourTotal] = useState(0);

  /**
   * Shared ending for sequences that expire on their own (orbit timeout,
   * tour completion): leave cinematic mode and ease back to the start pose.
   * The dive horizon crossing keeps its own bespoke block in stepDive
   * (it additionally clears velocities and restores spin/pause state).
   */
  const enterRecovery = useCallback(
    (now: number) => {
      rig.cinematicRef.current.active = false;
      rig.cinematicRef.current.mode = null;
      rig.cinematicRef.current.recovering = true;
      rig.cinematicRef.current.recoverStartTime = now;
      setIsCinematic(false);
      setCinematicMode(null);
      setCurrentViewpointId(null);
    },
    [rig],
  );

  const stopCinematic = useCallback(() => {
    if (rig.cinematicRef.current.active || rig.cinematicRef.current.recovering) {
      // Restore autoSpin if we killed it for any cinematic mode
      setParams((prev) => ({ ...prev, autoSpin: DEFAULT_AUTO_SPIN }));

      // Enter smooth recovery instead of snapping back instantly
      enterRecovery(performance.now());
    }
  }, [rig, setParams, enterRecovery]);

  const startCinematic = useCallback(
    (mode: "orbit" | "dive") => {
      // Honor the user-agent reduced-motion preference: WCAG 2.2 SC 2.3.3
      // requires non-essential motion to be opt-out. Cinematic auto-orbit
      // is decorative; we silently no-op rather than override the setting.
      if (
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }
      // 1. Clean up existing state (Force Stop any previous cinematic)
      stopCinematic();

      // 2. Clear interaction state to prevent "Phantom Drag" blocking the animation
      rig.isDragging.current = false;
      rig.touchState.current.touches = [];

      // 3. Clear velocities to prevent "Phantom Momentum" jitter
      rig.physicsRef.current.thetaVelocity = 0;
      rig.physicsRef.current.phiVelocity = 0;
      rig.physicsRef.current.zoomVelocity = 0;

      // 4. Capture current state as start state
      const now = performance.now();
      rig.cinematicRef.current = {
        active: true,
        mode,
        startTime: now,
        lastTime: now,
        startParams: {
          theta: rig.physicsRef.current.theta,
          phi: rig.physicsRef.current.phi,
          zoom: rig.paramsRef.current.zoom,
        },
        velocity: 0,
        angularMomentum: 0,
        recovering: false,
        recoverStartTime: 0,
      };

      if (mode === "dive") {
        // Angular Momentum: L = r^2 * omega
        // omega ~0.3 for a wide, dramatic spiral
        const initialOmega = 0.3;
        const r = rig.paramsRef.current.zoom;
        rig.cinematicRef.current.angularMomentum = r * r * initialOmega;

        // Barely a nudge inward. Act 1 ("The Hesitation") handles the
        // slow buildup. This just tips you over the edge.
        rig.cinematicRef.current.velocity = -0.15;

        // Start above the disk for the establishing wide shot.
        // ~54 degrees from pole -> looking down at the disk
        rig.physicsRef.current.phi = Math.PI * 0.3;

        // Offset theta for a dynamic spiral entry
        rig.physicsRef.current.theta += Math.PI * 0.25;
      }

      setIsCinematic(true);
      setCinematicMode(mode);

      // Reset any active auto-spin param that might conflict
      // But for Infall, we calculate spin manually.
      if (mode === "dive") {
        setParams((p) => ({ ...p, autoSpin: 0 })); // Disable artificial spin
      }
    },
    [rig, setParams, stopCinematic],
  );

  /**
   * Start a full viewpoints auto-tour. Cycles through ALL VIEWPOINTS
   * sequentially, flying to each, dwelling, then advancing to the next.
   */
  const startAllViewpointsTour = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    // Stop any existing cinematic
    stopCinematic();

    rig.isDragging.current = false;
    rig.touchState.current.touches = [];
    rig.physicsRef.current.thetaVelocity = 0;
    rig.physicsRef.current.phiVelocity = 0;
    rig.physicsRef.current.zoomVelocity = 0;

    const now = performance.now();
    const currentTheta = rig.physicsRef.current.theta;
    const currentPhi = rig.physicsRef.current.phi;
    const currentZoom = rig.paramsRef.current.zoom;

    // Collect all viewpoint IDs
    const allIds: string[] = VIEWPOINTS.map(
      (vp: { id: string }) => vp.id,
    );
    const firstId = allIds[0];
    const firstDef = firstId ? getViewpoint(firstId) : undefined;

    if (!firstDef) return;

    const DWELL_PER_VIEWPOINT = 10.0; // seconds per viewpoint

    rig.cinematicRef.current = {
      active: true,
      mode: "viewpoints-tour",
      startTime: now,
      lastTime: now,
      startParams: {
        theta: currentTheta,
        phi: currentPhi,
        zoom: currentZoom,
      },
      velocity: 0,
      angularMomentum: 0,
      recovering: false,
      recoverStartTime: 0,
      // First viewpoint flight
      viewpointId: firstDef.id,
      viewpointPhase: "flying",
      viewpointStartParams: {
        theta: currentTheta,
        phi: currentPhi,
        zoom: currentZoom,
      },
      viewpointTargetParams: {
        theta: firstDef.camera.theta,
        phi: firstDef.camera.phi,
        zoom: firstDef.camera.zoom,
      },
      viewpointPhaseStartTime: now,
      viewpointAnimType: firstDef.animation.type,
      viewpointAnimSpeed: firstDef.animation.speed ?? 0.1,
      // Tour state
      tourViewpointIds: allIds,
      tourIndex: 0,
      tourTotal: allIds.length,
      tourDwellDuration: DWELL_PER_VIEWPOINT,
    };

    setIsCinematic(true);
    setCinematicMode("viewpoints-tour");
    setCurrentViewpointId(firstDef.id);
    setTourIndex(0);
    setTourTotal(allIds.length);

    setParams((p) => ({ ...p, autoSpin: 0 }));
  }, [rig, setParams, stopCinematic]);

  /**
   * Start a viewpoint fly-to. Smoothly moves the camera to a pre-defined
   * position and dwells with a characteristic animation (orbit/drift/still).
   */
  const startViewpoint = useCallback(
    (viewpointId: string) => {
      // Honor reduced-motion preference
      if (
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }

      const viewpointDef = getViewpoint(viewpointId);
      if (!viewpointDef) return;

      // Stop any existing cinematic (orbit/dive/viewpoint). This also
      // clears isCinematic, setCinematicMode, and currentViewpointId.
      stopCinematic();

      // Clear interaction state to prevent phantom drag blocking
      rig.isDragging.current = false;
      rig.touchState.current.touches = [];

      // Clear velocities
      rig.physicsRef.current.thetaVelocity = 0;
      rig.physicsRef.current.phiVelocity = 0;
      rig.physicsRef.current.zoomVelocity = 0;

      const now = performance.now();
      const currentTheta = rig.physicsRef.current.theta;
      const currentPhi = rig.physicsRef.current.phi;
      const currentZoom = rig.paramsRef.current.zoom;

      rig.cinematicRef.current = {
        active: true,
        mode: "viewpoint",
        startTime: now,
        lastTime: now,
        startParams: {
          theta: currentTheta,
          phi: currentPhi,
          zoom: currentZoom,
        },
        velocity: 0,
        angularMomentum: 0,
        recovering: false,
        recoverStartTime: 0,
        viewpointId: viewpointDef.id,
        viewpointPhase: "flying",
        viewpointStartParams: {
          theta: currentTheta,
          phi: currentPhi,
          zoom: currentZoom,
        },
        viewpointTargetParams: {
          theta: viewpointDef.camera.theta,
          phi: viewpointDef.camera.phi,
          zoom: viewpointDef.camera.zoom,
        },
        viewpointPhaseStartTime: now,
        viewpointAnimType: viewpointDef.animation.type,
        viewpointAnimSpeed: viewpointDef.animation.speed ?? 0.1,
      };

      setIsCinematic(true);
      setCinematicMode("viewpoint");
      setCurrentViewpointId(viewpointDef.id);

      // Disable artificial auto-spin during viewpoint (the viewpoint's
      // characteristic animation replaces it)
      setParams((p) => ({ ...p, autoSpin: 0 }));
    },
    [rig, setParams, stopCinematic],
  );

  /**
   * Advance the viewpoints tour after the dwell duration elapses.
   * Called once per frame by the animation loop while dwelling.
   * Tour complete → recover to start; otherwise fly to the next viewpoint.
   */
  const advanceTour = useCallback(
    (now: number) => {
      const vp = rig.cinematicRef.current;
      const state = rig.physicsRef.current;
      // Advance to next viewpoint
      const nextIndex = (vp.tourIndex ?? 0) + 1;

      if (nextIndex >= (vp.tourTotal ?? 0)) {
        // Tour complete → recover to start
        enterRecovery(now);
      } else {
        // Transition to next viewpoint
        const nextVpId = vp.tourViewpointIds?.[nextIndex];
        if (nextVpId) {
          const nextVpDef = getViewpoint(nextVpId);
          if (nextVpDef) {
            vp.tourIndex = nextIndex;
            setTourIndex(nextIndex);
            vp.viewpointId = nextVpDef.id;
            setCurrentViewpointId(nextVpDef.id);
            vp.viewpointPhase = "flying";
            vp.viewpointPhaseStartTime = now;
            vp.viewpointStartParams = {
              theta: state.theta,
              phi: state.phi,
              zoom: rig.paramsRef.current.zoom,
            };
            vp.viewpointTargetParams = {
              theta: nextVpDef.camera.theta,
              phi: nextVpDef.camera.phi,
              zoom: nextVpDef.camera.zoom,
            };
            vp.viewpointAnimType = nextVpDef.animation.type;
            vp.viewpointAnimSpeed = nextVpDef.animation.speed ?? 0.1;
          }
        }
      }
    },
    [rig, enterRecovery],
  );

  /**
   * Per-frame recovery step: smooth emergence back to the pre-cinematic
   * position. Called by the animation loop while `recovering`.
   */
  const stepRecovery = useCallback(
    (now: number) => {
      const state = rig.physicsRef.current;
      const cine = rig.cinematicRef.current;
      const elapsed = (now - cine.recoverStartTime) * 0.001;
      const progress = Math.min(elapsed / RECOVER_DURATION, 1.0);

      // Quartic ease-out: stronger initial pull, very gentle deceleration
      const ease = quarticEaseOut(progress);
      const target = cine.startParams;

      // Accelerating convergence rate
      const lerpRate = recoveryLerpRate(ease);
      state.theta += (target.theta - state.theta) * lerpRate;
      state.phi += (target.phi - state.phi) * lerpRate;

      // Interpolate zoom (coalesced: this stepper runs every frame)
      const currentZoom = rig.paramsRef.current.zoom;
      const zoomDelta = (target.zoom - currentZoom) * lerpRate;
      if (Math.abs(zoomDelta) > 0.001) {
        queueZoomSync((z) => z + zoomDelta);
      }

      // Check if recovery is complete
      const thetaDist = Math.abs(target.theta - state.theta);
      const phiDist = Math.abs(target.phi - state.phi);
      const zoomDist = Math.abs(target.zoom - rig.paramsRef.current.zoom);

      if (
        (thetaDist < 0.01 && phiDist < 0.01 && zoomDist < 0.1) ||
        progress >= 1.0
      ) {
        state.theta = target.theta;
        state.phi = target.phi;
        cine.recovering = false;
        setParams((prev) => ({
          ...prev,
          zoom: target.zoom,
          autoSpin: DEFAULT_AUTO_SPIN,
        }));
      }

      state.phi = Math.max(0.001, Math.min(Math.PI - 0.001, state.phi));
    },
    [rig, setParams],
  );

  /**
   * Per-frame viewpoint step: FLY-TO-AND-DWELL.
   * Flying interpolates to the target; dwelling applies the viewpoint's
   * characteristic animation and advances the tour when due.
   */
  const stepViewpoint = useCallback(
    (now: number, dt: number) => {
      const state = rig.physicsRef.current;
      const cine = rig.cinematicRef.current;

      if (cine.viewpointPhase === "flying") {
        const elapsed = (now - (cine.viewpointPhaseStartTime ?? now)) * 0.001;
        const progress = Math.min(elapsed / VIEWPOINT_FLY_DURATION, 1.0);

        // Quartic ease-in-out: smooth acceleration then deceleration
        const pose = computeViewpointFlyPose(
          cine.viewpointStartParams!,
          cine.viewpointTargetParams!,
          quarticEaseInOut(progress),
        );
        state.theta = pose.theta;
        state.phi = pose.phi;

        // Apply zoom smoothly (coalesced: this stepper runs every frame)
        if (Math.abs(pose.zoom - rig.paramsRef.current.zoom) > 0.001) {
          queueZoomSync(() => pose.zoom);
        }

        // Clamp phi
        state.phi = Math.max(0.001, Math.min(Math.PI - 0.001, state.phi));

        // Transition to dwell phase
        if (progress >= 1.0) {
          cine.viewpointPhase = "dwelling";
          cine.viewpointPhaseStartTime = now;
        }
      } else if (cine.viewpointPhase === "dwelling") {
        // Dwell: apply the viewpoint's characteristic animation
        const dwellT = (now - (cine.viewpointPhaseStartTime ?? now)) * 0.001;

        if (cine.viewpointAnimType === "orbit") {
          // Slow, majestic orbit
          const speed = cine.viewpointAnimSpeed ?? 0.1;
          const step = orbitDwellStep(dwellT, speed, dt);
          state.theta += step.dTheta;
          state.phi += step.dPhi;

          // Subtle breathing oscillation (coalesced: runs every frame)
          queueZoomSync((z) => z + step.breathe * 0.008);
        } else if (cine.viewpointAnimType === "drift") {
          // Gentle, meditative drift
          const step = driftDwellStep(dwellT);
          state.theta += step.dTheta;
          state.phi += step.dPhi;

          // Very subtle zoom pulse (coalesced: runs every frame)
          queueZoomSync((z) => z + step.pulse);
        }
        // type === "still": no camera animation, perfectly static

        // ── Viewpoints Tour: advance to next viewpoint after dwell ──
        if (
          cine.mode === "viewpoints-tour" &&
          cine.tourViewpointIds !== undefined &&
          cine.tourIndex !== undefined &&
          cine.tourTotal !== undefined
        ) {
          const dwellDuration = cine.tourDwellDuration ?? 10.0;
          if (dwellT >= dwellDuration) {
            advanceTour(now);
          }
        }

        state.phi = Math.max(0.001, Math.min(Math.PI - 0.001, state.phi));
      }
    },
    [rig, setParams, advanceTour],
  );

  /**
   * Per-frame infall dive step: 3-act geodesic plunge with radial +
   * angular physics, equatorial drift, and horizon-crossing recovery.
   */
  const stepDive = useCallback(
    (now: number, dt: number) => {
      const state = rig.physicsRef.current;
      const cine = rig.cinematicRef.current;
      const t = (now - cine.startTime) * 0.001;
      const r = rig.paramsRef.current.zoom;

      // Act-dependent gravity / drift / shake for this frame
      const dive = computeDiveFrame(t);

      // --- Radial Physics ---
      const gravity = -dive.gravityScale / (r * r + 0.1);
      cine.velocity += gravity * dt;
      const newR = r + cine.velocity * dt;

      // --- Angular Physics (Conservation of Momentum: L = r^2 * omega) ---
      const L = cine.angularMomentum;
      const omegaProp = L / (newR * newR + 0.1);
      state.theta += omegaProp * dt + dive.thetaWobble;

      // --- Inclination: Drift toward equatorial plane ---
      const distToEquator = Math.PI * 0.5 - state.phi;
      state.phi += distToEquator * dt * dive.phiDriftRate;

      // Subtle phi wobble for "tumbling through spacetime" feel
      state.phi += dive.phiWobble;

      // --- HORIZON CROSSING LOGIC ---
      if (newR < 2.0) {
        // Horizon crossing -> Begin smooth recovery to pre-dive position
        cine.active = false;
        cine.mode = null;
        cine.velocity = 0;
        cine.angularMomentum = 0;
        cine.recovering = true;
        cine.recoverStartTime = now;

        // Clear velocities so recovery isn't fighting residual momentum
        state.thetaVelocity = 0;
        state.phiVelocity = 0;
        state.zoomVelocity = 0;

        // Restore autoSpin and unpause
        setParams((prev) => ({
          ...prev,
          autoSpin: DEFAULT_AUTO_SPIN,
          paused: false,
        }));

        // Sync UI State
        setIsCinematic(false);
        setCinematicMode(null);
        setCurrentViewpointId(null);
      } else {
        // Apply Zoom (only during active dive; coalesced: runs every frame)
        queueZoomSync(() => Math.max(0.2, newR));
      }
    },
    [rig, setParams],
  );

  /**
   * Per-frame orbit step: "THE GRAND SURVEY" 4-act keyframes plus
   * organic breathing / handheld feel. Expired tours enter recovery.
   */
  const stepOrbit = useCallback(
    (now: number, dt: number, t: number) => {
      const state = rig.physicsRef.current;
      if (t > ORBIT_MAX_DURATION) {
        enterRecovery(now);
      } else {
        const frame = computeOrbitFrame(t, rig.paramsRef.current.mass);

        // --- Apply with smooth interpolation (no pops) ---
        const currentZoom = rig.paramsRef.current.zoom;
        const zoomLerp =
          currentZoom + (frame.targetDist - currentZoom) * 0.025;
        if (Math.abs(zoomLerp - currentZoom) > 0.001) {
          queueZoomSync(() => zoomLerp);
        }

        const feel = orbitFeel(t);

        if (
          !rig.isDragging.current &&
          rig.touchState.current.touches.length === 0
        ) {
          // Smooth phi tracking with wobble
          state.phi += (frame.targetPhi + feel.wobbleY - state.phi) * 0.018;
          // Orbit rotation with Keplerian speed variation
          state.theta += dt * frame.orbitSpeed + feel.wobbleX;
        }

        // Apply breathing to zoom (coalesced: runs every frame)
        if (Math.abs(feel.breathe) > 0.01) {
          queueZoomSync((z) => Math.max(frame.minSafe, z + feel.breathe * 0.01));
        }
      }
    },
    [rig, setParams, enterRecovery],
  );

  const resetCamera = useCallback(() => {
    // 1. Force Stop Cinematic (Full cleanup)
    rig.cinematicRef.current.active = false;
    rig.cinematicRef.current.mode = null;
    rig.cinematicRef.current.velocity = 0;
    rig.cinematicRef.current.angularMomentum = 0;
    rig.cinematicRef.current.recovering = false; // Cancel any recovery in progress
    setIsCinematic(false);
    setCinematicMode(null);
    setCurrentViewpointId(null);

    // 2. Reset Physics State
    rig.physicsRef.current = createInitialCameraState();

    // 3. Force React State Update (Critical for UI Sync)
    setCameraState({ ...rig.physicsRef.current });

    // 4. Reset Simulation Params (Zoom, AutoSpin, Pause)
    setParams((prev) => ({
      ...prev,
      zoom: DEFAULT_ZOOM,
      autoSpin: DEFAULT_AUTO_SPIN,
      paused: false, // Guarantee simulation runs after reset
    }));
  }, [rig, setParams, setCameraState]);

  return {
    isCinematic,
    cinematicMode,
    currentViewpointId,
    currentViewpointDef,
    tourIndex,
    tourTotal,
    stopCinematic,
    startCinematic,
    startAllViewpointsTour,
    startViewpoint,
    resetCamera,
    enterRecovery,
    advanceTour,
    stepRecovery,
    stepViewpoint,
    stepOrbit,
    stepDive,
    setIsCinematic,
    setCinematicMode,
    setCurrentViewpointId,
  };
}
