"use client";

import React, { useMemo, useRef, useEffect, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Radio,
  Film,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  X,
} from "lucide-react";
import {
  TOUR_DWELL_SECONDS,
  type ViewpointDef,
} from "@/config/viewpoints.config";
import { horizonRadius, iscoRadius, photonSphere } from "@/physics/kerr";

interface CinematicOverlayProps {
  isCinematic: boolean;
  zoom: number;
  cinematicMode?: "orbit" | "dive" | "viewpoint" | "viewpoints-tour" | null;
  currentViewpointDef?: ViewpointDef | null;
  tourIndex?: number;
  tourTotal?: number;
  /** Black-hole spin a* (shown in the scene data strip). */
  spin?: number;
  /** Black-hole mass M, for the metric radii in the scene data strip. */
  mass?: number;
  /** Dwell length per scene, for the countdown line. */
  dwellSeconds?: number;
  /** True while the tour dwell clock is frozen. */
  tourPaused?: boolean;
  onPrevViewpoint?: () => void;
  onNextViewpoint?: () => void;
  onToggleTourPause?: () => void;
  onExitTour?: () => void;
}

/** Polar angle (radians, 0 = north pole) → inclination above the disk plane. */
function inclinationDegrees(phi: number): number {
  return Math.abs(90 - (phi * 180) / Math.PI);
}

/**
 * Numeric readout for the active scene.
 *
 * Row 1 describes the observer (where the camera is). Row 2 describes the
 * spacetimes it is looking at — derived live from mass/spin, so the numbers
 * stay true if the user changes a* or M and then replays the tour.
 */
function SceneDataStrip({
  def,
  spin,
  mass,
}: {
  def: ViewpointDef;
  spin?: number;
  mass?: number;
}) {
  const inclination = inclinationDegrees(def.camera.phi);
  const belowPlane = def.camera.phi > Math.PI / 2;

  const metric = useMemo(() => {
    const m = mass && mass > 0 ? mass : 1;
    const s = spin ?? 0.5;
    return {
      horizon: horizonRadius(m, s),
      photon: photonSphere(m, s, true),
      isco: iscoRadius(m, s, true),
    };
  }, [mass, spin]);

  const observerItems = [
    { label: "Observer", value: `${Math.round(def.camera.zoom)} Rs` },
    {
      label: "Inclination",
      value: `${inclination.toFixed(0)}° ${belowPlane ? "below" : "above"}`,
    },
    {
      label: "Spin a*",
      value: spin !== undefined ? spin.toFixed(2) : "—",
    },
    { label: "Motion", value: def.animation.type },
  ];

  const metricItems = [
    { label: "Horizon r+", value: `${metric.horizon.toFixed(2)} M` },
    { label: "Photon r", value: `${metric.photon.toFixed(2)} M` },
    { label: "ISCO", value: `${metric.isco.toFixed(2)} M` },
    {
      label: "Observer r",
      value: `${(def.camera.zoom * 2 * (mass && mass > 0 ? mass : 1)).toFixed(0)} M`,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.5 }}
      className="flex flex-col items-center gap-1.5 mt-1 w-full"
    >
      {[observerItems, metricItems].map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1"
        >
          {row.map((item) => (
            <div key={item.label} className="flex items-baseline gap-1.5">
              <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-white/30">
                {item.label}
              </span>
              <span className="text-[10px] font-mono tabular-nums text-white/75">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      ))}
    </motion.div>
  );
}

const HORIZON_LIMIT = 2.0;
const WARNING_LIMIT = 4.0;
const CRITICAL_LIMIT = 2.5;
const LETTERBOX_HEIGHT = "6vh";

/**
 * CinematicOverlay — Movie-grade visual layer for the tour system.
 *
 * Provides:
 * - Cinematic letterbox bars (2.39:1 feel)
 * - Subtle film grain texture
 * - Dramatic viewpoint title cards with descriptions
 * - Fade-to-black scene transitions between viewpoints
 * - Tour progress bar
 * - ESC/click-to-exit hint
 * - Proximity telemetry near the horizon
 */
// Memoized: re-renders only when cinematic state/zoom actually change,
// not on every idle camera sync (zoom prop is stable at idle).
export const CinematicOverlay = memo(function CinematicOverlay({
  isCinematic,
  zoom,
  cinematicMode,
  currentViewpointDef,
  tourIndex,
  tourTotal,
  spin,
  mass,
  dwellSeconds = TOUR_DWELL_SECONDS,
  tourPaused = false,
  onPrevViewpoint,
  onNextViewpoint,
  onToggleTourPause,
  onExitTour,
}: CinematicOverlayProps) {
  // ── Proximity calculation ──
  const proximity = useMemo(() => {
    if (zoom > WARNING_LIMIT) return 0;
    return Math.max(
      0,
      Math.min(1, (WARNING_LIMIT - zoom) / (WARNING_LIMIT - HORIZON_LIMIT)),
    );
  }, [zoom]);

  const isCritical = zoom < CRITICAL_LIMIT;

  // A scene card is on screen → the big centre warning would sit on top of
  // the description and facts. The proximity reading moves into the card
  // instead (compact badge), so nothing is ever obscured.
  const showSceneCard =
    (cinematicMode === "viewpoint" || cinematicMode === "viewpoints-tour") &&
    currentViewpointDef !== null &&
    currentViewpointDef !== undefined;

  // ── Scene transition: detect viewpoint changes ──
  const prevViewpointIdRef = useRef<string | null>(null);
  const [sceneTransitioning, setSceneTransitioning] = useState(false);

  useEffect(() => {
    const newId = currentViewpointDef?.id ?? null;
    if (
      prevViewpointIdRef.current !== null &&
      prevViewpointIdRef.current !== newId
    ) {
      // Viewpoint changed → trigger brief fade-to-black
      setSceneTransitioning(true);
      const timer = setTimeout(() => setSceneTransitioning(false), 600);
      return () => clearTimeout(timer);
    }
    prevViewpointIdRef.current = newId;
  }, [currentViewpointDef?.id]);

  // ── Tour intro: show "The Journey Begins" for the first 3 seconds ──
  const [showTourIntro, setShowTourIntro] = useState(false);
  const introTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isCinematic && cinematicMode === "viewpoints-tour") {
      setShowTourIntro(true);
      introTimerRef.current = setTimeout(() => setShowTourIntro(false), 3000);
      return () => {
        if (introTimerRef.current) clearTimeout(introTimerRef.current);
      };
    } else {
      setShowTourIntro(false);
    }
  }, [isCinematic, cinematicMode]);

  // ── Tour progress percentage ──
  const tourProgress =
    tourTotal !== undefined && tourIndex !== undefined && tourTotal > 0
      ? ((tourIndex + 1) / tourTotal) * 100
      : 0;

  return (
    <AnimatePresence>
      {isCinematic && (
        <div className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between">
          {/* ═══════════════════════════════════════════════════════════
              LETTERBOX BARS — Cinematic 2.39:1 aspect ratio feel
              ═══════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: LETTERBOX_HEIGHT }}
            exit={{ height: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute top-0 left-0 right-0 bg-black z-50"
          />
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: LETTERBOX_HEIGHT }}
            exit={{ height: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute bottom-0 left-0 right-0 bg-black z-50"
          />

          {/* ═══════════════════════════════════════════════════════════
              FILM GRAIN — Subtle animated noise texture
              ═══════════════════════════════════════════════════════════ */}
          <div
            className="absolute inset-0 z-[45] opacity-[0.03] mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              backgroundSize: "128px 128px",
              animation: "grain 0.5s steps(6) infinite",
            }}
          />

          {/* ═══════════════════════════════════════════════════════════
              SCENE TRANSITION — Fade to black between viewpoints
              ═══════════════════════════════════════════════════════════ */}
          <AnimatePresence>
            {sceneTransitioning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="absolute inset-0 bg-black z-[60]"
              />
            )}
          </AnimatePresence>

          {/* ═══════════════════════════════════════════════════════════
              TOUR INTRO — "The Journey Begins" title card
              ═══════════════════════════════════════════════════════════ */}
          <AnimatePresence>
            {showTourIntro && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 z-[70] flex items-center justify-center bg-black/80"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                  className="flex flex-col items-center gap-6"
                >
                  <Film className="w-8 h-8 text-white/40" />
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-[9px] font-mono text-white/30 uppercase tracking-[0.5em]">
                      A Cinematic Tour
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-thin text-white tracking-[0.15em] uppercase">
                      The Journey Begins
                    </h2>
                    <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent mt-2" />
                  </div>
                  {tourTotal !== undefined && (
                    <span className="text-[8px] font-mono text-white/20 uppercase tracking-[0.3em]">
                      {tourTotal} Viewpoints Await
                    </span>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══════════════════════════════════════════════════════════
              VIEWPOINT TITLE CARD — Dramatic cinematic typography
              ═══════════════════════════════════════════════════════════ */}
          {/* Top scrim — keeps the card legible over a bright disk */}
          <AnimatePresence>
            {showSceneCard && !showTourIntro && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute top-0 inset-x-0 h-[50vh] z-40 bg-gradient-to-b from-black/85 via-black/55 to-transparent"
              />
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {(cinematicMode === "viewpoint" ||
              cinematicMode === "viewpoints-tour") &&
              currentViewpointDef &&
              !showTourIntro && (
                <motion.div
                  key={currentViewpointDef.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="absolute top-[8vh] left-0 right-0 flex justify-center z-50"
                  role="status"
                  aria-live="polite"
                  aria-label={`Scene ${(tourIndex ?? 0) + 1}: ${currentViewpointDef.name}. ${currentViewpointDef.subtitle}. ${currentViewpointDef.description}`}
                >
                  <div className="flex flex-col items-center gap-2.5 px-6 sm:px-10 py-4 max-w-lg lg:max-w-xl text-center">
                    {/* Scene number badge */}
                    {cinematicMode === "viewpoints-tour" &&
                      tourIndex !== undefined && (
                        <motion.span
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="text-[8px] font-mono text-white/25 uppercase tracking-[0.5em]"
                        >
                          Scene {tourIndex + 1} of {tourTotal}
                        </motion.span>
                      )}

                    {/* Viewpoint name — large, dramatic */}
                    <motion.h2
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15, duration: 0.5 }}
                      className="text-lg sm:text-xl font-thin text-white tracking-[0.2em] uppercase leading-tight"
                    >
                      {currentViewpointDef.name}
                    </motion.h2>

                    {/* Subtitle */}
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3, duration: 0.4 }}
                      className="text-[9px] font-mono text-white/35 uppercase tracking-[0.25em]"
                    >
                      {currentViewpointDef.subtitle}
                    </motion.span>

                    {/* Decorative line */}
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: 0.4, duration: 0.6 }}
                      className="w-24 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    />

                    {/* Description — poetic, readable */}
                    <motion.p
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.6 }}
                      className="text-xs sm:text-[13px] text-white/75 leading-relaxed max-w-md font-light"
                    >
                      {currentViewpointDef.description}
                    </motion.p>

                    {/* Numeric scene readout */}
                    <SceneDataStrip
                      def={currentViewpointDef}
                      spin={spin}
                      mass={mass}
                    />

                    {/* Compact horizon-proximity badge (the big centre
                        warning is suppressed while this card is up) */}
                    {proximity > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.55 }}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border mt-0.5 ${
                          isCritical
                            ? "border-red-500/40 bg-red-500/10"
                            : "border-accent-cyan/30 bg-accent-cyan/5"
                        }`}
                      >
                        <AlertTriangle
                          className={`w-2.5 h-2.5 ${isCritical ? "text-red-400 animate-pulse" : "text-accent-cyan/80"}`}
                        />
                        <span
                          className={`text-[7px] font-mono uppercase tracking-[0.25em] ${isCritical ? "text-red-300" : "text-accent-cyan/80"}`}
                        >
                          {isCritical
                            ? "Horizon proximity: critical"
                            : "Horizon proximity"}{" "}
                          <span className="tabular-nums">
                            {((1 - proximity) * 100).toFixed(0)}%
                          </span>
                        </span>
                      </motion.div>
                    )}

                    {/* Physics facts for this viewpoint */}
                    {currentViewpointDef.facts?.length ? (
                      <motion.ul
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.5 }}
                        className="flex flex-col items-start gap-1 mt-1 w-full max-w-md"
                      >
                        {currentViewpointDef.facts.map((fact) => (
                          <li
                            key={fact}
                            className="flex items-start gap-2 text-[10px] sm:text-[11px] text-white/55 font-mono leading-snug text-left"
                          >
                            <span
                              className="mt-[5px] w-1 h-1 rounded-full shrink-0"
                              style={{
                                backgroundColor: `hsl(${currentViewpointDef.hue}, 60%, 60%)`,
                              }}
                            />
                            <span>{fact}</span>
                          </li>
                        ))}
                      </motion.ul>
                    ) : null}

                    {/* Dwell countdown — one sweep per scene, frozen while
                        the tour is paused. Keyed by scene so it restarts. */}
                    {cinematicMode === "viewpoints-tour" && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        className="flex flex-col items-center gap-1 mt-1 w-40 sm:w-52"
                      >
                        <div className="w-full h-[2px] bg-white/8 rounded-full overflow-hidden">
                          <div
                            key={currentViewpointDef.id}
                            className="h-full origin-left rounded-full"
                            style={{
                              background: `linear-gradient(to right, hsla(${currentViewpointDef.hue}, 60%, 60%, 0.35), hsla(${currentViewpointDef.hue}, 60%, 70%, 0.9))`,
                              animation: `scene-dwell ${dwellSeconds}s linear forwards`,
                              animationPlayState: tourPaused
                                ? "paused"
                                : "running",
                            }}
                          />
                        </div>
                        <span className="text-[7px] font-mono uppercase tracking-[0.3em] text-white/30">
                          {tourPaused
                            ? "Scene held"
                            : `Next scene in ${Math.round(dwellSeconds)}s`}
                        </span>
                      </motion.div>
                    )}

                    {/* Color accent dot */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: 0.6,
                        type: "spring",
                        stiffness: 200,
                      }}
                      className="w-1.5 h-1.5 rounded-full mt-0.5"
                      style={{
                        backgroundColor: `hsl(${currentViewpointDef.hue}, 60%, 60%)`,
                        boxShadow: `0 0 12px hsla(${currentViewpointDef.hue}, 60%, 50%, 0.4)`,
                      }}
                    />
                  </div>
                </motion.div>
              )}
          </AnimatePresence>

          {/* ═══════════════════════════════════════════════════════════
              CENTER EFFECTS — Critical proximity warnings
              ═══════════════════════════════════════════════════════════ */}
          <div className="absolute inset-0 flex items-center justify-center">
            {isCritical && !showSceneCard && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-mono text-red-500 tracking-[0.3em] uppercase opacity-80 mb-1">
                      EVENT HORIZON PROXIMITY
                    </span>
                    <span className="text-3xl font-thin tracking-[0.2em] uppercase text-white drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]">
                      CRITICAL
                    </span>
                  </div>
                  <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                </div>
                <div className="h-[1px] w-32 bg-gradient-to-r from-transparent via-red-500/50 to-transparent mt-2" />
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[8px] font-mono text-red-400/60 tracking-widest uppercase">
                    SINGULARITY APPROACH VECTOR LOCKED
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════
              TELEMETRY — Proximity signal indicator
              ═══════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute bottom-[9vh] left-6 sm:left-8 flex flex-col items-start gap-2 z-50"
          >
            {proximity > 0 && (
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-mono text-accent-cyan/60 tracking-[0.2em] uppercase">
                    TELEMETRY LINK
                  </span>
                  <div className="h-[1px] w-8 bg-accent-cyan/20" />
                </div>
                <div className="flex items-center gap-2 px-2 py-1 bg-black/20 border border-white/5 rounded-sm backdrop-blur-sm">
                  <Radio
                    className={`w-3 h-3 ${isCritical ? "text-red-500" : "text-accent-cyan"} animate-pulse`}
                  />
                  <span
                    className={`text-[9px] font-mono tracking-[0.15em] uppercase tabular-nums ${isCritical ? "text-red-400" : "text-accent-cyan/90"}`}
                  >
                    SIGNAL: {((1 - proximity) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </motion.div>

          {/* ═══════════════════════════════════════════════════════════
              BOTTOM BAR — Tour progress + ESC hint
              ═══════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.8 }}
            className="absolute bottom-[8vh] left-0 right-0 z-50 flex flex-col items-center gap-3"
          >
            {/* Tour progress bar */}
            {cinematicMode === "viewpoints-tour" &&
              tourTotal !== undefined &&
              tourTotal > 1 && (
                <div className="flex flex-col items-center gap-2 w-48 sm:w-64">
                  <div className="w-full h-[2px] bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-white/20 to-white/60 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${tourProgress}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                  <span className="text-[7px] font-mono text-white/20 uppercase tracking-[0.3em]">
                    {tourIndex !== undefined ? tourIndex + 1 : 0} / {tourTotal}
                  </span>
                </div>
              )}

            {/* Tour transport — previous / pause / next / exit */}
            {cinematicMode === "viewpoints-tour" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="pointer-events-auto flex items-center gap-1.5"
              >
                <button
                  type="button"
                  onClick={onPrevViewpoint}
                  disabled={tourIndex === 0}
                  aria-label="Previous viewpoint"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-white/10 bg-black/40 backdrop-blur-sm text-white/60 hover:text-white hover:border-white/30 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3 h-3" />
                  <span className="text-[7px] font-mono uppercase tracking-[0.2em]">
                    Prev
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onToggleTourPause}
                  aria-label={tourPaused ? "Resume tour" : "Pause tour"}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-white/15 bg-black/40 backdrop-blur-sm text-white/75 hover:text-white hover:border-white/35 transition-colors"
                >
                  {tourPaused ? (
                    <Play className="w-3 h-3" />
                  ) : (
                    <Pause className="w-3 h-3" />
                  )}
                  <span className="text-[7px] font-mono uppercase tracking-[0.2em]">
                    {tourPaused ? "Resume" : "Pause"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onNextViewpoint}
                  aria-label="Next viewpoint"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-white/10 bg-black/40 backdrop-blur-sm text-white/60 hover:text-white hover:border-white/30 transition-colors"
                >
                  <span className="text-[7px] font-mono uppercase tracking-[0.2em]">
                    Next
                  </span>
                  <ChevronRight className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  onClick={onExitTour}
                  aria-label="Exit tour"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-white/10 bg-black/40 backdrop-blur-sm text-white/50 hover:text-red-300 hover:border-red-400/40 transition-colors"
                >
                  <X className="w-3 h-3" />
                  <span className="text-[7px] font-mono uppercase tracking-[0.2em]">
                    Exit
                  </span>
                </button>
              </motion.div>
            )}

            {/* ESC / click hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              className="flex items-center gap-2"
            >
              <span className="text-[7px] font-mono text-white/15 uppercase tracking-[0.3em]">
                <kbd className="px-1 py-0.5 border border-white/10 rounded text-[6px]">
                  ESC
                </kbd>{" "}
                exit{" · "}
                <kbd className="px-1 py-0.5 border border-white/10 rounded text-[6px]">
                  [
                </kbd>{" "}
                <kbd className="px-1 py-0.5 border border-white/10 rounded text-[6px]">
                  ]
                </kbd>{" "}
                scene{" · "}
                <kbd className="px-1 py-0.5 border border-white/10 rounded text-[6px]">
                  SPACE
                </kbd>{" "}
                pause
              </span>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});
