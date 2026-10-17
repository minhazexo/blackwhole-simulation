/**
 * Live camera bus (rAF-rate, React-free).
 *
 * The useCamera animation loop integrates theta/phi every frame but only
 * pushes to React state on a gated cadence (10Hz idle + epsilon). If the
 * renderers consumed camera angles through React props, the image would
 * advance in visible steps — judder on every edge, a direct dizziness
 * source with auto-spin always on.
 *
 * Instead the loop writes the fresh pose here every frame (two float
 * stores, no allocation, no re-render) and both renderers read it when
 * uploading `u_mouse` / computing view matrices. The React `mouse` prop
 * remains as the pre-first-frame fallback (seq === 0) and for API
 * compatibility.
 *
 * Single-writer contract: exactly one useCamera instance is mounted
 * (page root), so no arbitration is needed.
 */
export const liveCamera = {
  /** Azimuthal angle, radians (matches CameraState.theta). */
  theta: Math.PI,
  /** Polar angle, radians (matches CameraState.phi). */
  phi: 1.693,
  /** Incremented on every push; 0 = never seeded (use prop fallback). */
  seq: 0,
};

/** Publish the latest integrated pose. Called every rAF tick. */
export function pushLiveCamera(theta: number, phi: number): void {
  liveCamera.theta = theta;
  liveCamera.phi = phi;
  liveCamera.seq += 1;
}
