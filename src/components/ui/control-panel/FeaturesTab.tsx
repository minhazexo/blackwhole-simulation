import {
  Activity,
  Star,
  Zap,
  Sun,
  Disc,
  Sparkles,
  Layers,
  Camera,
} from "lucide-react";
import { VIEWPOINTS } from "@/config/viewpoints.config";
import type { FeatureToggles } from "@/types/features";
import { SectionHeader, type FeaturesTabProps } from "./controls";

const renderToggle = ({
  label,
  isActive,
  onClick,
  icon,
  key,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  key?: string;
}) => {
  const Icon = icon;
  return (
    <button
      key={key}
      onClick={onClick}
      className={`
        flex items-center gap-2 p-1.5 px-2 rounded-lg border transition-all duration-300 relative group/btn overflow-hidden w-full
        ${
          isActive
            ? "bg-white/15 text-white border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
            : "bg-white/[0.08] text-white/70 border-white/10 hover:bg-white/[0.12] hover:border-white/20 hover:text-white"
        }
      `}
    >
      {Icon && (
        <Icon
          className={`w-3 h-3 shrink-0 transition-all duration-500 ${isActive ? "text-white icon-glow" : "text-white/80 group-hover/btn:text-white"}`}
        />
      )}
      <span
        className={`text-[7.5px] uppercase font-black tracking-[0.1em] truncate transition-colors duration-300 ${isActive ? "text-white" : "text-white/70"}`}
      >
        {label}
      </span>
      <div
        className={`ml-auto w-4.5 h-2 rounded-full border transition-all duration-300 shrink-0 relative ${
          isActive
            ? "bg-white/20 border-white/30"
            : "bg-white/5 border-white/10"
        }`}
      >
        <div
          className={`absolute top-0.5 w-1 h-1 rounded-full transition-all duration-300 ${
            isActive
              ? "left-2.5 bg-white shadow-[0_0_5px_rgba(255,255,255,0.8)]"
              : "left-0.5 bg-white/20"
          }`}
        />
      </div>
    </button>
  );
};

export const FeaturesTab = ({
  params,
  toggleFeature,
  onStartCinematic,
  onStartViewpoint,
  onStartAllViewpointsTour,
  cinematicMode,
  currentViewpointId,
  tourIndex,
  tourTotal,
}: FeaturesTabProps) => {
  return (
    <>
      <div className="p-3.5 sm:p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
        <SectionHeader label="Physics Modules" />
        <div className="grid grid-cols-1 gap-2">
          {[
            {
              label: "Gravitational Lensing",
              key: "gravitationalLensing" as const,
              icon: Star,
            },
            {
              label: "Accretion Disk",
              key: "accretionDisk" as const,
              icon: Disc,
            },
            {
              label: "Doppler Beaming",
              key: "dopplerBeaming" as const,
              icon: Zap,
            },
            {
              label: "Photon Sphere",
              key: "photonSphereGlow" as const,
              icon: Sun,
            },
            {
              label: "Background Stars",
              key: "backgroundStars" as const,
              icon: Star,
            },
            {
              label: "Volumetric Bloom",
              key: "bloom" as const,
              icon: Sparkles,
            },
            {
              label: "Relativistic Jets",
              key: "relativisticJets" as const,
              icon: Zap,
            },
            {
              label: "Gravitational Redshift",
              key: "gravitationalRedshift" as const,
              icon: Activity,
            },
            {
              label: "Kerr Shadow Guide",
              key: "kerrShadow" as const,
              icon: Disc,
            },
            {
              label: "Spacetime Visualization",
              key: "spacetimeVisualization" as const,
              icon: Layers,
            },
          ].map((f) =>
            renderToggle({
              label: f.label,
              isActive:
                !!params.features?.[
                  f.key as keyof FeatureToggles
                ],
              onClick: () =>
                toggleFeature(
                  f.key as keyof FeatureToggles,
                ),
              icon: f.icon,
              key: f.key,
            }),
          )}
        </div>
      </div>

      {/* Right Column Stack: Cinematic Utility */}
      <div className="space-y-4">
        {/* Cinematic Tours - Always Active */}
        <div className="p-3.5 sm:p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
          <SectionHeader label="Cinematic Tours" />
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onStartCinematic?.("orbit")}
              className={`py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-[9px] uppercase tracking-wider text-white transition-all active:scale-95 hover:bg-indigo-500/20 hover:border-indigo-500/40 hover:text-indigo-200 shadow-sm`}
            >
              Orbit Tour
            </button>
            <button
              onClick={() => onStartCinematic?.("dive")}
              className={`py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-[9px] uppercase tracking-wider text-white transition-all active:scale-95 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-200 shadow-sm`}
            >
              Infall Dive
            </button>
          </div>
        </div>

        {/* Viewpoints Tour — extra dedicated section */}
        <div className="p-3.5 sm:p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
          <SectionHeader label="Viewpoint Tour" />
          <div className="flex flex-col gap-3">
            <button
              onClick={() =>
                onStartAllViewpointsTour?.()
              }
              disabled={
                cinematicMode === "viewpoints-tour"
              }
              className={`w-full py-2.5 px-4 rounded-xl border transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                cinematicMode === "viewpoints-tour"
                  ? "bg-white/15 text-white border-white/30 shadow-[0_0_12px_rgba(255,255,255,0.1)]"
                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Camera className="w-3 h-3" />
              <span className="text-[8px] font-black uppercase tracking-[0.2em]">
                {cinematicMode === "viewpoints-tour"
                  ? "Tour Active"
                  : "Tour All Viewpoints"}
              </span>
            </button>

            {/* Tour progress when active */}
            {cinematicMode === "viewpoints-tour" &&
              tourTotal !== undefined &&
              tourIndex !== undefined && (
                <div className="flex items-center gap-3 px-2">
                  <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white/40 rounded-full transition-all duration-500"
                      style={{
                        width: `${((tourIndex + 1) / tourTotal) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-[7px] font-mono text-white/40 whitespace-nowrap">
                    {tourIndex + 1}/{tourTotal}
                  </span>
                </div>
              )}

            <p className="text-[6.5px] text-white/20 uppercase tracking-[0.15em] leading-relaxed">
              Automatically visits every pre-defined
              viewpoint, dwelling for 10 seconds each.
            </p>
          </div>
        </div>

        {/* Viewpoints Grid */}
        <div className="p-3.5 sm:p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
          <SectionHeader label="Viewpoints" />
          <div className="grid grid-cols-2 gap-1.5">
            {VIEWPOINTS.map((vp) => {
              const isActive =
                (cinematicMode === "viewpoint" ||
                  cinematicMode === "viewpoints-tour") &&
                vp.id === currentViewpointId;
              return (
                <button
                  key={vp.id}
                  onClick={() =>
                    onStartViewpoint?.(vp.id)
                  }
                  className={`group relative py-1.5 px-2 rounded-lg border text-[7px] uppercase tracking-wider transition-all duration-300 active:scale-95 text-left leading-tight ${
                    isActive
                      ? `bg-white/15 text-white border-white/40 shadow-[0_0_10px_rgba(255,255,255,0.15)]`
                      : `bg-white/[0.04] text-white/60 border-white/[0.06] hover:bg-white/[0.1] hover:border-white/20 hover:text-white`
                  }`}
                  style={
                    isActive
                      ? {
                          borderColor: `hsla(${vp.hue}, 60%, 55%, 0.5)`,
                          boxShadow: `0 0 12px hsla(${vp.hue}, 60%, 45%, 0.15)`,
                        }
                      : {}
                  }
                  title={vp.description}
                >
                  <span className="font-black tracking-[0.15em]">
                    {vp.name}
                  </span>
                  {isActive && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.5)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};
