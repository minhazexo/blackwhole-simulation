"use client";

import React, { useMemo, useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Radio, Camera, Film } from "lucide-react";
import type { ViewpointDef } from "@/configs/viewpoints";

interface CinematicOverlayProps {
  isCinematic: boolean;
  zoom: number;
  cinematicMode?: "orbit" | "dive" | "viewpoint" | "viewpoints-tour" | null;
  currentViewpointDef?: ViewpointDef | null;
  tourIndex?: number;
  tourTotal?: number;
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
export const CinematicOverlay = ({
  isCinematic,
  zoom,
  cinematicMode,
  currentViewpointDef,
  tourIndex,
  tourTotal,
}: CinematicOverlayProps) => {
  // ── Proximity calculation ──
  const proximity = useMemo(() => {
    if (zoom > WARNING_LIMIT) return 0;
    return Math.max(
      0,
      Math.min(1, (WARNING_LIMIT - zoom) / (WARNING_LIMIT - HORIZON_LIMIT)),
    );
  }, [zoom]);

  const isCritical = zoom < CRITICAL_LIMIT;

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
                  className="absolute top-[10vh] left-0 right-0 flex justify-center z-50"
                >
                  <div className="flex flex-col items-center gap-3 px-8 py-5 max-w-md text-center">
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
                      className="text-[11px] sm:text-xs text-white/40 leading-relaxed max-w-sm font-light"
                    >
                      {currentViewpointDef.description}
                    </motion.p>

                    {/* Color accent dot */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: 0.6,
                        type: "spring",
                        stiffness: 200,
                      }}
                      className="w-2 h-2 rounded-full mt-1"
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
            {isCritical && (
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
            className="absolute top-[12vh] right-8 flex flex-col items-end gap-2 z-50"
          >
            {proximity > 0 && (
              <div className="flex flex-col items-end gap-1">
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

            {/* ESC / click hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              className="flex items-center gap-2"
            >
              <span className="text-[7px] font-mono text-white/15 uppercase tracking-[0.3em]">
                Press{" "}
                <kbd className="px-1 py-0.5 border border-white/10 rounded text-[6px]">
                  ESC
                </kbd>{" "}
                or click anywhere to exit
              </span>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
