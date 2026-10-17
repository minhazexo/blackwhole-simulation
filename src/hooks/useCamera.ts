import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { clampAndValidate } from "@/utils/validation";
import type { MouseState, SimulationParams } from "@/types/simulation";
import { physicsBridge } from "@/engine/physics-bridge";
import { pushLiveCamera } from "@/engine/camera-live";
import {
  DEFAULT_AUTO_SPIN,
  MAX_ZOOM,
  MIN_ZOOM,
  createInitialCameraState,
  createInitialCinematicState,
} from "./camera/types";
import type {
  CameraRig,
  CameraState,
  CinematicState,
  TouchState,
} from "./camera/types";
import { useCameraInput } from "./camera/useCameraInput";
import { useCameraTour } from "./camera/useCameraTour";
// Geometric Units: G = c = 1

// Preserve the historical export API of this module. Canonical definitions
// live in ./camera/*; the math helper is re-exported so existing imports
// (e.g. `@/hooks/useCamera`) keep working.
export type {
  CameraState,
  CinematicState,
  TouchState,
  ViewportDimensions,
} from "./camera/types";
export { calculateInitialZoom } from "./camera/cinematic-sequences";

/**
 * Custom hook for enhanced camera control interactions
 * Now featuring "Cinematic Engineering" Grade Orbit & Infall
 *
 * Thin composer: creates the shared rig refs, runs the animation loop
 * (dispatching to the pure sequence fns and the tour steppers), wires the
 * input + tour sub-hooks, and returns the exact historical object shape.
 */
export function useCamera(
  params: SimulationParams,
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>,
) {
  // Sync auto-spin state to physics bridge
  useEffect(() => {
    physicsBridge.setAutoSpin(!!params.autoSpin);
  }, [params.autoSpin]);

  // --- Source of Truth: Physics Ref ---
  const physicsRef = useRef<CameraState>(createInitialCameraState());

  // React state for rendering synchronization (throttled).
  // Seeded from a fresh factory object (same values as physicsRef's
  // initial state). All updates clone, so identity is never shared.
  const [cameraState, setCameraState] = useState<CameraState>(() =>
    createInitialCameraState(),
  );

  const mouse = useMemo<MouseState>(() => {
    // Normalize derived state from the REACT state (for rendering UI/Uniforms)
    const x = cameraState.theta / (2 * Math.PI);
    const y = cameraState.phi / Math.PI;
    return { x, y };
  }, [cameraState.theta, cameraState.phi]);

  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const touchState = useRef<TouchState>({
    touches: [],
    initialDistance: 0,
    initialAngle: 0,
    initialCenter: { x: 0, y: 0 },
  });

  // Last camera pose pushed to React (theta/phi + timestamp). The loop
  // syncs through this gate so idle auto-spin doesn't re-render the whole
  // App tree 30x/sec. Shared with input handlers via the rig for dedupe.
  // Declared with the other refs (above the rig memo) to avoid TDZ.
  const lastSynced = useRef({ theta: 0, phi: 0, time: 0 });

  // --- Cinematic State Machine (Physics Side) ---
  const cinematicRef = useRef<CinematicState>(createInitialCinematicState());

  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  // Single shared rig passed down to the sub-hooks (no duplicated ref state).
  const rig = useMemo<CameraRig>(
    () => ({
      physicsRef,
      cinematicRef,
      isDragging,
      lastMousePos,
      touchState,
      paramsRef,
      lastSynced,
    }),
    [],
  );

  // Coalesced zoom writer for per-frame cinematic steppers (fly-to, dwell
  // breathing, dive, orbit). The steppers run every rAF; pushing each zoom
  // straight to setParams re-rendered the full App 60x/sec during
  // cinematics. Queued fns flush at most once per frame, in order, with a
  // no-op guard so identical values skip React entirely. One-shot updates
  // (start/stop/reset) keep using setParams directly.
  const pendingZoomFns = useRef<Array<(z: number) => number>>([]);
  const zoomFlushQueued = useRef(false);
  const queueZoomSync = useCallback(
    (fn: (z: number) => number) => {
      pendingZoomFns.current.push(fn);
      if (zoomFlushQueued.current) return;
      zoomFlushQueued.current = true;
      requestAnimationFrame(() => {
        zoomFlushQueued.current = false;
        const fns = pendingZoomFns.current;
        pendingZoomFns.current = [];
        if (fns.length === 0) return;
        setParams((prev) => {
          let z = prev.zoom;
          for (const f of fns) z = f(z);
          if (Math.abs(z - prev.zoom) < 1e-4) return prev;
          return {
            ...prev,
            zoom: clampAndValidate(z, MIN_ZOOM, MAX_ZOOM, prev.zoom),
          };
        });
      });
    },
    [setParams],
  );

  const tour = useCameraTour(rig, { setParams, setCameraState, queueZoomSync });
  const input = useCameraInput(rig, {
    setParams,
    setCameraState,
    stopCinematic: tour.stopCinematic,
  });

  // --- Physics Animation Loop ---
  useEffect(() => {
    let animationFrameId: number;
    let frameCount = 0;
    // Cinematic/recovery motion is fast → sync every 2 frames (30Hz UI).
    // Idle/interactive drift is slow → evaluate every 6 frames (10Hz) and
    // push only on real movement (see gate below).
    const SYNC_INTERVAL_ACTIVE = 2;
    const SYNC_INTERVAL_IDLE = 6;
    // Radians of accumulated camera motion that justifies a React sync.
    // Auto-spin advances ~0.001 rad/frame, so idle pushes land roughly
    // every 4-6 frames anyway; the gate's real job is killing the
    // fully-static 30Hz churn (paused velocities, dwell phases).
    const SYNC_EPSILON_RAD = 0.004;
    // Heartbeat so UI/uniforms never go stale while mounted.
    const SYNC_HEARTBEAT_MS = 500;

    const applyMomentum = () => {
      const state = rig.physicsRef.current; // Direct access to shared state
      const cine = rig.cinematicRef.current;
      const now = performance.now();

      // Calculate delta time in seconds (max 0.1s to prevent huge jumps on lag)
      const dt = Math.min((now - cine.lastTime) * 0.001, 0.1);
      cine.lastTime = now;
      // Normalised 60Hz step count. The camera's momentum/damping constants
      // (damping = 0.92, autoSpin = rad per 60Hz frame, drag velocities) were
      // authored per rendered frame; multiplying by this factor keeps the
      // same feel at 60fps while making the motion refresh-rate independent
      // (a 144Hz panel used to integrate 2.4x faster than a 60Hz one).
      const step = dt * 60;

      // PAUSE GUARD: Skip all physics when simulation is paused
      if (rig.paramsRef.current.paused) {
        // Still schedule next frame so loop doesn't die
        animationFrameId = requestAnimationFrame(applyMomentum);
        return;
      }

      if (cine.recovering) {
        // --- RECOVERY PHASE: Smooth emergence back to pre-cinematic position ---
        tour.stepRecovery(now);
      } else if (cine.active && cine.mode) {
        // --- CINEMATIC MODE: DIRECTOR'S CUT ---
        const t = (now - cine.startTime) * 0.001;

        if (cine.mode === "viewpoint" || cine.mode === "viewpoints-tour") {
          // VIEWPOINT: FLY-TO-AND-DWELL (fly 4s, then characteristic dwell)
          tour.stepViewpoint(now, dt);
        } else if (cine.mode === "orbit") {
          // ORBIT TOUR: "THE GRAND SURVEY" (4-act keyframes + organic feel)
          tour.stepOrbit(now, dt, t);
        } else if (cine.mode === "dive") {
          // INFALL DIVE: "THE DESCENT INTO GARGANTUA" (3-act geodesic plunge)
          tour.stepDive(now, dt);
        }

        // Apply Damping for user input during cinematic
        const cinematicDamping = Math.pow(0.95, step);
        state.thetaVelocity *= cinematicDamping;
        state.phiVelocity *= cinematicDamping;

        state.theta += state.thetaVelocity * step;
        state.phi += state.phiVelocity * step;

        state.phi = Math.max(0.001, Math.min(Math.PI - 0.001, state.phi));
      } else {
        // --- INTERACTIVE MODE: USER CONTROL ---
        // Apply Drag Inertia / Momentum (per-60Hz-frame constants, scaled
        // by the actual elapsed step so the decay is wall-clock based).
        const damping = Math.pow(state.damping, step);
        state.thetaVelocity *= damping;
        state.phiVelocity *= damping;
        state.zoomVelocity *= damping;

        state.theta += state.thetaVelocity * step;
        state.phi += state.phiVelocity * step;

        // Auto-Spin (rad per 60Hz frame -> rad per second via `step`)
        const spinSpeed = rig.paramsRef.current.autoSpin ?? DEFAULT_AUTO_SPIN;
        if (
          !rig.isDragging.current &&
          rig.touchState.current.touches.length === 0 &&
          Math.abs(state.thetaVelocity) < 0.0001
        ) {
          state.theta += spinSpeed * step;
        }

        // Constraints
        state.phi = Math.max(0.001, Math.min(Math.PI - 0.001, state.phi));
        state.theta = state.theta % (2 * Math.PI);
        if (state.theta < 0) state.theta += 2 * Math.PI;

        // Deadzone
        if (Math.abs(state.thetaVelocity) < 0.00001) state.thetaVelocity = 0;
        if (Math.abs(state.phiVelocity) < 0.00001) state.phiVelocity = 0;
        if (Math.abs(state.zoomVelocity) < 0.00001) state.zoomVelocity = 0;
      }

      // Publish the integrated pose at rAF rate for the renderers (see
      // engine/camera-live). Placed AFTER integration so readers get this
      // tick's pose (≤1 frame lag regardless of rAF ordering). This is what
      // makes camera motion smooth: the React sync below is gated to ~10Hz
      // idle, which would otherwise step the uniforms visibly (judder →
      // dizziness with auto-spin on).
      pushLiveCamera(state.theta, state.phi);

      // --- Sync to React State ---
      // Gated push: cinematic/recovery sync at 30Hz for smooth uniforms;
      // drag input syncs via coalesced events in useCameraInput (so the loop
      // must NOT fast-path on isDragging — it would just duplicate those
      // pushes); idle drift syncs only on real accumulated motion or
      // heartbeat. Previously this pushed unconditionally every 2 frames,
      // re-rendering the entire App (ControlPanel, Telemetry, …) 30x/sec
      // even when the camera was effectively static.
      const fastPath = cine.active || cine.recovering;
      frameCount++;
      if (frameCount >= (fastPath ? SYNC_INTERVAL_ACTIVE : SYNC_INTERVAL_IDLE)) {
        frameCount = 0;
        // Shortest wrapped distance for theta (mod 2π).
        let dTheta =
          Math.abs(state.theta - rig.lastSynced.current.theta) % (2 * Math.PI);
        if (dTheta > Math.PI) dTheta = 2 * Math.PI - dTheta;
        const dPhi = Math.abs(state.phi - rig.lastSynced.current.phi);
        const heartbeat = now - rig.lastSynced.current.time > SYNC_HEARTBEAT_MS;

        if (
          fastPath ||
          dTheta > SYNC_EPSILON_RAD ||
          dPhi > SYNC_EPSILON_RAD ||
          heartbeat
        ) {
          rig.lastSynced.current = {
            theta: state.theta,
            phi: state.phi,
            time: now,
          };
          setCameraState({ ...state }); // Clone to trigger re-render

          // Zoom sync to Params (Interactive Mode Only)
          // In Cinematic mode, zoom is handled explicitly inside the block above
          if (!cine.active && Math.abs(state.zoomVelocity) > 0.0001) {
            setParams((prev) => ({
              ...prev,
              zoom: clampAndValidate(
                prev.zoom + state.zoomVelocity * step,
                MIN_ZOOM,
                MAX_ZOOM,
                prev.zoom,
              ),
            }));
          }
        }
      }

      animationFrameId = requestAnimationFrame(applyMomentum);
    };

    animationFrameId = requestAnimationFrame(applyMomentum);
    return () => cancelAnimationFrame(animationFrameId);
  }, [setParams]); // No other dependencies needed!

  return {
    mouse,
    cameraState,
    handleMouseDown: input.handleMouseDown,
    handleMouseMove: input.handleMouseMove,
    handleMouseUp: input.handleMouseUp,
    handleWheel: input.handleWheel,
    handleTouchStart: input.handleTouchStart,
    handleTouchMove: input.handleTouchMove,
    handleTouchEnd: input.handleTouchEnd,
    nudgeCamera: input.nudgeCamera,
    startCinematic: tour.startCinematic,
    startViewpoint: tour.startViewpoint,
    startAllViewpointsTour: tour.startAllViewpointsTour,
    stopCinematic: tour.stopCinematic,
    resetCamera: tour.resetCamera,
    isCinematic: tour.isCinematic,
    cinematicMode: tour.cinematicMode,
    currentViewpointId: tour.currentViewpointId,
    currentViewpointDef: tour.currentViewpointDef,
    tourIndex: tour.tourIndex,
    tourTotal: tour.tourTotal,
  };
}
