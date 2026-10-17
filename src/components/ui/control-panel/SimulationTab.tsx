import { SIMULATION_CONFIG } from "@/config/simulation.config";
import { ControlSlider, SectionHeader, type SimulationTabProps } from "./controls";

export const SimulationTab = ({
  params,
  handleParamChange,
}: SimulationTabProps) => {
  return (
    <>
      <div className="p-3.5 sm:p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
        <SectionHeader label="Black Hole Parameters" />
        <div className="space-y-4">
          <ControlSlider
            label={SIMULATION_CONFIG.mass.label}
            value={params.mass}
            min={SIMULATION_CONFIG.mass.min}
            max={SIMULATION_CONFIG.mass.max}
            step={SIMULATION_CONFIG.mass.step}
            onChange={(v) =>
              handleParamChange({ ...params, mass: v })
            }
            unit={SIMULATION_CONFIG.mass.unit}
            decimals={SIMULATION_CONFIG.mass.decimals}
          />
          <ControlSlider
            label={SIMULATION_CONFIG.zoom.label}
            value={params.zoom}
            min={SIMULATION_CONFIG.zoom.min}
            max={SIMULATION_CONFIG.zoom.max}
            step={SIMULATION_CONFIG.zoom.step}
            onChange={(v) =>
              handleParamChange({ ...params, zoom: v })
            }
            unit={SIMULATION_CONFIG.zoom.unit}
            decimals={SIMULATION_CONFIG.zoom.decimals}
          />
          <ControlSlider
            label={SIMULATION_CONFIG.spin.label} // Updated from ui_spin
            value={params.spin}
            min={SIMULATION_CONFIG.spin.min} // Updated from ui_spin
            max={SIMULATION_CONFIG.spin.max} // Updated from ui_spin
            step={SIMULATION_CONFIG.spin.step} // Updated from ui_spin
            onChange={(v) =>
              handleParamChange({ ...params, spin: v })
            }
            unit={SIMULATION_CONFIG.spin.unit} // Updated from ui_spin
            decimals={SIMULATION_CONFIG.spin.decimals} // Updated from ui_spin
          />
          <ControlSlider
            label={SIMULATION_CONFIG.lensing.label}
            value={
              params.lensing ??
              SIMULATION_CONFIG.lensing.default
            }
            min={SIMULATION_CONFIG.lensing.min}
            max={SIMULATION_CONFIG.lensing.max}
            step={SIMULATION_CONFIG.lensing.step}
            disabled={
              !params.features?.gravitationalLensing
            }
            onChange={(v) =>
              handleParamChange({ ...params, lensing: v })
            }
            unit={SIMULATION_CONFIG.lensing.unit}
            decimals={SIMULATION_CONFIG.lensing.decimals}
          />
        </div>
      </div>

      <div className="p-3.5 sm:p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
        <SectionHeader label="Accretion Dynamics" />
        <div className="space-y-4">
          <ControlSlider
            label={SIMULATION_CONFIG.autoSpin.label}
            value={params.autoSpin}
            min={SIMULATION_CONFIG.autoSpin.min}
            max={SIMULATION_CONFIG.autoSpin.max}
            step={SIMULATION_CONFIG.autoSpin.step}
            onChange={(v) =>
              handleParamChange({
                ...params,
                autoSpin: v,
              })
            }
            unit={SIMULATION_CONFIG.autoSpin.unit}
            decimals={SIMULATION_CONFIG.autoSpin.decimals}
          />
          <ControlSlider
            label={SIMULATION_CONFIG.diskSize.label}
            value={
              params.diskSize ??
              SIMULATION_CONFIG.diskSize.default
            }
            min={SIMULATION_CONFIG.diskSize.min}
            max={SIMULATION_CONFIG.diskSize.max}
            step={SIMULATION_CONFIG.diskSize.step}
            disabled={!params.features?.accretionDisk}
            onChange={(v) =>
              handleParamChange({
                ...params,
                diskSize: v,
              })
            }
            unit={SIMULATION_CONFIG.diskSize.unit}
            decimals={SIMULATION_CONFIG.diskSize.decimals}
          />
          <ControlSlider
            label={SIMULATION_CONFIG.diskScaleHeight.label}
            value={
              params.diskScaleHeight ??
              SIMULATION_CONFIG.diskScaleHeight.default
            }
            min={SIMULATION_CONFIG.diskScaleHeight.min}
            max={SIMULATION_CONFIG.diskScaleHeight.max}
            step={SIMULATION_CONFIG.diskScaleHeight.step}
            disabled={!params.features?.accretionDisk}
            onChange={(v) =>
              handleParamChange({
                ...params,
                diskScaleHeight: v,
              })
            }
            unit={SIMULATION_CONFIG.diskScaleHeight.unit}
            decimals={
              SIMULATION_CONFIG.diskScaleHeight.decimals
            }
          />
          <ControlSlider
            label={SIMULATION_CONFIG.diskTemp.label}
            value={
              params.diskTemp ??
              SIMULATION_CONFIG.diskTemp.default
            }
            min={SIMULATION_CONFIG.diskTemp.min}
            max={SIMULATION_CONFIG.diskTemp.max}
            step={SIMULATION_CONFIG.diskTemp.step}
            disabled={!params.features?.accretionDisk}
            logarithmic={true} // Fixed: Better UX for wide temp range
            onChange={(v) =>
              handleParamChange({
                ...params,
                diskTemp: v,
              })
            }
            unit={SIMULATION_CONFIG.diskTemp.unit}
            decimals={SIMULATION_CONFIG.diskTemp.decimals}
          />
          <ControlSlider
            label={SIMULATION_CONFIG.diskDensity.label}
            value={
              params.diskDensity ??
              SIMULATION_CONFIG.diskDensity.default
            }
            min={SIMULATION_CONFIG.diskDensity.min}
            max={SIMULATION_CONFIG.diskDensity.max}
            step={SIMULATION_CONFIG.diskDensity.step}
            disabled={!params.features?.accretionDisk}
            onChange={(v) =>
              handleParamChange({
                ...params,
                diskDensity: v,
              })
            }
            unit={SIMULATION_CONFIG.diskDensity.unit}
            decimals={
              SIMULATION_CONFIG.diskDensity.decimals
            }
          />
        </div>
      </div>
    </>
  );
};
