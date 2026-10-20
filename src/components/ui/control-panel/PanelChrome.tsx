import type { ReactNode } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Power, RefreshCcw, Settings } from "lucide-react";
import { AudioControl } from "../AudioControl";
import { UserProfile } from "../UserProfile";
import type { SimulationParams } from "@/types/simulation";
import type { ControlTab } from "./controls";

export interface PanelChromeProps {
  showUI: boolean;
  isCompact: boolean;
  onCompactChange: (compact: boolean) => void;
  onToggleUI: (show: boolean) => void;
  activeTab: ControlTab;
  onTabChange: (tab: ControlTab) => void;
  calculatedRadii: {
    eventHorizon: number;
    photonSphere: number;
    isco: number;
  };
  params: SimulationParams;
  handleParamChange: (params: SimulationParams) => void;
  handleReset: () => void;
  isResetting: boolean;
  isCinematic?: boolean;
  audioPlaying?: boolean;
  audioVolume?: number;
  onAudioToggle?: () => void;
  onAudioVolumeChange?: (volume: number) => void;
  children: ReactNode;
}

export const PanelChrome = ({
  showUI,
  isCompact,
  onCompactChange,
  onToggleUI,
  activeTab,
  onTabChange,
  calculatedRadii,
  params,
  handleParamChange,
  handleReset,
  isResetting,
  isCinematic,
  audioPlaying,
  audioVolume,
  onAudioToggle,
  onAudioVolumeChange,
  children,
}: PanelChromeProps) => {
  return (
    <AnimatePresence mode="wait">
      {showUI &&
        (isCompact ? (
          /* --- COMPACT MODE: FLOATING ACCESS NODE --- */
          <motion.div
            key="compact-node"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 p-2"
          >
            <div className="flex flex-col-reverse items-center justify-center">
              <button
                onClick={() => onCompactChange(false)}
                className="text-white hover:text-white/80 transition-colors"
                title="Open Settings"
                aria-label="Open Settings"
              >
                <Settings className="w-6 h-6 sm:w-7 h-7 lg:w-8 h-8 animate-[spin_8s_linear_infinite] opacity-80 hover:opacity-100" />
              </button>
              <UserProfile />
            </div>
          </motion.div>
        ) : (
          /* --- FULL MODE: UNIFIED CONTROL CHASSIS (Adaptive Panels) --- */
          <div className="fixed bottom-0 left-0 w-full h-full pointer-events-none z-30 flex flex-col items-center justify-end p-2 sm:p-4 pb-4 pt-16">
            <motion.div
              key="full-system"
              initial={{ y: 50, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 150, damping: 25 }}
              className="w-[98%] sm:w-[94%] lg:max-w-3xl xl:max-w-5xl pointer-events-auto"
            >
              <div className="relative group overflow-hidden rounded-3xl glass-subtle-frost border border-white/10 shadow-2xl">
                {/* Liquid Glass Infrastructure */}
                <div className="absolute inset-0 liquid-glass-highlight z-1 pointer-events-none" />
                <div className="absolute inset-x-0 top-0 liquid-glass-top-line z-30" />

                {/* CONTENT LAYER: High-Density Active Manifold */}
                <div className="relative z-40 p-5 md:p-8">
                  {/* Header Anchor: Identity & Responsive Telemetry */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <Image
                        src="/brand-logo.png"
                        alt="Interactive Black Hole Simulation Physics Engine"
                        width={48}
                        height={48}
                        className="w-12 h-12 object-contain icon-glow shrink-0"
                        priority
                      />
                      <div>
                        <h2 className="text-white text-[13px] font-extralight tracking-[0.3em] uppercase leading-none mb-1 text-glow">
                          Scientific Visualization
                        </h2>
                        <div className="flex items-center gap-2">
                          <p className="text-white/60 text-[7px] font-mono tracking-[0.15em] font-medium uppercase">
                            by Minhazexo
                          </p>
                          <button
                            onClick={() => onToggleUI(false)}
                            className="text-[9px] text-white/40 hover:text-white uppercase tracking-widest border border-white/10 px-1.5 rounded-sm hover:bg-white/10 transition-colors"
                            aria-label="Hide Control Panel"
                          >
                            Hide
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Unified Responsive Telemetry Rail */}
                    <div className="flex flex-wrap items-center justify-around gap-4 sm:gap-6 px-4 py-2 bg-white/[0.03] rounded-2xl border border-white/5 w-full sm:w-auto">
                      <div className="flex flex-col items-center sm:items-start min-w-[50px]">
                        <span className="text-white/25 text-[7px] font-bold uppercase tracking-[0.1em]">
                          Event Horizon
                        </span>
                        <span className="text-[10px] font-mono text-white/80 tabular-nums">
                          {calculatedRadii.eventHorizon.toFixed(2)}M
                        </span>
                      </div>
                      <div className="flex flex-col items-center sm:items-start min-w-[50px]">
                        <span className="text-white/60 text-[7px] font-black uppercase tracking-[0.15em]">
                          Photon Ring
                        </span>
                        <span className="text-[10px] font-mono text-white font-bold tabular-nums">
                          {calculatedRadii.photonSphere.toFixed(2)}M
                        </span>
                      </div>
                      <div className="flex flex-col items-center sm:items-start min-w-[50px]">
                        <span className="text-white/60 text-[7px] font-black uppercase tracking-[0.15em]">
                          Stable Orbit
                        </span>
                        <span className="text-[10px] font-mono text-white font-bold tabular-nums">
                          {calculatedRadii.isco.toFixed(2)}M
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Scrollable Instrumentation Manifold (Responsive Chassis) */}
                  <div className="max-h-[55vh] sm:max-h-[60vh] overflow-y-auto overflow-x-hidden pr-1.5 custom-scrollbar pb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-min items-start mb-6">
                      {children}
                    </div>
                  </div>

                  {/* Audio Control — always visible in full mode */}
                  <div className="mt-4">
                    {audioPlaying !== undefined && (
                      <AudioControl
                        isPlaying={audioPlaying}
                        volume={audioVolume ?? 0.5}
                        onToggle={onAudioToggle ?? (() => {})}
                        onVolumeChange={onAudioVolumeChange ?? (() => {})}
                      />
                    )}
                  </div>
                </div>

                {/* --- DOCKED NAVIGATION RAIL: Sleek Glass Footer --- */}
                <div className="relative z-50 px-6 pb-3 pt-0 pointer-events-auto">
                  {/* Command Triad: Global Action Hub */}
                  <div className="flex gap-2 max-w-lg mx-auto mb-2">
                    <button
                      onClick={handleReset}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[8px] tracking-[0.1em] uppercase transition-all duration-300 border ${
                        isCinematic
                          ? "bg-red-500/20 border-red-500/40 text-red-200 animate-pulse hover:bg-red-500/30"
                          : "bg-white/[0.04] border-white/10 text-white/60 hover:text-white hover:bg-red-500/20 hover:border-red-500/40"
                      } group/reset
                      `}
                    >
                      <RefreshCcw
                        className={`w-3.5 h-3.5 group-hover/reset:text-red-400 transition-colors ${isResetting || isCinematic ? "animate-spin text-red-400" : ""}`}
                      />
                      <span className="hidden sm:inline group-hover/reset:text-red-200 transition-colors">
                        {isCinematic ? "ABORT SEQ" : "Reset"}
                      </span>
                    </button>

                    <button
                      onClick={() =>
                        handleParamChange({
                          ...params,
                          paused: !params.paused,
                        })
                      }
                      className={`flex-[3.5] flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[8px] tracking-[0.2em] uppercase transition-all duration-300 border ${
                        params.paused
                          ? "bg-white/20 text-white border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                          : "bg-white/[0.06] text-white border-white/10 hover:bg-white/[0.1] hover:border-white/20"
                      }`}
                    >
                      <Power
                        className={`w-3.5 h-3.5 text-white ${!params.paused ? "animate-pulse" : ""}`}
                      />
                      {params.paused ? "Resume" : "Pause"}
                    </button>

                    <button
                      onClick={() => {
                        onCompactChange(true);
                        onTabChange("simulation");
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[8px] tracking-[0.1em] uppercase transition-all duration-300 border bg-white/[0.04] border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20 group/close`}
                    >
                      <span className="group-hover/close:text-white transition-colors">
                        Close
                      </span>
                    </button>

                    {/* Tab Navigation (Bottom - Mobile Optimized) */}
                  </div>

                  {/* Tab Navigation (Bottom - Mobile Optimized) */}
                  <div className="flex justify-center bg-black/80 p-1.5 rounded-2xl backdrop-blur-xl border border-white/10 max-w-lg mx-auto mt-2 shadow-2xl">
                    <button
                      onClick={() => onTabChange("simulation")}
                      className={`flex-1 px-2 py-3 text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 font-bold ${activeTab === "simulation" ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]" : "text-white/50 hover:text-white hover:bg-white/5"}`}
                    >
                      Physics
                    </button>
                    <button
                      onClick={() => onTabChange("features")}
                      className={`flex-1 px-2 py-3 text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 font-bold ${activeTab === "features" ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]" : "text-white/50 hover:text-white hover:bg-white/5"}`}
                    >
                      Modules
                    </button>
                    <button
                      onClick={() => onTabChange("performance")}
                      className={`flex-1 px-2 py-3 text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 font-bold ${activeTab === "performance" ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]" : "text-white/50 hover:text-white hover:bg-white/5"}`}
                    >
                      System
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ))}
    </AnimatePresence>
  );
};
