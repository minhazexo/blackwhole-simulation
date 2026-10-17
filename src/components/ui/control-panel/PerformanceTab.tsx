import { Activity, Power } from "lucide-react";
import { SIMULATION_CONFIG } from "@/config/simulation.config";
import {
  ControlSlider,
  PRESETS,
  QUALITY_LEVELS,
  SectionHeader,
  type PerformanceTabProps,
} from "./controls";

const renderPresetButton = (
  label: string,
  isActive: boolean,
  onClick: () => void,
  key?: string,
) => (
  <button
    key={key}
    onClick={onClick}
    className={`
      flex items-center justify-center p-1.5 px-2.5 rounded-lg border transition-all duration-300 relative group/btn overflow-hidden
      ${
        isActive
          ? "bg-white/15 text-white border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.1)] scale-[1.01]"
          : "bg-white/[0.08] text-white/70 border-white/10 hover:bg-white/[0.12] hover:border-white/20 hover:text-white"
      }
    `}
  >
    <span
      className={`text-[7.5px] uppercase font-black tracking-[0.1em] truncate transition-colors duration-300 ${isActive ? "text-white" : "text-white/70"}`}
    >
      {label}
    </span>
  </button>
);

export const PerformanceTab = ({
  params,
  handleParamChange,
  onParamsChange,
  applyPreset,
  setQuality,
  isBenchmarkRunning,
  onStartBenchmark,
  onCancelBenchmark,
}: PerformanceTabProps) => {
  // Auto-Tune is opt-in; undefined means off.
  const autoTune = params.adaptiveResolution ?? false;
  return (
    <>
      <div className="p-3.5 sm:p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
        <SectionHeader label="Performance Presets" />
        <div className="grid grid-cols-2 gap-3 mb-4">
          {PRESETS.map((p) =>
            renderPresetButton(
              p.label,
              params.performancePreset === p.id,
              () => onParamsChange(applyPreset(p.id, params)),
              p.id,
            ),
          )}
        </div>
        {/* Auto-Tune master switch: when ON the engine may lower render
            scale and ray-tracing quality by itself to hold FPS (governor +
            resolution PID + TAA bypass). When OFF nothing changes quality
            behind your back — manual settings stay locked. */}
        <button
          type="button"
          onClick={() =>
            onParamsChange({
              ...params,
              adaptiveResolution: !autoTune,
            })
          }
          aria-pressed={autoTune}
          title="When on, resolution and quality adjust automatically to hold FPS. Turn off to lock manual settings."
          className={`
            w-full flex items-center gap-2 p-1.5 px-2.5 rounded-lg border transition-all duration-300 mb-4
            ${
              autoTune
                ? "bg-white/15 text-white border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                : "bg-white/[0.08] text-white/70 border-white/10 hover:bg-white/[0.12] hover:border-white/20 hover:text-white"
            }
          `}
        >
          <span className="text-[7.5px] uppercase font-black tracking-[0.1em] truncate">
            Auto-Tune {autoTune ? "On" : "Off"}
          </span>
          <span className="ml-auto text-[7px] font-mono uppercase tracking-widest text-white/40">
            {!autoTune ? "locked" : "may lower quality"}
          </span>
          <div
            className={`w-4.5 h-2 rounded-full border transition-all duration-300 shrink-0 relative ${
              autoTune
                ? "bg-white/20 border-white/30"
                : "bg-white/5 border-white/10"
            }`}
          >
            {" "}
            <div
              className={`absolute top-0.5 w-1 h-1 rounded-full transition-all duration-300 ${
                autoTune
                  ? "left-2.5 bg-white shadow-[0_0_5px_rgba(255,255,255,0.8)]"
                  : "left-0.5 bg-white/20"
              }`}
            />
          </div>
        </button>
        <ControlSlider
          label={SIMULATION_CONFIG.starDensity.label}
          value={params.starDensity ?? SIMULATION_CONFIG.starDensity.default}
          min={SIMULATION_CONFIG.starDensity.min}
          max={SIMULATION_CONFIG.starDensity.max}
          step={SIMULATION_CONFIG.starDensity.step}
          onChange={(v) =>
            handleParamChange({
              ...params,
              starDensity: v,
            })
          }
          unit={SIMULATION_CONFIG.starDensity.unit}
          decimals={SIMULATION_CONFIG.starDensity.decimals}
        />
        <ControlSlider
          label={SIMULATION_CONFIG.renderScale.label}
          value={params.renderScale ?? SIMULATION_CONFIG.renderScale.default}
          min={SIMULATION_CONFIG.renderScale.min}
          max={SIMULATION_CONFIG.renderScale.max}
          step={SIMULATION_CONFIG.renderScale.step}
          onChange={(v) =>
            handleParamChange({
              ...params,
              renderScale: v,
            })
          }
          unit={SIMULATION_CONFIG.renderScale.unit}
          decimals={SIMULATION_CONFIG.renderScale.decimals}
        />
      </div>

      <div className="p-3.5 sm:p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
        <SectionHeader label="Ray Tracing Fidelity" />
        <div className="grid grid-cols-2 gap-3 mb-4">
          {QUALITY_LEVELS.map((q) =>
            renderPresetButton(
              q.label,
              params.features?.rayTracingQuality === q.id,
              () => setQuality(q.id),
              q.id,
            ),
          )}
        </div>
      </div>

      <div className="p-3.5 sm:p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
        <SectionHeader label="System Validation" />
        <button
          onClick={isBenchmarkRunning ? onCancelBenchmark : onStartBenchmark}
          className={`w-full py-3 rounded-xl border transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
            isBenchmarkRunning
              ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          {isBenchmarkRunning ? (
            <>
              <Power className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                Abort Benchmark
              </span>
            </>
          ) : (
            <>
              <Activity className="w-3.5 h-3.5" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                Run Performance Suite
              </span>
            </>
          )}
        </button>
      </div>

      <div className="p-3.5 sm:p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
        <SectionHeader label="Display Precision" />
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <p className="text-[7.5px] text-white/30 uppercase tracking-widest leading-relaxed">
              Spectral precision and volumetric scattering density limit.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
