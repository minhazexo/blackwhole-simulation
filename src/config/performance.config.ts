/**
 * Performance Optimization Configuration
 * Centralized control for GPU scheduling, resolution scaling, and computational budgets.
 *
 * This file governs how the simulation utilizes hardware resources. It is designed to
 * maximize FPS on constrained devices (like mobile/MacBooks) while allowing
 * high-fidelity output on dedicated GPUs.
 */

export const PERFORMANCE_CONFIG = {
  // Adaptive Resolution & Scaling
  resolution: {
    baseScale: 1.0, // Default DPI multiplier (1.0 = native)
    minScale: 0.5, // Minimum allowed downscaling for potato mode
    maxScale: 2.0, // Maximum supersampling (Retina/4K)
    mobileCap: 1.0, // Hard cap for mobile devices to prevent thermal throttling
    adaptiveThreshold: 58, // FPS threshold below which resolution drops
    recoveryThreshold: 72, // FPS threshold above which resolution recovers
    enableDynamicScaling: true, // Master toggle for DPI scaling
    // PID Controller Coefficients -- tuned for STABILITY, not reactivity.
    // Goal: FPS should barely move once converged. Visual smoothness > peak throughput.
    // (Widened deadzone + cooldown after observing resolution "breathing":
    // adjacent quality rungs + thermal boost clocks move fps in steps that
    // a tight PID chases forever. A calmer PID holds the image still.)
    pid: {
      kp: 0.025, // Proportional: halved to dampen oscillation around setpoint
      ki: 0.005, // Integral: reduced to prevent wind-up drift
      kd: 0.04, // Derivative: doubled to resist sudden frame-time spikes
      deadzone: 0.08, // Fractional: ignore errors < 8% of frame budget (kills visible breathing)
      cooldownMs: 750, // Minimum time between resolution changes (prevents GPU pipeline thrashing)
      integralClamp: 8.0, // Tighter integral wind-up limit (was effectively 20)
    },
  },

  // Stress-Test Calibration (Hardware Awareness)
  calibration: {
    durationMs: 3000, // 3 seconds of stress-testing at startup
    minStableFPS: 30, // FPS needed to maintain 'ultra/high' quality (Cinematic standard)
    mobileHardCap: "medium", // Forced max quality for mobile devices
  },

  // Startup Loading / System Profile Calibration
  // Runs once on first visit to determine optimal settings for the device.
  // Thresholds are calibrated against the REPRESENTATIVE probe in
  // performance/stress-test.ts (64 Kerr-like iterations/px at ~0.6 Mpix,
  // synchronous measurement, no vsync cap) — NOT against display refresh.
  // Rough index: probe fps ≈ medium-quality fps at ~0.6 Mpix; fullscreen
  // 1080p+ costs ~3-4x pixels and ultra costs 4x steps vs medium, so ultra
  // at 60fps needs triple-digit probe throughput. When in doubt these err
  // low: the runtime quality governor steps UP if headroom exists.
  startup: {
    stressTestDurationMs: 2500, // 2.5s time-box for synchronous probe draws
    stressTestWarmupMs: 300, // Legacy field (warmup is fixed sync draws now)
    stressTestTargetFrames: 120, // Collect at most this many samples
    minSamplesForReliable: 30, // At least 30 samples for a valid measurement
    // Quality threshold tiers (probe fps, see note above)
    ultraThreshold: 300, // ≥300 fps → ultra-quality (256 steps)
    highThreshold: 120, // ≥120 fps → high-quality (128 steps)
    balancedThreshold: 45, // ≥45 fps → balanced (64 steps)
    // Below balancedThreshold → maximum-performance
    physicsInitTimeoutMs: 15000,
  },

  // Ray Marching Budget (The Engine's "Gas Pedal")
  compute: {
    maxStepsMobile: 80, // Reduced steps for mobile GPUs
    stepOptimizationThreshold: 0.05, // Distance threshold to switch to larger steps
    dynamicLOD: true, // Enable Level-of-Detail scaling based on camera distance
  },

  // Scheduler & Loop Management
  scheduler: {
    targetFPS: 60, // The simulation's heartbeat target
    idleThrottleFPS: 30, // FPS when tab is inactive/backgrounded
    frameBudgetMs: 16.67, // Max milliseconds per frame (1000/60)
    idleTimeoutMs: 30000, // Time in ms before throttling kicks in
  },

  // WebGL Context Attributes (Power Management)
  context: {
    powerPreference: "high-performance" as const,
    preserveDrawingBuffer: false, // Set false to save memory if screenshots aren't needed
    antialias: false, // Disable MSAA as we use ray-marching (saves GPU)
    depth: false, // Disable depth buffer if 2D quad render (saves bandwidth)
    stencil: false,
    alpha: false,
  },
} as const;
