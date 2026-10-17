import { PERFORMANCE_CONFIG } from "@/config/performance.config";
import { isMobileDevice } from "@/utils/device-detection";
import type { RayTracingQuality } from "@/types/features";

export interface PerformanceMetrics {
  currentFPS: number;
  frameTimeMs: number;
  rollingAverageFPS: number;
  quality: RayTracingQuality;
  renderResolution: number;
}

export interface DebugMetrics extends PerformanceMetrics {
  totalFrameTimeMs: number;
  gpuTimeMs?: number;
  cpuTimeMs?: number;
  idleTimeMs?: number;
}

export interface PerformanceWarning {
  severity: "info" | "warning" | "critical";
  message: string;
  suggestions: string[];
}

/**
 * Fixed-size ring buffer backed by Float64Array for O(1) push and O(1) average.
 */
class RingBuffer {
  private readonly buffer: Float64Array;
  private head: number = 0;
  private sum: number = 0;
  private count: number = 0;
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Float64Array(capacity);
  }

  push(value: number): void {
    this.sum -= this.buffer[this.head] ?? 0;
    this.buffer[this.head] = value;
    this.sum += value;
    this.head = (this.head + 1) % this.capacity;
    this.count = Math.min(this.count + 1, this.capacity);
  }

  average(): number {
    return this.count > 0 ? this.sum / this.count : 0;
  }

  last(): number {
    if (this.count === 0) return 0;
    const idx = (this.head - 1 + this.capacity) % this.capacity;
    return this.buffer[idx] ?? 0;
  }

  size(): number {
    return this.count;
  }

  clear(): void {
    this.buffer.fill(0);
    this.head = 0;
    this.sum = 0;
    this.count = 0;
  }
}

export class PerformanceMonitor {
  private readonly frameTimes: RingBuffer;
  private readonly cpuTimes: RingBuffer;
  private readonly gpuTimes: RingBuffer;
  private readonly idleTimes: RingBuffer;
  private readonly WINDOW = 90; // 90 frames (~1.5s at 60fps) for stable rolling average
  private currentQuality: RayTracingQuality = "high";
  private renderResolution: number = 1.0;

  // Calibration State Machine (Phase 4)
  private isCalibrating: boolean = true;
  private calibrationStartTime: number = performance.now();
  private maxAllowedQuality: RayTracingQuality = "ultra";
  private isMobile: boolean = false;

  // PID Controller State (Phase 4.1: Stabilization)
  private errorIntegral: number = 0;
  private prevError: number = 0;
  private isStabilized: boolean = false;
  private lastResolutionChangeTime: number = 0;

  // Pre-allocated metrics to avoid GC pressure in the render loop
  private readonly _metrics: PerformanceMetrics = {
    currentFPS: 0,
    frameTimeMs: 0,
    rollingAverageFPS: 0,
    quality: "high",
    renderResolution: 1.0,
  };

  private readonly _debugMetrics: DebugMetrics = {
    currentFPS: 0,
    frameTimeMs: 0,
    rollingAverageFPS: 0,
    quality: "high",
    renderResolution: 1.0,
    totalFrameTimeMs: 0,
    gpuTimeMs: 0,
    cpuTimeMs: 0,
    idleTimeMs: 0,
  };

  // Cache frequently computed values
  private cachedAvgTime: number = 0;
  private cachedAvgFPS: number = 0;
  private cacheValid: boolean = false;

  constructor() {
    this.frameTimes = new RingBuffer(this.WINDOW);
    this.cpuTimes = new RingBuffer(this.WINDOW);
    this.gpuTimes = new RingBuffer(this.WINDOW);
    this.idleTimes = new RingBuffer(this.WINDOW);

    // Initial hardware awareness
    if (typeof window !== "undefined" && window.navigator) {
      this.isMobile = isMobileDevice();

      if (this.isMobile) {
        this.maxAllowedQuality = PERFORMANCE_CONFIG.calibration.mobileHardCap;
        this.currentQuality = this.maxAllowedQuality;
        // Skip stress-test for mobile, just start at cap
        this.isCalibrating = false;
      }
    }
  }

  updateMetrics(deltaTime: number): PerformanceMetrics {
    const now = performance.now();
    this.frameTimes.push(deltaTime);
    this.invalidateCache();

    // Calibration Phase logic
    if (this.isCalibrating) {
      if (
        now - this.calibrationStartTime >
        PERFORMANCE_CONFIG.calibration.durationMs
      ) {
        this.isCalibrating = false;
        this.finalizeCalibration();
      }
    } else if (PERFORMANCE_CONFIG.resolution.enableDynamicScaling) {
      // Phase 4.1: PID-Based Adaptive Scaling
      this.applyPIDScaling(deltaTime);
    }

    return this.getMetrics(deltaTime);
  }

  private applyPIDScaling(dt: number): void {
    const target = PERFORMANCE_CONFIG.scheduler.frameBudgetMs * 0.95; // 95% headroom
    const error = target - dt;
    const now = performance.now();

    const { kp, ki, kd, deadzone, cooldownMs, integralClamp } =
      PERFORMANCE_CONFIG.resolution.pid;

    // DEADZONE: If the error is within `deadzone` fraction of target, do nothing.
    // This prevents sub-millisecond oscillation from causing resolution ping-pong.
    const absError = Math.abs(error);
    if (absError < target * deadzone) {
      // We're close enough. Zero the derivative to prevent jitter on re-entry.
      this.prevError = error;
      this.isStabilized = true;
      return;
    }

    // COOLDOWN: Don't change resolution more than once per `cooldownMs`.
    // Each resolution change forces the GPU to reconfigure framebuffer state,
    // which itself causes a frame-time spike that feeds back into the PID.
    if (now - this.lastResolutionChangeTime < cooldownMs) {
      this.prevError = error;
      return;
    }

    // 1. Proportional
    const pOut = kp * error;

    // 2. Integral (tightly clamped to prevent wind-up)
    this.errorIntegral = Math.min(
      Math.max(this.errorIntegral + error, -integralClamp),
      integralClamp,
    );
    const iOut = ki * this.errorIntegral;

    // 3. Derivative
    const dOut = kd * (error - this.prevError);
    this.prevError = error;

    // Total correction
    const adjustment = pOut + iOut + dOut;

    // Apply to resolution (damped, with minimum step to avoid float noise)
    const delta = adjustment * 0.01;
    if (Math.abs(delta) < 0.001) return; // Sub-pixel change -- skip

    const newRes = this.renderResolution + delta;
    this.setRenderResolution(newRes);
    this.lastResolutionChangeTime = now;

    // If we are consistently within 3% of target, mark as stabilized
    this.isStabilized = absError < target * 0.03;
  }

  private invalidateCache(): void {
    this.cacheValid = false;
  }

  private ensureCache(): void {
    if (!this.cacheValid) {
      this.cachedAvgTime = this.frameTimes.average();
      this.cachedAvgFPS =
        this.cachedAvgTime > 0 ? 1000 / this.cachedAvgTime : 0;
      this.cacheValid = true;
    }
  }

  public endCalibration(): void {
    this.isCalibrating = false;
    this.finalizeCalibration();
  }

  private finalizeCalibration(): void {
    if (this.frameTimes.size() === 0) return;
    this.ensureCache();
    const avgFps = this.cachedAvgFPS;

    if (avgFps < PERFORMANCE_CONFIG.calibration.minStableFPS) {
      if (this.currentQuality === "ultra") this.setQuality("high");
      else if (this.currentQuality === "high") this.setQuality("medium");

      this.maxAllowedQuality = this.currentQuality;
    }
  }

  public shouldReduceQuality(): boolean {
    if (this.isCalibrating) return false;

    this.ensureCache();
    return (
      this.frameTimes.size() >= this.WINDOW &&
      this.cachedAvgFPS < PERFORMANCE_CONFIG.resolution.adaptiveThreshold
    );
  }

  public shouldIncreaseQuality(): boolean {
    if (this.isCalibrating) return false;

    this.ensureCache();
    if (
      this.currentQuality === "ultra" ||
      (this.currentQuality === "high" && this.maxAllowedQuality === "high") ||
      (this.currentQuality === "medium" && this.maxAllowedQuality === "medium")
    ) {
      return false;
    }

    return (
      this.frameTimes.size() >= this.WINDOW &&
      this.cachedAvgFPS > PERFORMANCE_CONFIG.resolution.recoveryThreshold
    );
  }

  public getMetrics(currentDeltaTime?: number): PerformanceMetrics {
    this.ensureCache();

    const dt =
      currentDeltaTime ??
      (this.frameTimes.size() > 0 ? this.frameTimes.last() : 0);
    const fps = dt > 0 ? 1000 / dt : 0;

    this._metrics.currentFPS = Math.round(fps);
    this._metrics.frameTimeMs = Math.round(this.cachedAvgTime * 100) / 100;
    this._metrics.rollingAverageFPS = Math.round(this.cachedAvgFPS);
    this._metrics.quality = this.currentQuality;
    this._metrics.renderResolution = this.renderResolution;

    return this._metrics;
  }

  setQuality(quality: RayTracingQuality) {
    this.currentQuality = quality;
    this._metrics.quality = quality;
    this._debugMetrics.quality = quality;
  }

  setRenderResolution(res: number) {
    this.renderResolution = Math.min(
      Math.max(res, PERFORMANCE_CONFIG.resolution.minScale),
      PERFORMANCE_CONFIG.resolution.maxScale,
    );
    this._metrics.renderResolution = this.renderResolution;
    this._debugMetrics.renderResolution = this.renderResolution;
  }

  getDebugMetrics(): DebugMetrics {
    const metrics = this.getMetrics();

    this._debugMetrics.currentFPS = metrics.currentFPS;
    this._debugMetrics.frameTimeMs = metrics.frameTimeMs;
    this._debugMetrics.rollingAverageFPS = metrics.rollingAverageFPS;

    this._debugMetrics.totalFrameTimeMs = metrics.frameTimeMs;
    this._debugMetrics.cpuTimeMs =
      Math.round(this.cpuTimes.average() * 100) / 100;
    this._debugMetrics.gpuTimeMs =
      Math.round(this.gpuTimes.average() * 100) / 100;
    this._debugMetrics.idleTimeMs =
      Math.round(this.idleTimes.average() * 100) / 100;

    return this._debugMetrics;
  }

  recordCPUTime(ms: number): void {
    this.cpuTimes.push(ms);
  }

  recordGPUTime(ms: number): void {
    this.gpuTimes.push(ms);
  }

  recordIdleTime(ms: number): void {
    this.idleTimes.push(ms);
  }

  getFrameTimeBudgetUsage(): number {
    this.ensureCache();
    const targetTime = 1000 / PERFORMANCE_CONFIG.scheduler.targetFPS;
    return (this.cachedAvgTime / targetTime) * 100;
  }

  getWarnings(): PerformanceWarning[] {
    const metrics = this.getMetrics();
    const budgetUsage = this.getFrameTimeBudgetUsage();
    const warnings: PerformanceWarning[] = [];

    if (metrics.rollingAverageFPS < 30) {
      warnings.push({
        severity: "critical",
        message: "Critical performance issue detected",
        suggestions: ["Disable Gravitational Lensing", "Set Quality to Low"],
      });
    } else if (metrics.rollingAverageFPS < 60) {
      warnings.push({
        severity: "warning",
        message: "Performance warning: FPS below 60",
        suggestions: ["Reduce Ray Tracing Quality", "Disable Bloom"],
      });
    }

    if (budgetUsage > 100) {
      warnings.push({
        severity: "info",
        message: `Frame time budget exceeded (>${(1000 / PERFORMANCE_CONFIG.scheduler.targetFPS).toFixed(1)}ms)`,
        suggestions: ["Enable Adaptive Resolution"],
      });
    }

    return warnings;
  }

  reset(): void {
    this.frameTimes.clear();
    this.cpuTimes.clear();
    this.gpuTimes.clear();
    this.idleTimes.clear();
    this.invalidateCache();
  }
}

/**
 * Runtime quality-governor policy (pure, unit-testable).
 *
 * The resolution PID can only cut pixels ~2x, which cannot rescue a GPU
 * whose ray-step budget is 4x over its head. This ladder steps the actual
 * ray-tracing quality. "off" is manual-only (slideshow/static mode) and
 * never auto-selected.
 */
export const QUALITY_LADDER = ["low", "medium", "high", "ultra"] as const;
export type GovernorQuality = (typeof QUALITY_LADDER)[number];

/** FPS below which one rung is dropped (matches startup balanced floor). */
export const GOVERNOR_STEP_DOWN_FPS = 25;
/**
 * Sustained FPS above which one rung is restored (4 consecutive evals).
 * Deliberately far above the step-down floor: adjacent rungs differ ~2x in
 * cost, so a narrow band would limit-cycle (step up → slow → step down →
 * fast …), visible as quality "dancing". The 25/75 band exceeds any single
 * rung's cost ratio with margin for resolution-PID movement.
 */
export const GOVERNOR_STEP_UP_FPS = 75;

export type GovernorAction = "down" | "up" | "hold";

/**
 * Decide the governor direction for this evaluation tick.
 *
 * @param current - Active ray-tracing quality ("off" always holds).
 * @param ceiling - Highest quality the governor may restore to.
 * @param rollingFPS - Smoothed FPS (0/negative = unknown → hold).
 */
export function governorAction(
  current: RayTracingQuality | string,
  ceiling: RayTracingQuality | string,
  rollingFPS: number,
): GovernorAction {
  const ci = (QUALITY_LADDER as readonly string[]).indexOf(current);
  const hi = (QUALITY_LADDER as readonly string[]).indexOf(ceiling);
  if (ci < 0 || hi < 0) return "hold"; // "off" or unknown → manual only
  if (!(rollingFPS > 0)) return "hold";
  if (rollingFPS < GOVERNOR_STEP_DOWN_FPS && ci > 0) return "down";
  if (rollingFPS > GOVERNOR_STEP_UP_FPS && ci < hi) return "up";
  return "hold";
}

/** Apply one rung step in the given direction (clamped to the ladder). */
export function governorStep(
  current: GovernorQuality,
  action: GovernorAction,
): GovernorQuality {
  const ci = QUALITY_LADDER.indexOf(current);
  if (action === "down") return QUALITY_LADDER[Math.max(0, ci - 1)] ?? current;
  if (action === "up")
    return (
      QUALITY_LADDER[Math.min(QUALITY_LADDER.length - 1, ci + 1)] ?? current
    );
  return current;
}
