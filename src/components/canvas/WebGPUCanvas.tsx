import { useRef, useEffect, useState } from "react";
import { vec3, mat4 } from "gl-matrix";
import { AlertCircle } from "lucide-react";

import { WebGPURenderer } from "@/rendering/webgpu/renderer";
import type { SimulationParams, MouseState } from "@/types/simulation";
import type { CameraUniforms, PhysicsParams } from "@/types/webgpu";
import { getMaxRaySteps } from "@/config/feature-flags";
import { isMobileDevice } from "@/utils/device-detection";
import { AdaptiveResolutionController } from "@/rendering/adaptive-resolution";
import { liveCamera } from "@/engine/camera-live";

type MetricsUpdate = import("@/performance/monitor").PerformanceMetrics;

interface WebGPUCanvasProps {
  params: SimulationParams;
  mouse: MouseState;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  onWheel?: (e: React.WheelEvent | WheelEvent) => void;
  onTouchStart?: (e: React.TouchEvent | TouchEvent) => void;
  onTouchMove?: (e: React.TouchEvent | TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent | TouchEvent) => void;
  onMetricsUpdate?: (metrics: MetricsUpdate) => void;
}

export const WebGPUCanvas = ({
  params,
  mouse,
  onMetricsUpdate,
  ...handlers
}: WebGPUCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGPURenderer | null>(null);
  const requestRef = useRef<number>(0);
  const onMetricsRef = useRef(onMetricsUpdate);
  // Live prop mirrors: the rAF loop is started once and closes over the
  // mount scope, so without mirrors it would render forever with stale
  // params/mouse (frozen camera). Synced in an effect below (never during
  // render) — the loop reads the latest committed values.
  const paramsRef = useRef(params);
  const mouseRef = useRef(mouse);
  useEffect(() => {
    onMetricsRef.current = onMetricsUpdate;
    paramsRef.current = params;
    mouseRef.current = mouse;
  });
  // Stable per-mount objects via state initializers (created once, readable
  // during render without ref-access violations).
  const [fpsAccum] = useState({ frames: 0, lastPush: 0, fps: 60 });
  // WebGPU-path adaptive resolution. Previously the WebGPU path never scaled
  // anything (the React hook wrote params.renderScale, which nothing on this
  // path consumed). This controller lives inside the rAF loop and drives the
  // compute dispatch size via physics.resolution; the blit pass upscales to
  // full canvas with the linear sampler. Quantized application below avoids
  // reallocating compute/history textures every frame.
  const [adapt] = useState(() => ({
    controller: new AdaptiveResolutionController({
      enabled: true,
      minScale: 0.5,
      maxScale: 1.0,
      targetFPS: 60,
      adjustmentStep: 0.1,
    }),
    appliedScale: 1.0,
    lastChange: 0,
    lastEnabled: true,
    prevT: 0,
  }));
  const [error, setError] = useState<{
    message: string;
    details?: string;
  } | null>(null);
  const prevViewProjRef = useRef<mat4 | null>(null);
  // Pre-allocated matrix scratch, created once per mount. The rAF loop
  // closes over these stable objects for the component lifetime.
  const [scratch] = useState(() => ({
    camPos: new Float32Array(4),
    camDir: new Float32Array(4),
    view: mat4.create(),
    proj: mat4.create(),
    invView: mat4.create(),
    invProj: mat4.create(),
    viewProj: mat4.create(),
    eye: vec3.create(),
    target: vec3.create(),
    up: vec3.create(),
    dir: vec3.create(),
  }));
  const _camPos = scratch.camPos;
  const _camDir = scratch.camDir;
  const _view = scratch.view;
  const _proj = scratch.proj;
  const _invView = scratch.invView;
  const _invProj = scratch.invProj;
  const _viewProj = scratch.viewProj;
  const _eye = scratch.eye;
  const _target = scratch.target;
  const _up = scratch.up;
  const _dir = scratch.dir;

  useEffect(() => {
    if (!canvasRef.current || rendererRef.current) return;

    initialize();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only init once, subsequent updates via other effects

  useEffect(() => {
    if (rendererRef.current && params.features?.rayTracingQuality) {
      const steps = getMaxRaySteps(
        params.features.rayTracingQuality,
        isMobileDevice(),
      );
      rendererRef.current.updateSettings(steps);
    }
  }, [params.features?.rayTracingQuality]);

  const startLoop = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    const loop = (t: number) => {
      if (rendererRef.current) {
        renderFrame(t);
      }
      // renderFrame nulls rendererRef on crash — stop instead of
      // rescheduling to prevent infinite error spam.
      if (!rendererRef.current) return;
      requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);
  };

  // Extracted init sequence (init → initPipelines → startLoop), reused by
  // the mount effect above and the Retry button below. Calls verified
  // against the WebGPURenderer API: init(canvas), initPipelines(format,
  // steps), getFormat(), updateSettings(steps), render(camera, physics).
  // NOTE: the renderer exposes no device-lost signal (no `device.lost` /
  // `uncapturederror` wiring in src/rendering/webgpu/renderer.ts), so no
  // device-loss handler is attached here and the renderer itself is
  // intentionally left untouched.
  const initialize = async () => {
    const canvas = canvasRef.current;
    if (!canvas || rendererRef.current) return;

    const renderer = new WebGPURenderer();
    const success = await renderer.init(canvas);
    if (success) {
      // Initial settings
      const quality = params.features?.rayTracingQuality || "high";
      const steps = getMaxRaySteps(quality, isMobileDevice());
      await renderer.initPipelines(renderer.getFormat(), steps);
      rendererRef.current = renderer;
      startLoop();
    } else {
      // eslint-disable-next-line no-console
      console.error("Failed to init WebGPU renderer");
      setError({
        message:
          "Could not initialize WebGPU. Your browser or GPU may not support it, or it may be disabled.",
      });
    }
  };

  const handleRetry = () => {
    setError(null);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    requestRef.current = 0;
    // NOTE: WebGPURenderer exposes no cleanup/dispose method, so the
    // previous renderer instance is dropped here without explicit GPU
    // resource release.
    rendererRef.current = null;
    initialize();
  };

  // Resize Handling decoupled from render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Cap DPR like WebGL path: 1.5x desktop / 1.0x coarse pointers.
        // Uncapped DPR (3x mobile) explodes compute-texture VRAM.
        const isCoarse =
          typeof window.matchMedia !== "undefined" &&
          window.matchMedia("(pointer: coarse)").matches;
        const dpr = Math.min(
          window.devicePixelRatio || 1,
          isCoarse ? 1.0 : 1.5,
        );
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;

        if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
          canvas.width = width * dpr;
          canvas.height = height * dpr;
          // Notify renderer about resize if needed (usually handled next frame by viewport)
          if (rendererRef.current) {
            // Optional: rendererRef.current.resize(width, height);
            // WebGPU handles this via configure usually, but we set canvas size here.
          }
        }
      }
    });

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, []);

  const renderFrame = (timestamp: number) => {
    try {
      const renderer = rendererRef.current;
      const canvas = canvasRef.current;
      if (!renderer || !canvas) return;

      // Read live props via refs (see paramsRef/mouseRef note above).
      // Camera angles come from the rAF-rate live bus (no React stepping);
      // the mouse prop is only the pre-first-frame fallback.
      const liveParams = paramsRef.current;
      const liveMouse =
        liveCamera.seq > 0
          ? {
              x: liveCamera.theta / (2 * Math.PI),
              y: liveCamera.phi / Math.PI,
            }
          : mouseRef.current;

      // ── In-loop adaptive resolution ──
      // Step the controller every frame with capped dt (tab-switch spikes
      // must not instantly trip the 2s low-FPS dwell). The QUANTIZED TARGET
      // (not the smoothly interpolated current) drives the applied scale so
      // compute/history textures realloc at most on discrete 0.05 steps
      // with a 500ms cooldown — never every frame.
      // `adapt` is mount-stable state (see declaration above).
      const enabled = liveParams.adaptiveResolution ?? false;
      if (enabled !== adapt.lastEnabled) {
        adapt.controller.setEnabled(enabled);
        adapt.lastEnabled = enabled;
      }
      const rawDt = adapt.prevT > 0 ? (timestamp - adapt.prevT) / 1000 : 0.016;
      adapt.prevT = timestamp;
      const ctrlDt = Math.min(Math.max(rawDt, 0.001), 0.1);
      const instantFps = 1 / ctrlDt;
      adapt.controller.update(instantFps, ctrlDt);
      const quantTarget =
        Math.round(adapt.controller.getTargetScale() / 0.05) * 0.05;
      const clampedTarget = Math.min(1.0, Math.max(0.5, quantTarget));
      if (
        enabled &&
        clampedTarget !== adapt.appliedScale &&
        timestamp - adapt.lastChange > 500
      ) {
        adapt.appliedScale = clampedTarget;
        adapt.lastChange = timestamp;
      } else if (!enabled && adapt.appliedScale !== 1.0) {
        adapt.appliedScale = 1.0;
        adapt.lastChange = timestamp;
      }
      const resScale = adapt.appliedScale;

      // Use current canvas dimensions (updated by ResizeObserver).
      // Compute dispatches at the SCALED size; the blit pass upscales to
      // full canvas via the linear sampler (virtual viewport scaling).
      const width = canvas.width;
      const height = canvas.height;
      const computeWidth = Math.max(8, Math.floor(width * resScale));
      const computeHeight = Math.max(8, Math.floor(height * resScale));

      // Compute Camera Matrices (Simple Orbit)
      const zoom = Math.max(2.1, liveParams.zoom); // Keep outside horizon (r=2)
      // Map mouse [0,1] to angles. 0.5 is center.
      // Assume mouse.x/y are normalized [0,1]
      const theta = (liveMouse.x - 0.5) * Math.PI * 4.0; // Horizontal rotation
      const phi = (liveMouse.y - 0.5) * Math.PI * 2.0; // Vertical rotation

      // Clamp vertical to avoid gimbal lock or flipping (keep simple)
      const clampedPhi = Math.max(
        -Math.PI / 2 + 0.1,
        Math.min(Math.PI / 2 - 0.1, phi),
      );

      // Position (Spherical to Cartesian)
      // x = r sin(theta) cos(phi)
      // y = r sin(phi)
      // z = r cos(theta) cos(phi)
      // Note: Y-up world. Zero-alloc: reuse scratch instead of
      // vec3.fromValues()/mat4.create() per frame.
      vec3.set(
        _eye,
        zoom * Math.sin(theta) * Math.cos(clampedPhi),
        zoom * Math.sin(clampedPhi),
        zoom * Math.cos(theta) * Math.cos(clampedPhi),
      );
      const eye = _eye;
      vec3.set(_target, 0, 0, 0);
      const target = _target;
      vec3.set(_up, 0, 1, 0);
      const up = _up;

      const view = _view;
      mat4.lookAt(view, eye, target, up);

      const proj = _proj;
      const FOV_DEG = 60;
      const fov = (FOV_DEG * Math.PI) / 180;
      mat4.perspective(proj, fov, width / height, 0.1, 1000.0);

      const invView = _invView;
      mat4.invert(invView, view);

      const invProj = _invProj;
      mat4.invert(invProj, proj);

      const dir = _dir;
      vec3.subtract(dir, target, eye);
      vec3.normalize(dir, dir);

      const viewProj = _viewProj;
      mat4.multiply(viewProj, proj, view);

      // Write into pre-allocated scratch arrays (avoids per-frame allocation)
      _camPos[0] = eye[0];
      _camPos[1] = eye[1];
      _camPos[2] = eye[2];
      _camPos[3] = 0;
      _camDir[0] = dir[0];
      _camDir[1] = dir[1];
      _camDir[2] = dir[2];
      _camDir[3] = 0;

      // History buffer: dedicated allocation, updated via copy so the
      // per-frame scratch (_viewProj) can be reused without cloning.
      if (!prevViewProjRef.current) {
        prevViewProjRef.current = mat4.clone(viewProj);
      }
      // Construct Uniforms
      const cameraUniforms: CameraUniforms = {
        viewMatrix: view as Float32Array,
        projectionMatrix: proj as Float32Array,
        inverseView: invView as Float32Array,
        inverseProjection: invProj as Float32Array,
        prevViewProj: prevViewProjRef.current as Float32Array,
        position: _camPos,
        direction: _camDir,
      };

      // Physics Param filtering
      const physSpin = Math.max(-1.0, Math.min(1.0, liveParams.spin / 5.0));

      const physParams: PhysicsParams = {
        mass: liveParams.mass,
        spin: physSpin,
        resolution: [computeWidth, computeHeight],
        time: timestamp / 1000.0,
        dt: 0.016,
        frameIndex: 0, // Updated inside renderer
        _padding: 0,
      };

      renderer.render(cameraUniforms, physParams);

      // Update history AFTER render (copy, zero allocation). Must not
      // mutate prevViewProj before render consumes it for TAA reprojection.
      if (prevViewProjRef.current) {
        mat4.copy(prevViewProjRef.current, viewProj);
      }

      // Feed adaptive-resolution + telemetry at 2Hz. Previously the WebGPU
      // path never called onMetricsUpdate, leaving FPS/quality frozen and
      // adaptive resolution dead.
      const acc = fpsAccum;
      acc.frames += 1;
      if (timestamp - acc.lastPush > 500) {
        const fps = Math.round(
          (acc.frames * 1000) / Math.max(1, timestamp - acc.lastPush),
        );
        acc.fps = fps;
        acc.frames = 0;
        acc.lastPush = timestamp;
        onMetricsRef.current?.({
          currentFPS: fps,
          frameTimeMs: Math.round((1000 / Math.max(1, fps)) * 100) / 100,
          rollingAverageFPS: fps,
          quality: liveParams.features?.rayTracingQuality ?? "high",
          renderResolution: adapt.appliedScale,
        });
      }
    } catch (e: unknown) {
      // CRITICAL: Without this try/catch, any throw inside render()
      // silently kills the rAF loop with no visible error (mirrors
      // WebGLCanvas).
      // eslint-disable-next-line no-console
      console.error("[WebGPUCanvas] Render loop crash:", e);
      const err = e as Error;
      setError({
        message: `Render loop crashed: ${err.message || String(e)}`,
        details: err.stack || String(e),
      });
      // Stop the loop on crash to prevent infinite error spam. Nulling
      // rendererRef also makes startLoop skip rescheduling.
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      requestRef.current = 0;
      rendererRef.current = null;
      return;
    }
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full z-0 cursor-move"
        {...handlers}
      />

      {error && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm select-text">
          <div className="max-w-2xl mx-4 p-6 bg-red-950/50 border border-red-500/30 rounded-xl shadow-2xl">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-bold text-red-300">
                    WebGPU Not Available
                  </h2>
                  <button
                    onClick={handleRetry}
                    className="text-[10px] bg-red-500/20 hover:bg-red-500/30 px-2 py-1 rounded border border-red-500/30 text-white transition-colors"
                  >
                    Retry
                  </button>
                </div>
                <p className="text-sm text-gray-300 mb-3">{error.message}</p>
                {error.details && (
                  <div className="text-xs text-gray-400 bg-black/30 p-3 rounded border border-white/10 max-h-[400px] overflow-auto">
                    <div className="font-medium text-gray-300 mb-2">
                      Technical Details:
                    </div>
                    <pre className="whitespace-pre-wrap font-mono break-all">
                      {error.details}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
