import { useCallback, useState } from "react";
import { type SimulationParams, DEFAULT_PARAMS } from "@/types/simulation";
import { SIMULATION_CONFIG } from "@/config/simulation.config";
import { clampAndValidate } from "@/utils/validation";
import type {
  FeatureToggles,
  PresetName,
  RayTracingQuality,
} from "@/types/features";

export type ControlTab = "simulation" | "performance" | "features";

export interface SimulationTabProps {
  params: SimulationParams;
  handleParamChange: (params: SimulationParams) => void;
}

export interface PerformanceTabProps {
  params: SimulationParams;
  handleParamChange: (params: SimulationParams) => void;
  onParamsChange: (params: SimulationParams) => void;
  applyPreset: (
    preset: PresetName,
    currentParams: SimulationParams,
  ) => SimulationParams;
  setQuality: (q: RayTracingQuality) => void;
  isBenchmarkRunning?: boolean;
  onStartBenchmark?: () => void;
  onCancelBenchmark?: () => void;
}

export interface FeaturesTabProps {
  params: SimulationParams;
  toggleFeature: (key: keyof FeatureToggles) => void;
  onStartCinematic?: (path: "orbit" | "dive") => void;
  onStartViewpoint?: (viewpointId: string) => void;
  onStartAllViewpointsTour?: () => void;
  cinematicMode?: "orbit" | "dive" | "viewpoint" | "viewpoints-tour" | null;
  currentViewpointId?: string | null;
  tourIndex?: number;
  tourTotal?: number;
}

export const PRESETS: { id: PresetName; label: string }[] = [
  { id: "maximum-performance", label: "Max Perf" },
  { id: "balanced", label: "Balanced" },
  { id: "high-quality", label: "High Qual" },
  { id: "ultra-quality", label: "Ultra" },
];

export const ControlSlider = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit,
  decimals = 1,
  disabled = false,
  logarithmic = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit: string;
  decimals?: number;
  disabled?: boolean;
  logarithmic?: boolean;
}) => {
  // Logarithmic transformation math
  const safeMin = logarithmic ? Math.max(min, 1e-4) : min;
  const safeVal = logarithmic ? Math.max(value, 1e-4) : value;

  const minPos = logarithmic ? Math.log(safeMin) : min;
  const maxPos = logarithmic ? Math.log(max) : max;
  const valPos = logarithmic ? Math.log(safeVal) : value;

  // Calculate percentage for visual track
  const percent = ((valPos - minPos) / (maxPos - minPos)) * 100;
  const clampedPercent = Math.max(0, Math.min(100, percent));

  return (
    <div
      className={`mb-4 last:mb-0 group select-none transition-opacity duration-300 ${disabled ? "opacity-30 pointer-events-none grayscale" : "opacity-100"}`}
    >
      <div className="flex justify-between items-center mb-1.5 px-0.5">
        <span className="text-[9px] uppercase tracking-[0.2em] text-white/70 font-black group-hover:text-white transition-colors">
          {label}
        </span>
        <span className="font-mono text-[10px] text-white font-bold tabular-nums">
          {value.toFixed(decimals)}
          <span className="text-white/40 ml-1 text-[8px] uppercase">
            {unit}
          </span>
        </span>
      </div>
      <div className="relative h-4 w-full flex items-center">
        <div className="absolute left-0 right-0 h-[2px] bg-white/[0.08] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-white/20 to-white/90 rounded-full transition-all duration-300"
            style={{ width: `${clampedPercent}%` }}
          />
        </div>
        <input
          type="range"
          min={minPos}
          max={maxPos}
          step={logarithmic ? (maxPos - minPos) / 200 : step}
          value={valPos}
          disabled={disabled}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange(logarithmic ? Math.exp(v) : v);
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 disabled:cursor-not-allowed"
        />
        <div
          className="absolute w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.4)] pointer-events-none z-10 border border-white/50 group-hover:scale-125 transition-[transform,opacity,scale]"
          style={{
            left: `calc(${clampedPercent}% - 5px)`,
          }}
        />
      </div>
    </div>
  );
};

export const QUALITY_LEVELS: { id: RayTracingQuality; label: string }[] = [
  { id: "off", label: "Off" },
  { id: "low", label: "Low" },
  { id: "medium", label: "Med" },
  { id: "high", label: "High" },
  { id: "ultra", label: "Ultra" },
];

export const SectionHeader = ({ label }: { label: string }) => (
  <div className="flex items-center gap-2 text-white mb-4 px-0.5">
    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]" />
    <span className="text-[8px] font-black uppercase tracking-[0.3em] whitespace-nowrap">
      {label}
    </span>
    <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent ml-2" />
  </div>
);

export const useControlHandlers = (
  params: SimulationParams,
  onParamsChange: (params: SimulationParams) => void,
  onResetCamera?: () => void,
) => {
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = useCallback(() => {
    setIsResetting(true);
    onParamsChange(DEFAULT_PARAMS);
    if (onResetCamera) onResetCamera();
    setTimeout(() => setIsResetting(false), 500);
  }, [onParamsChange, onResetCamera]);

  // Debounced/Throttled handler is not strictly here, expecting parent optimization
  // But we wrap in useCallback
  const handleParamChange = useCallback(
    (newParams: SimulationParams) => {
      const validatedParams: SimulationParams = {
        ...newParams,
        mass: clampAndValidate(
          newParams.mass,
          SIMULATION_CONFIG.mass.min,
          SIMULATION_CONFIG.mass.max,
          DEFAULT_PARAMS.mass,
        ),
        spin: clampAndValidate(
          newParams.spin,
          SIMULATION_CONFIG.spin.min,
          SIMULATION_CONFIG.spin.max,
          DEFAULT_PARAMS.spin,
        ),
        diskDensity: clampAndValidate(
          newParams.diskDensity,
          SIMULATION_CONFIG.diskDensity.min,
          SIMULATION_CONFIG.diskDensity.max,
          DEFAULT_PARAMS.diskDensity,
        ),
        diskTemp: clampAndValidate(
          newParams.diskTemp,
          SIMULATION_CONFIG.diskTemp.min,
          SIMULATION_CONFIG.diskTemp.max,
          DEFAULT_PARAMS.diskTemp,
        ),
        lensing: clampAndValidate(
          newParams.lensing,
          SIMULATION_CONFIG.lensing.min,
          SIMULATION_CONFIG.lensing.max,
          DEFAULT_PARAMS.lensing,
        ),
        zoom: clampAndValidate(
          newParams.zoom,
          SIMULATION_CONFIG.zoom.min,
          SIMULATION_CONFIG.zoom.max,
          DEFAULT_PARAMS.zoom,
        ),
        autoSpin: clampAndValidate(
          newParams.autoSpin ?? SIMULATION_CONFIG.autoSpin.default,
          SIMULATION_CONFIG.autoSpin.min,
          SIMULATION_CONFIG.autoSpin.max,
          DEFAULT_PARAMS.autoSpin,
        ),
        diskSize: clampAndValidate(
          newParams.diskSize ?? SIMULATION_CONFIG.diskSize.default,
          SIMULATION_CONFIG.diskSize.min,
          SIMULATION_CONFIG.diskSize.max,
          DEFAULT_PARAMS.diskSize,
        ),
        diskScaleHeight: clampAndValidate(
          newParams.diskScaleHeight ??
            SIMULATION_CONFIG.diskScaleHeight.default,
          SIMULATION_CONFIG.diskScaleHeight.min,
          SIMULATION_CONFIG.diskScaleHeight.max,
          DEFAULT_PARAMS.diskScaleHeight,
        ),
        renderScale: clampAndValidate(
          newParams.renderScale ?? SIMULATION_CONFIG.renderScale.default,
          SIMULATION_CONFIG.renderScale.min,
          SIMULATION_CONFIG.renderScale.max,
          DEFAULT_PARAMS.renderScale,
        ),
        paused: newParams.paused,
      };
      onParamsChange(validatedParams);
    },
    [onParamsChange],
  );

  const toggleFeature = useCallback(
    (key: keyof FeatureToggles) => {
      // FIX: Handle case where params.features is undefined
      const currentFeatures =
        params.features || SIMULATION_CONFIG.features.default;
      const currentVal = currentFeatures[key];

      if (typeof currentVal !== "boolean") return;

      const newFeatures = { ...currentFeatures, [key]: !currentVal };

      onParamsChange({
        ...params,
        features: newFeatures,
        performancePreset: "custom",
      });
    },
    [params, onParamsChange],
  );

  const setQuality = useCallback(
    (q: RayTracingQuality) => {
      // FIX: Handle case where params.features is undefined
      const currentFeatures =
        params.features || SIMULATION_CONFIG.features.default;

      const newFeatures = { ...currentFeatures, rayTracingQuality: q };

      onParamsChange({
        ...params,
        features: newFeatures,
        performancePreset: "custom",
      });
    },
    [params, onParamsChange],
  );

  return {
    isResetting,
    handleReset,
    handleParamChange,
    toggleFeature,
    setQuality,
  };
};
