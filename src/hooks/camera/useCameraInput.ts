import { useCallback, useRef } from "react";
import type * as React from "react";
import { clampAndValidate, isValidNumber } from "@/utils/validation";
import type { SimulationParams } from "@/types/simulation";
import { MAX_ZOOM, MIN_ZOOM } from "./types";
import type { CameraRig, CameraState } from "./types";

interface InputDeps {
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>;
  setCameraState: React.Dispatch<React.SetStateAction<CameraState>>;
  stopCinematic: () => void;
}

/**
 * Camera input sub-hook (mouse / wheel / touch / nudge).
 * All handlers mutate the shared `rig` refs directly — no ref state
 * lives here. `stopCinematic` is owned by the tour sub-hook and
 * injected by the composer.
 */
export function useCameraInput(rig: CameraRig, deps: InputDeps) {
  const { setParams, setCameraState, stopCinematic } = deps;

  // Coalesces burst input events (mousemove/touchmove can fire 2-3x per
  // frame) into at most one React sync per frame. Physics refs update
  // immediately on every event — only the re-render is deferred.
  const syncQueued = useRef(false);
  const queueCameraSync = useCallback(() => {
    if (syncQueued.current) return;
    syncQueued.current = true;
    requestAnimationFrame(() => {
      syncQueued.current = false;
      const s = rig.physicsRef.current;
      rig.lastSynced.current = {
        theta: s.theta,
        phi: s.phi,
        time: performance.now(),
      };
      setCameraState({ ...s });
    });
  }, [rig, setCameraState]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isValidNumber(e.clientX) || !isValidNumber(e.clientY)) return;

      // Support left-click (button 0) and right-click (button 2) for orbiting.
      // Right-click provides an accessible alternative for users who may find
      // left-click drag awkward, and enables simultaneous interaction with
      // UI elements that use left-click.
      if (e.button !== 0 && e.button !== 2) return;

      // Only stop cinematic if we are NOT in a controlled dive
      if (rig.cinematicRef.current.mode !== "dive") {
        stopCinematic();
      }

      rig.isDragging.current = true;
      rig.lastMousePos.current.x = e.clientX;
      rig.lastMousePos.current.y = e.clientY;

      // Kill momentum on grab
      rig.physicsRef.current.thetaVelocity = 0;
      rig.physicsRef.current.phiVelocity = 0;
    },
    [rig, stopCinematic],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isValidNumber(e.clientX) || !isValidNumber(e.clientY)) return;
      if (rig.isDragging.current) {
        const deltaX = e.clientX - rig.lastMousePos.current.x;
        const deltaY = e.clientY - rig.lastMousePos.current.y;
        if (!isValidNumber(deltaX) || !isValidNumber(deltaY)) return;

        const sensitivity = 0.008;

        // Directly mutate physics state
        // Note: We add to position AND set velocity (for "throw" momentum on release)
        rig.physicsRef.current.theta += deltaX * sensitivity;
        rig.physicsRef.current.phi += deltaY * sensitivity;
        rig.physicsRef.current.thetaVelocity = deltaX * sensitivity * 0.4;
        rig.physicsRef.current.phiVelocity = deltaY * sensitivity * 0.4;

        rig.lastMousePos.current.x = e.clientX;
        rig.lastMousePos.current.y = e.clientY;

        // Coalesced sync (≤1/frame) for responsive drag without event storms
        queueCameraSync();
      }
    },
    [rig, queueCameraSync],
  );

  const handleMouseUp = useCallback(() => {
    rig.isDragging.current = false;
  }, [rig]);

  const nudgeCamera = useCallback(
    (dTheta: number, dPhi: number) => {
      stopCinematic();
      rig.physicsRef.current.thetaVelocity += dTheta;
      rig.physicsRef.current.phiVelocity += dPhi;
    },
    [rig, stopCinematic],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent | WheelEvent) => {
      e.preventDefault();
      if (!isValidNumber(e.deltaY)) return;

      if (rig.cinematicRef.current.mode !== "dive") {
        stopCinematic();
      }

      // Power-curve zoom sensitivity: always positive and scales naturally
      // across the 0.5–500 range. Uses sqrt(ratio) so:
      //   zoom=0.5 → 0.002  (fine control near event horizon)
      //   zoom=30  → 0.015  (normal feel at default distance)
      //   zoom=500 → 0.061  (fast traversal at max range)
      const currentZoom = rig.paramsRef.current.zoom;
      const ratio = currentZoom / 30.0;
      const sensitivity = 0.015 * Math.sqrt(ratio);
      const zoomDelta = e.deltaY * sensitivity;

      // Apply via velocity for smooth momentum feel, then clamp
      rig.physicsRef.current.zoomVelocity = zoomDelta * 0.4;

      setParams((prev) => ({
        ...prev,
        zoom: clampAndValidate(
          prev.zoom + zoomDelta,
          MIN_ZOOM,
          MAX_ZOOM,
          prev.zoom,
        ),
      }));
    },
    [rig, setParams, stopCinematic],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent | TouchEvent) => {
      e.preventDefault();

      // Only stop cinematic if we are NOT in a controlled dive
      // Match Desktop behavior: Allow user to look around while falling.
      if (rig.cinematicRef.current.mode !== "dive") {
        stopCinematic();
      }

      const touches = Array.from(e.touches) as React.Touch[];
      if (touches.length === 0) return;
      rig.touchState.current.touches = touches;

      const isValidTouch = (t: React.Touch) =>
        !isNaN(t.clientX) && !isNaN(t.clientY);

      if (touches.length === 2) {
        const [t0, t1] = touches;
        if (!t0 || !t1 || !isValidTouch(t0) || !isValidTouch(t1)) return;
        const dx = t1.clientX - t0.clientX;
        const dy = t1.clientY - t0.clientY;
        rig.touchState.current.initialDistance = Math.hypot(dx, dy);
        rig.touchState.current.initialAngle = Math.atan2(dy, dx);
        rig.touchState.current.initialCenter = {
          x: (t0.clientX + t1.clientX) / 2,
          y: (t0.clientY + t1.clientY) / 2,
        };
      } else if (touches.length === 1) {
        const [t0] = touches;
        if (!t0 || !isValidTouch(t0)) return;
        rig.lastMousePos.current.x = t0.clientX;
        rig.lastMousePos.current.y = t0.clientY;
        rig.physicsRef.current.thetaVelocity = 0;
        rig.physicsRef.current.phiVelocity = 0;
      }
    },
    [rig, stopCinematic],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent | TouchEvent) => {
      e.preventDefault();
      const touches = Array.from(e.touches) as React.Touch[];
      if (touches.length === 0) return;

      if (touches.length === 2) {
        const [t0, t1] = touches;
        if (!t0 || !t1) return;
        const dx = t1.clientX - t0.clientX;
        const dy = t1.clientY - t0.clientY;
        const currentDistance = Math.hypot(dx, dy);
        const currentCenter = {
          x: (t0.clientX + t1.clientX) / 2,
          y: (t0.clientY + t1.clientY) / 2,
        };

        // Zoom
        if (rig.touchState.current.initialDistance > 0) {
          const ratio = currentDistance / rig.touchState.current.initialDistance;
          const zoomDelta = (1 - ratio) * 2.0;
          setParams((prev) => ({
            ...prev,
            zoom: clampAndValidate(
              prev.zoom + zoomDelta,
              MIN_ZOOM,
              MAX_ZOOM,
              prev.zoom,
            ),
          }));
          rig.touchState.current.initialDistance = currentDistance;
        }

        // Pan (Move Camera)
        const panX = currentCenter.x - rig.touchState.current.initialCenter.x;
        const panY = currentCenter.y - rig.touchState.current.initialCenter.y;

        if (Math.abs(panX) > 2 || Math.abs(panY) > 2) {
          const sensitivity = 0.003;
          rig.physicsRef.current.theta += panX * sensitivity;
          rig.physicsRef.current.phi += panY * sensitivity;
          rig.touchState.current.initialCenter = currentCenter;
        }
      } else if (touches.length === 1) {
        const [t0] = touches;
        if (!t0) return;
        const deltaX = t0.clientX - rig.lastMousePos.current.x;
        const deltaY = t0.clientY - rig.lastMousePos.current.y;
        const sensitivity = 0.005;

        rig.physicsRef.current.theta += deltaX * sensitivity;
        rig.physicsRef.current.phi += deltaY * sensitivity;
        rig.physicsRef.current.thetaVelocity = deltaX * sensitivity * 0.5;
        rig.physicsRef.current.phiVelocity = deltaY * sensitivity * 0.5;

        rig.lastMousePos.current.x = t0.clientX;
        rig.lastMousePos.current.y = t0.clientY;
      }
      queueCameraSync();
    },
    [rig, setParams, queueCameraSync],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent | TouchEvent) => {
      e.preventDefault();
      const touches = Array.from(e.touches) as React.Touch[];
      rig.touchState.current.touches = touches;
      if (touches.length === 0) {
        rig.touchState.current.initialDistance = 0;
        rig.touchState.current.initialAngle = 0;
      }
    },
    [rig],
  );

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    nudgeCamera,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
