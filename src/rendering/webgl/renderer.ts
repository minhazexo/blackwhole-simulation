import { vertexShaderSource } from "@/shaders/blackhole/vertex.glsl";
import { fragmentShaderSource } from "@/shaders/blackhole/fragment.glsl";
import { ShaderManager } from "@/shaders/manager";
import { BloomManager } from "@/rendering/bloom";
import { ReprojectionManager } from "@/rendering/reprojection";
import {
  createNoiseTexture,
  createBlueNoiseTexture,
  getSharedQuadBuffer,
  createTextureFromData,
} from "@/utils/webgl-utils";
import { UniformBatcher } from "@/utils/cpu-optimizations";
import { SIMULATION_CONFIG } from "@/config/simulation.config";
import { DEFAULT_FEATURES, getMaxRaySteps } from "@/config/feature-flags";
import { isMobileDevice, isSoftwareWebGL } from "@/utils/device-detection";
import { SimulationParams } from "@/types/simulation";
import { physicsBridge } from "@/engine/physics-bridge";
import { liveCamera } from "@/engine/camera-live";
import {
  PerformanceMonitor,
  governorAction,
  governorStep,
  QUALITY_LADDER,
} from "@/performance/monitor";
import type { RayTracingQuality } from "@/types/features";
import { PERFORMANCE_CONFIG } from "@/config/performance.config";
import { PHYSICS_CONSTANTS } from "@/config/physics.config";
import { REFERENCE_SHOT } from "@/config/reference-shot.config";

export interface WebGLError {
  type: "context" | "shader" | "program" | "memory";
  message: string;
  details?: string;
}

/**
 * Simulation-time units advanced per wall-clock second. Calibrated so that
 * the historic (frame-rate dependent) `time += 0.01` per frame at 60fps
 * keeps producing the exact same disk rotation / nebula drift speed.
 */
const SIMULATION_UNITS_PER_SECOND = 0.6;

/**
 * Post-processing bypass thresholds (rolling FPS).
 *
 * Engage below 52, release above 57. The release MUST stay reachable on a
 * 60Hz display: the previous value (>60) could never be met once vsync caps
 * the loop, so a single startup hitch latched TAA + bloom OFF for the whole
 * session. 52..57 is the hold band (no flapping); 2.5s dwell per side.
 */
const POST_BYPASS_ENGAGE_FPS = 52;
const POST_BYPASS_RELEASE_FPS = 57;

export class WebGLRenderer {
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private shaderManager: ShaderManager | null = null;
  private compiledFeaturesKey = "";
  private bloomManager: BloomManager | null = null;
  private reprojectionManager: ReprojectionManager | null = null;
  private uniformBatcher = new UniformBatcher();

  public error: WebGLError | null = null;
  public onMetricsUpdate?: (
    metrics: import("@/performance/monitor").PerformanceMetrics,
  ) => void;
  /**
   * Runtime quality-governor signal. Fires at most once per evaluation
   * interval (2.5s) when the rolling FPS demands a ray-step rung change.
   * The owner (page.tsx) applies it like a manual quality selection.
   */
  public onQualityChange?: (quality: RayTracingQuality) => void;

  private noiseTex: WebGLTexture | null = null;
  private blueNoiseTex: WebGLTexture | null = null;
  private diskLUT: WebGLTexture | null = null;
  private spectrumLUT: WebGLTexture | null = null;
  /** Equirectangular Milky Way plate (public/textures). Never re-uploaded. */
  private milkywayTex: WebGLTexture | null = null;
  private skyTextureRequested = false;

  private width = 0;
  private height = 0;
  private time = 0;
  private isCameraMoving = false;
  private lastMouse = { x: 0, y: 0 };
  // Memoized software-WebGL feature override (was a fresh object + fresh
  // JSON.stringify every frame on the software path).
  private lastForcedInput: import("@/types/features").FeatureToggles | null =
    null;
  private forcedFeatures: import("@/types/features").FeatureToggles | null =
    null;
  private performanceMonitor = new PerformanceMonitor();
  private lastFrameTime = performance.now();
  private lastMetricsUpdate = 0;
  // Runtime quality-governor state (see evaluateQualityGovernor).
  private rendererStartTime = performance.now();
  private lastGovernorEval = 0;
  private governorUpStreak = 0;
  private governorDownStreak = 0;
  // TAA-bypass latch (see needsOffscreen). Without hysteresis the
  // direct↔TAA path flapped every time rolling FPS crossed the threshold,
  // popping the image between raw and temporally-blended frames.
  private taaBypassed = false;
  private lastTaaSwitchMs = 0;
  private governorCeiling: RayTracingQuality = "ultra";
  private lastSeenQuality: RayTracingQuality | "off" | null = null;
  private pendingGovernorQuality: RayTracingQuality | null = null;
  private governorGraceUntil = 0;
  private lastGovernorStepAt = 0;
  // Cached features reference: avoids JSON.stringify on every frame when
  // the features object identity hasn't changed (stringify ran 60x/sec).
  // Safe because params updates always replace (never mutate) features.
  private lastFeaturesRef: object | null = null;
  // Motion detection without per-frame setTimeout churn.
  private lastMotionTime = 0;
  // Cached at init: isMobileDevice() runs UA regex + layout reads, so it
  // must not execute per frame for the mobile resolution cap below.
  private isMobileDeviceCached = false;
  // Reused shadow-curve buffer (64 points x 2). Previously allocated via
  // `new Float32Array(128)` every frame (~60 allocs/sec + GC pauses).
  private readonly _shadowCurve = new Float32Array(128);
  // Set when EXT_color_buffer_float lights up. False on Safari 16- and
  // some mobile drivers; downstream framebuffers must branch on this
  // to avoid a half/float attachment whose driver silently fails the
  // attachment-completeness check (FRAMEBUFFER_INCOMPLETE_ATTACHMENT).
  public hasFloatFramebuffer = false;
  // True if WebGL is running in software/CPU mode (llvmpipe, SwiftShader).
  // Software WebGL is ~100x slower for compute shaders like ray marching.
  public isSoftwareWebGL = false;

  constructor() {}

  public init(canvas: HTMLCanvasElement): boolean {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
    });

    if (!gl) {
      this.error = { type: "context", message: "WebGL2 not available" };
      return false;
    }
    this.gl = gl;

    // Detect software WebGL (llvmpipe, SwiftShader, ANGLE on CPU)
    this.isSoftwareWebGL = isSoftwareWebGL(gl);
    // Cache mobile status once for the per-frame resolution cap below.
    this.isMobileDeviceCached = isMobileDevice();
    if (this.isSoftwareWebGL) {
      // eslint-disable-next-line no-console
      console.warn(
        "[renderer] Software WebGL detected (CPU rendering). Performance will be severely limited.",
      );
    }

    // FIX: Set explicit clear color so TAA history starts from a defined state
    // instead of GPU-dependent garbage. Without this, the first several frames
    // blend the scene with uninitialized history (often all-black).
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Enable float textures for HDR. Safari 16 and below return null;
    // record the result so HDR-attachment paths can downgrade to LDR
    // rather than ship a broken framebuffer.
    this.hasFloatFramebuffer =
      gl.getExtension("EXT_color_buffer_float") !== null;
    if (!this.hasFloatFramebuffer) {
      // eslint-disable-next-line no-console
      console.warn(
        "[renderer] EXT_color_buffer_float unavailable; HDR pipeline downgraded",
      );
    }

    this.width = canvas.width;
    this.height = canvas.height;

    // Thread the float-framebuffer capability flag so bloom/TAA managers
    // can downgrade from RGBA16F to RGBA8 on adapters without
    // EXT_color_buffer_float (Safari ≤16, some mobile drivers).
    this.bloomManager = new BloomManager(
      gl,
      undefined,
      this.hasFloatFramebuffer,
    );
    this.bloomManager.initialize(this.width, this.height);

    this.reprojectionManager = new ReprojectionManager(
      gl,
      this.hasFloatFramebuffer,
    );
    this.reprojectionManager.resize(this.width, this.height);

    this.initTextures();

    try {
      this.initPipelines();
    } catch (e: unknown) {
      // eslint-disable-next-line no-console
      console.error("[WebGLRenderer] Pipeline init failed:", e);
      const message = e instanceof Error ? e.message : String(e);
      const stack = e instanceof Error ? e.stack : undefined;

      this.error = {
        type: "shader",
        message: `Shader pipeline failed: ${message}`,
        details: stack || String(e),
      };
      return false;
    }

    if (!this.program) {
      this.error = {
        type: "program",
        message:
          "Shader program was not created (compilation may have failed silently)",
      };
      return false;
    }

    return true;
  }

  private initTextures() {
    if (!this.gl) return;
    const gl = this.gl;

    this.noiseTex = createNoiseTexture(gl, 256);
    this.blueNoiseTex = createBlueNoiseTexture(gl, 256);
    this.loadSkyTexture();

    // LUTs will be initialized when physics starts
  }

  /**
   * Upload the Milky Way panorama once, asynchronously.
   *
   * A 1x1 black placeholder is bound first so the sampler always points at a
   * valid texture (sampling an unbound sampler2D is undefined and reads as
   * driver-dependent garbage). The real plate replaces it in place, which
   * keeps the texture object stable for the lifetime of the renderer.
   */
  private loadSkyTexture(): void {
    if (!this.gl || this.skyTextureRequested) return;
    this.skyTextureRequested = true;
    const gl = this.gl;

    const placeholder = createTextureFromData(gl, {
      width: 1,
      height: 1,
      data: new Uint8Array([0, 0, 0, 255]),
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
      wrap: gl.CLAMP_TO_EDGE,
    });
    if (!placeholder) return;
    this.milkywayTex = placeholder;

    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      // The renderer may have been disposed while the (4MB) plate decoded.
      if (!this.gl || this.milkywayTex !== placeholder) return;
      gl.bindTexture(gl.TEXTURE_2D, placeholder);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image,
      );
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
      if (aniso) {
        const max = gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
        gl.texParameterf(
          gl.TEXTURE_2D,
          aniso.TEXTURE_MAX_ANISOTROPY_EXT,
          Math.min(4, max as number),
        );
      }
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    };
    image.onerror = () => {
      // Keep the black placeholder: procedural stars still render.
      // eslint-disable-next-line no-console
      console.warn("[renderer] Milky Way plate failed to load");
    };
    image.src = "/textures/milkyway_2020_4k.jpg";
  }

  private initPipelines() {
    if (!this.gl) return;
    const gl = this.gl;
    this.shaderManager = new ShaderManager(gl);
    this.recompileShader(DEFAULT_FEATURES);
  }

  /**
   * Recompile the main shader program with the given feature toggles.
   * Uses the ShaderManager's cache, so repeated calls with the same features
   * are effectively free.
   */
  private recompileShader(features: import("@/types/features").FeatureToggles) {
    if (!this.gl || !this.shaderManager) return;
    const gl = this.gl;
    // Identity fast-path: same object as last frame → same key, skip the
    // JSON.stringify entirely (it ran 60x/sec for an unchanged object).
    if (features === this.lastFeaturesRef) return;
    const key = JSON.stringify(features);
    this.lastFeaturesRef = features;
    if (key === this.compiledFeaturesKey) return; // Already compiled

    const hasPost = !!(this.bloomManager || this.reprojectionManager);
    const variant = this.shaderManager.compileShaderVariant(
      vertexShaderSource,
      fragmentShaderSource,
      features,
      hasPost,
    );

    if (variant) {
      this.program = variant.program;
      this.uniformBatcher.upload(gl, this.program);
      this.compiledFeaturesKey = key;
      // Dev-only: recompiles hitch the pipeline (~50-200ms) and pop the
      // image — frequent lines here mean something is churning features.
      // eslint-disable-next-line no-console
      console.info(
        `[shader] recompile quality=${features.rayTracingQuality} ` +
          `bloom=${features.bloom} lensing=${features.gravitationalLensing} ` +
          `disk=${features.accretionDisk}`,
      );
    }
  }

  public resize(width: number, height: number) {
    if (this.width === width && this.height === height) return;
    this.width = width;
    this.height = height;

    if (this.bloomManager) this.bloomManager.resize(width, height);
    if (this.reprojectionManager)
      this.reprojectionManager.resize(width, height);
  }

  /**
   * Runtime quality governor (~0.33Hz evaluations, 6s warmup).
   *
   * Steps the ray-tracing rung down at <25fps rolling, restores up at
   * >75fps sustained over 4 evaluations, never below "low", never above
   * the ceiling, never from/to "off", and never during the post-manual-
   * change grace window. Only active when adaptive resolution is enabled
   * (adaptive ON = the user consented to automatic tuning).
   *
   * Anti-dance design: every fired step freezes evaluations for 8s (lets
   * the pipeline + rolling window settle and keeps shader-compile hitches
   * from feeding back), and the 25/75 band is wider than any single rung's
   * ~2x cost ratio so the governor cannot limit-cycle up/down.
   */
  private evaluateQualityGovernor(
    now: number,
    currentQuality: RayTracingQuality | string,
    metrics: { rollingAverageFPS: number },
    adaptiveEnabled: boolean,
  ): void {
    if (!this.onQualityChange || !adaptiveEnabled) {
      this.governorUpStreak = 0;
      this.governorDownStreak = 0;
      return;
    }
    if (now - this.rendererStartTime < 6000) return;
    if (now - this.lastGovernorEval < 3000) return;
    // Post-step settle freeze: don't even count streaks while the pipeline
    // is still converging on the last change.
    if (now - this.lastGovernorStepAt < 8000) return;
    this.lastGovernorEval = now;

    const action = governorAction(
      currentQuality,
      this.governorCeiling,
      metrics.rollingAverageFPS,
    );
    if (action === "hold") {
      this.governorUpStreak = 0;
      this.governorDownStreak = 0;
      return;
    }
    if (action === "up") {
      // Restore conservatively: 4 consecutive healthy evals (~12s).
      this.governorUpStreak += 1;
      this.governorDownStreak = 0;
      if (this.governorUpStreak < 4) return;
      this.governorUpStreak = 0;
    } else {
      // Step down only on 2 consecutive sick evals (~6s): a single bad
      // window is often a transient hitch (shader compile, GC), and each
      // rung change pops image sharpness visibly.
      this.governorDownStreak += 1;
      this.governorUpStreak = 0;
      if (this.governorDownStreak < 2) return;
      this.governorDownStreak = 0;
      // Respect the post-manual-change grace window for step-downs.
      if (now < this.governorGraceUntil) return;
    }

    const rung = (QUALITY_LADDER as readonly string[]).indexOf(currentQuality);
    if (rung < 0) return;
    const rungQuality = QUALITY_LADDER[rung];
    if (!rungQuality) return;
    const next = governorStep(rungQuality, action);
    if (next !== currentQuality) {
      this.pendingGovernorQuality = next;
      this.lastGovernorStepAt = now;
      // Dev-only journal (stripped in production by compiler.removeConsole):
      // each rung change pops sharpness visibly, so every fire must be
      // explainable from these lines. Paste them if quality "dances".
      // eslint-disable-next-line no-console
      console.info(
        `[auto-tune] quality ${String(currentQuality)}→${next} ` +
          `@rolling ${Math.round(metrics.rollingAverageFPS)}fps ` +
          `(ceiling ${String(this.governorCeiling)})`,
      );
      this.onQualityChange(next);
    }
  }

  public render(params: SimulationParams, mouse: { x: number; y: number }) {
    if (!this.gl || !this.program) return;
    const gl = this.gl;

    // Camera UVs for this frame. Prefer the rAF-rate live bus over the
    // React prop: the prop only refreshes on gated React syncs (~10Hz
    // idle), which stepped the camera visibly AND made motion detection
    // stutter (TAA flickering on/off at the sync cadence). Falls back to
    // the prop before the first live push (seq === 0).
    const camU =
      liveCamera.seq > 0 ? liveCamera.theta / (2 * Math.PI) : mouse.x;
    const camV = liveCamera.seq > 0 ? liveCamera.phi / Math.PI : mouse.y;

    // 1. Detect Motion for TAA (timestamp-based: the old setTimeout-per-
    // frame allocated a timer 60x/sec while moving and could fire late
    // under load, smearing the TAA blend window).
    const nowMotion = performance.now();
    const dx = Math.abs(camU - this.lastMouse.x);
    const dy = Math.abs(camV - this.lastMouse.y);
    if (dx > 0.0001 || dy > 0.0001) {
      this.lastMotionTime = nowMotion;
    }
    this.isCameraMoving = nowMotion - this.lastMotionTime < 300;
    // Avoid per-frame object spread ({ ...mouse } = 60 allocs/sec).
    this.lastMouse.x = camU;
    this.lastMouse.y = camV;

    // 2. Physics / LUT Sync
    this.syncLUTs();

    // --- Clock / Dynamic Resolution & Metrics ---
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Filter out huge spikes from tab switching / throttled rAF.
    const cappedDelta = Math.min(deltaTime, 100);

    // Simulation clock advances in TIME, not frames. It used to be
    // `this.time += 0.01` per rendered frame, so the disk rotation, nebula
    // drift and star twinkle ran ~2.4x fast on a 144Hz panel and half speed
    // at 30Hz -- and the value grew without bound. 0.01 per frame at 60Hz
    // equals 0.6 simulation units per second, which is the calibration this
    // keeps (identical look at 60fps, now identical *speed* everywhere).
    if (!params.paused) {
      this.time += (cappedDelta / 1000) * SIMULATION_UNITS_PER_SECOND;
    }

    // Auto-Tune off = fully locked: the monitor's own 3s calibration must
    // not report a lower quality or nudge resolution behind the user's back.
    this.performanceMonitor.setAutoTuneEnabled(!!params.adaptiveResolution);
    const metrics = this.performanceMonitor.updateMetrics(cappedDelta);

    // UNIFIED ADAPTIVE RESOLUTION (single owner).
    // The PerformanceMonitor PID (stepped inside updateMetrics above) is the
    // ONLY automatic controller. A previous React-level
    // AdaptiveResolutionController wrote params.renderScale on its own
    // cadence and fought this PID, causing double-scaling oscillation.
    // params.renderScale is now the manual ceiling: the PerformanceTab
    // slider caps how high the PID may go, and is used directly when
    // adaptive resolution is off.
    const userCeiling = Math.min(
      PERFORMANCE_CONFIG.resolution.maxScale,
      Math.max(PERFORMANCE_CONFIG.resolution.minScale, params.renderScale),
    );
    let dynamicRenderScale = userCeiling;
    if (
      params.adaptiveResolution &&
      PERFORMANCE_CONFIG.resolution.enableDynamicScaling
    ) {
      const deviceCap = this.isMobileDeviceCached
        ? PERFORMANCE_CONFIG.resolution.mobileCap
        : PERFORMANCE_CONFIG.resolution.maxScale;
      dynamicRenderScale = Math.min(
        userCeiling,
        metrics.renderResolution,
        deviceCap,
      );
    }
    // Feed the effective scale back every frame so PID state stays coherent
    // (output clamp doubles as anti-windup), the UI reports the true scale,
    // and re-enabling adaptive resumes bumplessly from the manual value.
    this.performanceMonitor.setRenderResolution(dynamicRenderScale);

    // Throttle UI Updates (2Hz / 500ms). Each onMetricsUpdate triggers a
    // full React re-render of the App tree; 5Hz was causing reconciliation
    // jank on top of GPU work. Telemetry stays live at 2Hz with no
    // perceptible staleness.
    // Push a snapshot copy: getMetrics returns the monitor's live internal
    // object, and storing that reference in React state would let later
    // frames silently mutate rendered state.
    if (now - this.lastMetricsUpdate > 500) {
      this.lastMetricsUpdate = now;
      if (this.onMetricsUpdate) {
        this.onMetricsUpdate({ ...metrics });
      }
    }

    // Software WebGL (CPU rendering) is ~100x slower for compute shaders.
    // Force maximum performance settings when detected. The override object
    // is memoized per input reference (it was rebuilt every frame).
    // DEFAULT_FEATURES supplies every required toggle so the spread
    // satisfies FeatureToggles even when params.features is partial.
    let features = params.features || DEFAULT_FEATURES;
    if (this.isSoftwareWebGL) {
      if (params.features !== this.lastForcedInput || !this.forcedFeatures) {
        this.lastForcedInput = params.features ?? null;
        this.forcedFeatures = {
          ...DEFAULT_FEATURES,
          ...params.features,
          rayTracingQuality: "off" as const,
          bloom: false,
          photonSphereGlow: false,
          relativisticJets: false,
          gravitationalRedshift: false,
          kerrShadow: false,
          backgroundStars: false,
        };
      }
      features = this.forcedFeatures ?? DEFAULT_FEATURES;
    }

    // 3. Render Pass
    // Recompile shader if feature toggles changed (cached if same)
    this.recompileShader(features);
    if (!this.program) return; // Recompile may have invalidated program
    const maxSteps = this.isSoftwareWebGL
      ? 16 // Minimal steps for software WebGL
      : getMaxRaySteps(features.rayTracingQuality, this.isMobileDeviceCached);

    // Anchor the governor ceiling + monitor display to the live quality.
    // Distinguishes user-driven changes (new ceiling + 15s grace so the
    // governor doesn't instantly fight an explicit manual selection) from
    // governor-driven ones (tracked via pendingGovernorQuality).
    if (this.lastSeenQuality !== features.rayTracingQuality) {
      const wasGovernorDriven =
        this.pendingGovernorQuality === features.rayTracingQuality;
      this.pendingGovernorQuality = null;
      this.lastSeenQuality = features.rayTracingQuality;
      this.governorCeiling = features.rayTracingQuality;
      this.governorUpStreak = 0;
      if (!wasGovernorDriven) {
        this.governorGraceUntil = now + 15000;
      }
      this.performanceMonitor.setQuality(features.rayTracingQuality);
    }

    // Runtime quality governor: the missing self-rescue. Resolution scaling
    // alone cannot save a GPU whose step budget is 4x over its head, and
    // shouldReduceQuality() was dead code nothing called. This evaluates at
    // 0.4Hz and steps the RUNG (never "off", never above the ceiling) via
    // onQualityChange, which the owner applies like a manual selection.
    this.evaluateQualityGovernor(
      now,
      features.rayTracingQuality,
      metrics,
      !!params.adaptiveResolution &&
        PERFORMANCE_CONFIG.resolution.enableDynamicScaling,
    );

    // Load-shed: while the TAA bypass is engaged (slow GPU), bloom passes
    // are skipped even if the toggle is on. Rationale: the governor only
    // steps ray counts, so a weak GPU kept all 6 fullscreen bloom passes
    // at every rung and barely recovered per step — ratcheting to the floor.
    // Shedding restores automatically with the bypass latch (hysteretic, so
    // no popping). The toggle itself is untouched.
    const bloomEffective = features.bloom && !this.taaBypassed;

    // Update Bloom Config
    if (this.bloomManager) {
      this.bloomManager.updateConfig({
        enabled: bloomEffective,
        // Intensity/Threshold could come from params too if added to UI
      });
    }

    // Post-processing bypass latch.
    //
    // Hysteresis latch: bypass engages below POST_BYPASS_ENGAGE_FPS rolling,
    // releases above POST_BYPASS_RELEASE_FPS, with 2.5s minimum dwell per
    // side. A bare threshold flapped the pipeline TAA↔no-TAA whenever fps
    // straddled it, popping between raw and blended frames — visible flicker.
    //
    // The latch only skips TAA/bloom. The scene is still rendered into the
    // HDR target and tone-mapped on present (see the pipeline section below).
    const rolling = metrics.rollingAverageFPS;
    // Auto-Tune OFF = locked settings: release any bypass so the full
    // pipeline (TAA) always runs and nothing pops on its own.
    const autoTune =
      !!params.adaptiveResolution &&
      PERFORMANCE_CONFIG.resolution.enableDynamicScaling;
    if (!autoTune) {
      if (this.taaBypassed) {
        this.taaBypassed = false;
        this.lastTaaSwitchMs = now;
        this.reprojectionManager?.resetHistory();
      }
    } else if (
      !this.taaBypassed &&
      rolling > 0 &&
      rolling < POST_BYPASS_ENGAGE_FPS &&
      now - this.lastTaaSwitchMs > 2500
    ) {
      this.taaBypassed = true;
      this.lastTaaSwitchMs = now;
      // eslint-disable-next-line no-console
      console.info(
        `[auto-tune] TAA bypass ON @rolling ${Math.round(rolling)}fps (no TAA/bloom)`,
      );
    } else if (this.taaBypassed && rolling > POST_BYPASS_RELEASE_FPS) {
      this.taaBypassed = false;
      this.lastTaaSwitchMs = now;
      // The history buffer stopped being written while the bypass was on;
      // reset it so the first re-enabled frame cannot blend a stale image
      // (ghosting/afterimage pop).
      this.reprojectionManager?.resetHistory();
      // eslint-disable-next-line no-console
      console.info(
        `[auto-tune] TAA bypass OFF @rolling ${Math.round(rolling)}fps (full pipeline)`,
      );
    }
    // The scene MUST land in the offscreen HDR target: the fragment shader is
    // compiled with ENABLE_LINEAR_OUTPUT (a post manager always exists), so
    // it emits linear HDR with no ACES/gamma. Drawing that straight to the
    // canvas bypasses tone mapping and clips the disk into a saturated red
    // wash. The bypass latch only skips TAA + bloom, never the tone-map blit.
    const needsOffscreen = true;
    const targetFB = this.bloomManager
      ? this.bloomManager.beginScene(needsOffscreen)
      : null;
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFB);
    const beganOffscreen = targetFB !== null;

    gl.viewport(
      0,
      0,
      this.width * dynamicRenderScale,
      this.height * dynamicRenderScale,
    );
    gl.useProgram(this.program);

    // Bind Textures
    // NOTE: Sampler uniforms MUST be set with integer calls (set/uniform1i),
    // NOT float calls (set1f). Using float for sampler2D is undefined behavior.
    if (this.noiseTex) {
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.noiseTex);
      this.uniformBatcher.set("u_noiseTex", 2);
    }
    if (this.blueNoiseTex) {
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, this.blueNoiseTex);
      this.uniformBatcher.set("u_blueNoiseTex", 3);
    }
    if (this.diskLUT) {
      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D, this.diskLUT);
      this.uniformBatcher.set("u_diskLUT", 4);
    }
    if (this.spectrumLUT) {
      gl.activeTexture(gl.TEXTURE5);
      gl.bindTexture(gl.TEXTURE_2D, this.spectrumLUT);
      this.uniformBatcher.set("u_spectrumLUT", 5);
    }
    if (this.milkywayTex) {
      gl.activeTexture(gl.TEXTURE6);
      gl.bindTexture(gl.TEXTURE_2D, this.milkywayTex);
      this.uniformBatcher.set("u_milkywayTex", 6);
    }

    // Physics Bridge Integration (zero-alloc: reuse _shadowCurve)
    let shadowShiftMin = -(params.mass * 2.0) * 2.6; // Fallback
    let shadowShiftMax = params.mass * 2.0 * 2.6;
    const shadowCurve = this._shadowCurve;
    let shadowCount = 0;

    if (physicsBridge && physicsBridge.isReady()) {
      const telemetry = physicsBridge.tick(0.016); // keep telemetry alive
      if (telemetry && (telemetry.physics[15] ?? 0) > 0.0) {
        shadowShiftMin = telemetry.physics[4] ?? 0;
        shadowShiftMax = telemetry.physics[5] ?? 0;
        shadowCount = telemetry.physics[15] ?? 0;

        for (let i = 0; i < 128; i++) {
          shadowCurve[i] = telemetry.physics[16 + i] ?? 0;
        }
      }
    }

    // Default Schwarzschild fallback if telemetry is missing or zeros
    if (shadowCount <= 0) {
      const b_crit = 3 * Math.sqrt(3) * params.mass;
      shadowCount = 64;
      for (let i = 0; i < 64; i++) {
        const phi = (i / 64) * Math.PI * 2.0;
        shadowCurve[i * 2] = Math.cos(phi) * b_crit;
        shadowCurve[i * 2 + 1] = Math.sin(phi) * b_crit;
      }
    }

    this.uniformBatcher.set1f("u_shadowCount", shadowCount);

    this.uniformBatcher.set2f("u_shadowShift", shadowShiftMin, shadowShiftMax);
    this.uniformBatcher.set("u_shadowCurve", shadowCurve);

    // CAMERA: Compute from useCamera's spherical coordinates.
    //
    // useCamera encodes its state as:
    //   mouse.x = cameraState.theta / (2 * PI)  -- azimuthal angle [0, 1]
    //   mouse.y = cameraState.phi / PI           -- polar angle [0, 1]
    //
    // We set u_camPos = (0,0,0) to trigger the FALLBACK camera in the shader,
    // which uses u_mouse + u_zoom for a proper spherical camera. This ensures
    // all user interaction (drag, auto-spin, cinematic) is reflected.
    this.uniformBatcher.set3f("u_camPos", 0.0, 0.0, 0.0);
    this.uniformBatcher.set4f("u_camQuat", 0.0, 0.0, 0.0, 1.0);

    // Set Common Uniforms
    this.uniformBatcher.set2f(
      "u_resolution",
      this.width * dynamicRenderScale,
      this.height * dynamicRenderScale,
    );
    this.uniformBatcher.set1f("u_time", this.time);
    this.uniformBatcher.set1f("u_mass", params.mass);
    this.uniformBatcher.set1f("u_spin", params.spin * params.mass);
    this.uniformBatcher.set1f("u_zoom", params.zoom * 2.0); // FIX: Decoupled from mass so it grows visibly
    this.uniformBatcher.set1f(
      "u_disk_size",
      params.diskSize ?? SIMULATION_CONFIG.diskSize.default,
    );
    this.uniformBatcher.set1f(
      "u_disk_scale_height",
      params.diskScaleHeight ?? SIMULATION_CONFIG.diskScaleHeight.default,
    );
    this.uniformBatcher.set1f("u_maxRaySteps", maxSteps);
    this.uniformBatcher.set1f(
      "u_show_redshift",
      features.gravitationalRedshift ? 1.0 : 0.0,
    );
    this.uniformBatcher.set1f(
      "u_show_kerr_shadow",
      features.kerrShadow ? 1.0 : 0.0,
    );
    this.uniformBatcher.set1f("u_lensing_strength", params.lensing ?? 1.0);
    // Composition: camera roll about the view axis (degrees -> radians) plus
    // the sky/disk exposure constants from the reference-shot config.
    this.uniformBatcher.set1f(
      "u_roll",
      ((params.roll ?? REFERENCE_SHOT.camera.rollDeg) * Math.PI) / 180,
    );
    this.uniformBatcher.set1f("u_milkywayGain", REFERENCE_SHOT.sky.gain);
    this.uniformBatcher.set1f("u_diskGain", REFERENCE_SHOT.disk.gain);
    this.uniformBatcher.set1f(
      "u_frame_dragging_strength",
      PHYSICS_CONSTANTS.gravity.frameDraggingStrength,
    );
    // Upload mouse (spherical camera coords computed at the top of this
    // frame from the live bus — see note there).
    this.uniformBatcher.set2f("u_mouse", camU, camV);
    // Disk appearance uniforms
    this.uniformBatcher.set1f(
      "u_disk_density",
      params.diskDensity ?? SIMULATION_CONFIG.diskDensity.default,
    );

    this.uniformBatcher.set1f(
      "u_star_density",
      params.starDensity ?? SIMULATION_CONFIG.starDensity.default,
    );

    // THERMODYNAMICS FIX: T ~ M^-1/4 (Shakura-Sunyaev)
    // Small BH = Hotter (Blue), Large BH = Cooler (Red)
    const baseTemp = params.diskTemp ?? SIMULATION_CONFIG.diskTemp.default;
    const massFactor = Math.pow(params.mass, -0.25);
    this.uniformBatcher.set1f("u_disk_temp", baseTemp * massFactor);
    this.uniformBatcher.set1f("u_debug", 0.0);

    const quadBuffer = getSharedQuadBuffer(gl);
    if (quadBuffer) {
      this.uniformBatcher.setupAttribute("position", quadBuffer);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // 4. Post-processing Pipeline
    // SCIENTIFIC ACCURACY: We must ensure signal processing chains (Bloom, TAA)
    // strictly respect the physical model's feature toggles.
    //
    // The scene is ALWAYS written to the offscreen HDR target (see
    // `beginScene(true)` above). The only legitimately skippable work when the
    // GPU is struggling is TAA + bloom; the tone-map blit is mandatory.

    if (beganOffscreen && this.bloomManager) {
      const sceneTexture = this.bloomManager.getSceneTexture();
      if (sceneTexture) {
        if (this.taaBypassed || !this.reprojectionManager) {
          // Load-shed path: no TAA, no bloom -- but still tone-map + gamma
          // through the combine shader's identity mode.
          this.bloomManager.drawTextureToScreen(
            sceneTexture,
            dynamicRenderScale,
          );
        } else {
          // Resolve TAA (Temporal Anti-Aliasing)
          this.reprojectionManager.resolve(
            sceneTexture,
            0.75,
            this.isCameraMoving,
            dynamicRenderScale,
          );

          const resolved = this.reprojectionManager.getResultTexture();

          if (resolved) {
            // CRITICAL FIX: Explicitly check bloomEffective before applying
            // bloom. Even if bloomManager exists, we must only apply the
            // effect if the FEATURE TOGGLE is active AND not load-shed.
            if (bloomEffective) {
              this.bloomManager.applyBloomToTexture(
                resolved,
                dynamicRenderScale,
              );
            } else {
              // If bloom disabled, just draw the TAA-resolved frame to screen
              this.bloomManager.drawTextureToScreen(
                resolved,
                dynamicRenderScale,
              );
            }
          } else {
            // Fallback if TAA failed (should rarely happen)
            if (bloomEffective) {
              this.bloomManager.applyBloom(dynamicRenderScale);
            } else {
              this.bloomManager.drawTextureToScreen(
                sceneTexture,
                dynamicRenderScale,
              );
            }
          }
        }
      }
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private syncLUTs() {
    if (!this.gl) return;
    const gl = this.gl;

    // BUG FIX: getDiskLUT() and getSpectrumLUT() check `this.engine` which
    // is null in worker mode (the production path). These methods only work
    // in the main-thread fallback path. Wrap in try/catch to prevent
    // silent exceptions from killing the render loop.
    try {
      if (!this.diskLUT) {
        const data = physicsBridge.getDiskLUT();
        if (data) {
          this.diskLUT = createTextureFromData(gl, {
            width: 512,
            height: 1,
            data,
            minFilter: gl.LINEAR,
            magFilter: gl.LINEAR,
            wrap: gl.CLAMP_TO_EDGE,
            internalFormat: gl.R32F,
            format: gl.RED,
            type: gl.FLOAT,
          });
        }
      }

      if (!this.spectrumLUT) {
        const data = physicsBridge.getSpectrumLUT(512, 1, 100000.0);
        if (data) {
          this.spectrumLUT = createTextureFromData(gl, {
            width: 512,
            height: 1,
            data,
            minFilter: gl.LINEAR,
            magFilter: gl.LINEAR,
            wrap: gl.CLAMP_TO_EDGE,
            internalFormat: gl.RGBA32F,
            format: gl.RGBA,
            type: gl.FLOAT,
          });
        }
      }
    } catch {
      // Expected in worker mode where this.engine is null
    }
  }

  public cleanup() {
    if (this.shaderManager) this.shaderManager.clearCache();
    if (this.gl) {
      if (this.noiseTex) this.gl.deleteTexture(this.noiseTex);
      if (this.blueNoiseTex) this.gl.deleteTexture(this.blueNoiseTex);
      if (this.diskLUT) this.gl.deleteTexture(this.diskLUT);
      if (this.spectrumLUT) this.gl.deleteTexture(this.spectrumLUT);
      if (this.milkywayTex) {
        this.gl.deleteTexture(this.milkywayTex);
        this.milkywayTex = null;
      }
    }
    if (this.bloomManager) this.bloomManager.cleanup();
    if (this.reprojectionManager) this.reprojectionManager.cleanup();
  }
}
