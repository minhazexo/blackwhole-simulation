/**
 * ControlPanel — thin shell composing the control-panel/ folder module.
 * Owns tab state + hooks (usePresets/usePhysicsState); tabs/chrome live alongside.
 */
import { useState, useMemo, memo } from "react";
import { type SimulationParams } from "@/types/simulation";
import { usePhysicsState } from "@/hooks/usePhysicsState";
import { usePresets } from "@/hooks/usePresets";
import { SimulationTab } from "./control-panel/SimulationTab";
import { PerformanceTab } from "./control-panel/PerformanceTab";
import { FeaturesTab } from "./control-panel/FeaturesTab";
import { PanelChrome } from "./control-panel/PanelChrome";
import { useControlHandlers, type ControlTab } from "./control-panel/controls";

export interface ControlPanelProps {
  params: SimulationParams;
  onParamsChange: (params: SimulationParams) => void;
  showUI: boolean;
  onToggleUI: (show: boolean) => void;
  onStartBenchmark?: () => void;
  onCancelBenchmark?: () => void;
  isBenchmarkRunning?: boolean;
  isCompact: boolean;
  onCompactChange: (compact: boolean) => void;
  onStartCinematic?: (path: "orbit" | "dive") => void;
  onStartViewpoint?: (viewpointId: string) => void;
  onStartAllViewpointsTour?: () => void;
  onResetCamera?: () => void;
  isCinematic?: boolean;
  cinematicMode?: "orbit" | "dive" | "viewpoint" | "viewpoints-tour" | null;
  currentViewpointId?: string | null;
  tourIndex?: number;
  tourTotal?: number;
  audioPlaying?: boolean;
  audioVolume?: number;
  onAudioToggle?: () => void;
  onAudioVolumeChange?: (volume: number) => void;
}

// Memoized: App re-renders ~10Hz at idle (camera syncs) with identical props;
// without memo the whole panel (sliders, tabs, chrome) reconciles each time.
export const ControlPanel = memo(function ControlPanel({
  params,
  onParamsChange,
  showUI,
  onToggleUI,
  onStartBenchmark,
  onCancelBenchmark,
  isBenchmarkRunning,
  isCompact,
  onCompactChange,
  onStartCinematic,
  onStartViewpoint,
  onStartAllViewpointsTour,
  onResetCamera,
  isCinematic,
  cinematicMode,
  currentViewpointId,
  tourIndex,
  tourTotal,
  audioPlaying,
  audioVolume,
  onAudioToggle,
  onAudioVolumeChange,
}: ControlPanelProps) {
  const [activeTab, setActiveTab] = useState<ControlTab>("simulation");

  const { applyPreset } = usePresets();
  const physicsState = usePhysicsState(params);

  const calculatedRadii = useMemo(
    () => ({
      eventHorizon: physicsState.eventHorizonRadius,
      photonSphere: physicsState.photonSphereRadius,
      isco: physicsState.iscoRadius,
    }),
    [physicsState],
  );

  const {
    isResetting,
    handleReset,
    handleParamChange,
    toggleFeature,
    setQuality,
  } = useControlHandlers(params, onParamsChange, onResetCamera);

  return (
    <PanelChrome
      showUI={showUI} isCompact={isCompact} onCompactChange={onCompactChange} onToggleUI={onToggleUI}
      activeTab={activeTab} onTabChange={setActiveTab} calculatedRadii={calculatedRadii}
      params={params} handleParamChange={handleParamChange} handleReset={handleReset}
      isResetting={isResetting} isCinematic={isCinematic}
      audioPlaying={audioPlaying} audioVolume={audioVolume} onAudioToggle={onAudioToggle}
      onAudioVolumeChange={onAudioVolumeChange}
    >
      {activeTab === "simulation" && <SimulationTab params={params} handleParamChange={handleParamChange} />}
      {activeTab === "performance" && (
        <PerformanceTab params={params} handleParamChange={handleParamChange} onParamsChange={onParamsChange}
          applyPreset={applyPreset} setQuality={setQuality} isBenchmarkRunning={isBenchmarkRunning}
          onStartBenchmark={onStartBenchmark} onCancelBenchmark={onCancelBenchmark} />
      )}
      {activeTab === "features" && (
        <FeaturesTab params={params} toggleFeature={toggleFeature} onStartCinematic={onStartCinematic}
          onStartViewpoint={onStartViewpoint} onStartAllViewpointsTour={onStartAllViewpointsTour}
          cinematicMode={cinematicMode} currentViewpointId={currentViewpointId} tourIndex={tourIndex} tourTotal={tourTotal} />
      )}
    </PanelChrome>
  );
});
