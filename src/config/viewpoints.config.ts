/**
 * Cinematic Viewpoints
 *
 * Pre-defined camera positions with characteristic animations.
 * Each viewpoint places the observer at a specific (theta, phi, zoom)
 * in Boyer–Lindquist–style spherical coordinates and may apply a
 * subtle motion (slow orbit, drift, or still) while dwelling.
 *
 * Theta:   azimuthal angle (0 – 2π). π is the "front" (default).
 * Phi:     polar angle    (0 – π). π/2 is equatorial, 0 is north pole.
 * Zoom:    observer distance in Schwarzschild radii (0.5 – 500).
 *          The shader receives r = zoom * 2 * M, so `zoom` "Rs" equals
 *          2 M of Boyer–Lindquist radius. Metric radii (horizon, photon
 *          sphere, ISCO) are quoted below in units of M.
 *
 * Frame geometry (default a* = 0.5, M = 1, 45° vertical FOV):
 *   horizon r+ = 1.87 M, photon sphere = 2.35 M, ISCO = 4.23 M,
 *   critical impact parameter b_c = 4.6 M. The shadow's angular radius is
 *   asin(b_c / r), so anything closer than ~6 M fills the frame with shadow
 *   and anything inside 4.23 M cannot see the disk at all.
 */

export interface ViewpointDef {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  /**
   * Short, concrete physics readouts shown under the description during the
   * tour (observer distance, inclination, lensing behaviour, ...). Static
   * strings quoted for the default M = 1, a* = 0.5 configuration.
   */
  facts: string[];
  /** Theme colour used for the UI badge (HSL hue) */
  hue: number;
  camera: {
    theta: number;
    phi: number;
    zoom: number;
  };
  animation: {
    type: "orbit" | "drift" | "still";
    /** Orbital angular speed (rad/s). Only meaningful for type "orbit". */
    speed?: number;
  };
  /**
   * How long (seconds) the viewpoint dwells before auto-returning.
   * 0 means "stay until the user interacts or picks another viewpoint."
   */
  duration: number;
}

export const VIEWPOINTS: ViewpointDef[] = [
  {
    id: "grand-survey",
    name: "The Grand Survey",
    subtitle: "Establishing wide",
    description:
      "A majestic overhead perspective — the entire accretion disk laid out like a cosmic map. Warm hydrogen-alpha glow fills the frame as the black hole commands the centre.",
    facts: [
      "Observer 80 Rs (160 M) out — the whole disk fits in frame",
      "Disk outer edge ~50 M; the visible edge fades inside that",
      "Doppler beaming brightens the approaching side",
    ],
    hue: 210,
    camera: { theta: Math.PI, phi: 0.7, zoom: 80 },
    animation: { type: "orbit", speed: 0.08 },
    duration: 0,
  },
  {
    id: "bardeen-gaze",
    name: "Bardeen's Gaze",
    subtitle: "The iconic angle",
    description:
      "The classic 30° above the equatorial plane — made famous by Interstellar. The accretion disk sweeps diagonally across the field, revealing both the photon ring and the Doppler-boosted approaching side.",
    facts: [
      "Camera 30° above the disk plane",
      "Lensed far side lifts over the shadow",
      "Photon ring at 2.35 M for a* = 0.5",
    ],
    hue: 30,
    camera: { theta: Math.PI, phi: 1.05, zoom: 25 },
    animation: { type: "orbit", speed: 0.12 },
    duration: 0,
  },
  {
    id: "equatorial-ring",
    name: "Equatorial Ring",
    subtitle: "Edge-on, dead centre",
    description:
      "Dead-centre equatorial view. The black hole shadow bisects the disk perfectly. This perspective makes the ISCO boundary and the asymmetry of the Kerr shadow unmistakable.",
    facts: [
      "Camera exactly in the equatorial plane",
      "Shadow bisects the disk: Kerr asymmetry visible",
      "ISCO at 4.23 M for a* = 0.5",
    ],
    hue: 170,
    camera: { theta: Math.PI, phi: Math.PI / 2, zoom: 35 },
    animation: { type: "orbit", speed: 0.15 },
    duration: 0,
  },
  {
    id: "polar-majesty",
    name: "Polar Majesty",
    subtitle: "Over the north pole",
    description:
      "Straight down from the rotation axis. The photon ring forms a perfect circle while the disk radiates outward. Frame-dragging manifests as a subtle twist in the inner disk structure.",
    facts: [
      "Looking down the spin axis",
      "Lense–Thirring drag twists the inner orbits",
      "Shadow reads almost circular from the pole",
    ],
    hue: 280,
    camera: { theta: Math.PI, phi: 0.15, zoom: 50 },
    animation: { type: "orbit", speed: 0.06 },
    duration: 0,
  },
  {
    id: "photon-ring",
    name: "Photon Ring Close-Up",
    subtitle: "At the edge of darkness",
    description:
      "Pushing in to just outside the photon sphere. The primary and secondary images of the disk become visible as nested rings. Each orbit of light skims the black hole before escaping to the observer.",
    facts: [
      "16 M out — 8.6× the horizon radius (1.87 M)",
      "Shadow fills ~3/4 of the frame at this range",
      "Nested rings = primary + secondary disk images",
    ],
    hue: 350,
    camera: { theta: Math.PI + 0.3, phi: 1.2, zoom: 8 },
    animation: { type: "drift", speed: 0.04 },
    duration: 0,
  },
  {
    id: "the-whisper",
    name: "The Whisper",
    subtitle: "Skimming the horizon",
    description:
      "The closest the tour dares. Only 3.4 horizon radii out, the shadow swallows nearly the entire sky; the disk's inner edge passes overhead and the universe above is compressed into a shrinking, blue-shifted window.",
    facts: [
      "6.4 M out — 3.4× the horizon radius (1.87 M)",
      "Shadow swallows nearly the whole sky",
      "Disk inner edge (ISCO 4.23 M) passes above the camera",
    ],
    hue: 0,
    camera: { theta: Math.PI, phi: Math.PI / 2, zoom: 3.2 },
    animation: { type: "drift", speed: 0.02 },
    duration: 0,
  },
  {
    id: "disk-edge-on",
    name: "Disk Edge-On",
    subtitle: "Through the plane",
    description:
      "Rotated 90° to look along the accretion disk plane. The disk appears as a razor-thin line bisected by the black hole shadow. Perfect for appreciating the scale and thinness of the Novikov–Thorne disk.",
    facts: [
      "Camera 1.2° above the disk plane, at 90 M",
      "Disk reads as a razor-thin line",
      "Scale height H/R ≈ 0.1",
    ],
    hue: 60,
    camera: { theta: Math.PI / 2, phi: 1.55, zoom: 45 },
    animation: { type: "orbit", speed: 0.1 },
    duration: 0,
  },
  {
    id: "below-the-abyss",
    name: "Below the Abyss",
    subtitle: "Under the disk",
    description:
      "From beneath the accretion plane, looking upward. The disk back-light glows in silhouette against the cosmic background. The ergosphere's distortion of spacetime is visible as a subtle asymmetry.",
    facts: [
      "Below the equatorial plane, looking up",
      "Disk back-lights the shadow in silhouette",
      "Ergosphere distorts the passing light",
    ],
    hue: 240,
    camera: { theta: Math.PI, phi: 2.8, zoom: 20 },
    animation: { type: "drift", speed: 0.05 },
    duration: 0,
  },
  {
    id: "cosmic-panorama",
    name: "The Cosmic Panorama",
    subtitle: "Full celestial context",
    description:
      "Pulled way back for the big picture. The black hole shrinks to a bright speck surrounded by its accretion disk, while the full grandeur of the Milky Way and extragalactic stars dominates the field.",
    facts: [
      "400 Rs out — the hole is a bright speck",
      "Milky Way and extragalactic field dominate",
      "Lensing still bends the background stars",
    ],
    hue: 190,
    camera: { theta: Math.PI, phi: 1.2, zoom: 400 },
    animation: { type: "still" },
    duration: 0,
  },
  {
    id: "frame-drag-reveal",
    name: "Frame Drag Reveal",
    subtitle: "Lense–Thirring effect",
    description:
      "A high-inclination angle that maximises the visible asymmetry of the Kerr spacetime. The approaching side of the disk appears brighter and blue-shifted; the receding side dims to red. Frame-dragging twists the inner region.",
    facts: [
      "High inclination (~61° above the plane)",
      "Approaching side blue-shifted, receding side reddens",
      "Frame dragging twists the inner region",
    ],
    hue: 120,
    camera: { theta: Math.PI + 0.5, phi: 0.5, zoom: 25 },
    animation: { type: "orbit", speed: 0.13 },
    duration: 0,
  },
  {
    id: "retrograde-ascent",
    name: "Retrograde Ascent",
    subtitle: "Counter-rotating view",
    description:
      "From the retrograde side of the accretion disk. The counter-rotating material experiences a larger ISCO, creating a wider gap between the horizon and the inner disk edge. The shadow appears slightly larger.",
    facts: [
      "Viewed from the retrograde side",
      "Counter-rotating ISCO sits farther out",
      "Shadow shifts and grows with spin direction",
    ],
    hue: 330,
    camera: { theta: Math.PI + 1.0, phi: 1.8, zoom: 30 },
    animation: { type: "orbit", speed: 0.09 },
    duration: 0,
  },
  {
    id: "kerr-vortex",
    name: "Kerr Vortex",
    subtitle: "Spin asymmetry close-up",
    description:
      "A close, oblique angle that dramatically reveals the Kerr metric's signature: the photon ring is squashed on the approaching side and stretched on the receding side. The inner disk shows the characteristic cardioid shape.",
    facts: [
      "Close oblique view at 12 Rs",
      "Photon ring squashed on the approaching side",
      "Inner disk takes the cardioid shape",
    ],
    hue: 20,
    camera: { theta: Math.PI + 0.8, phi: 1.2, zoom: 12 },
    animation: { type: "drift", speed: 0.06 },
    duration: 0,
  },
];

/**
 * Seconds each scene dwells during the auto-tour (after the fly-in).
 * Long enough to read the description plus the three physics facts: the
 * description lands at ~0.5 s and the last fact at ~0.8 s.
 */
export const TOUR_DWELL_SECONDS = 14;

/** Look up a viewpoint by its id. Returns undefined if not found. */
export function getViewpoint(id: string): ViewpointDef | undefined {
  return VIEWPOINTS.find((v) => v.id === id);
}

/** Return the default viewpoint (first in the list). */
export function getDefaultViewpoint(): ViewpointDef {
  return VIEWPOINTS[0]!;
}
