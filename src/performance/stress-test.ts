/**
 * Offscreen Frame Stress Test
 *
 * Renders a ray-march-representative workload with a WebGL2 context on an
 * offscreen canvas, measuring true ALU throughput with synchronous
 * draws. The result drives the initial quality preset recommendation
 * before the main canvas mounts.
 *
 * WHY NOT A TRIVIAL SHADER: a previous gradient-quad probe measured
 * ~vsync on every GPU (even software rasterizers), so calibration handed
 * ultra-quality to nearly all hardware and weak GPUs opened the app at
 * 256 ray-march steps — single-digit FPS with no way back (the runtime
 * governor only scaled pixels). This probe instead runs 64 iterations of
 * Kerr-like math (normalize + sqrt/div + trig, the exact mix dominating
 * `kerr_geodesic_accel`) per pixel at ~0.6 Mpix, approximating one
 * medium-quality frame. Measured throughput therefore predicts real
 * ray-marching performance within a small factor, and thresholds in
 * PERFORMANCE_CONFIG.startup are set against THIS workload.
 *
 * WHY SYNCHRONOUS: rAF-capped measurement saturates at the display refresh
 * rate and cannot discriminate strong GPUs. Blocking draws with
 * gl.finish() time the GPU honestly. This runs behind the loading screen.
 */

import { PERFORMANCE_CONFIG } from "@/config/performance.config";
import {
  createShader,
  createProgram,
  getSharedQuadBuffer,
} from "@/utils/webgl-utils";

export interface StressTestResult {
  /** Average FPS across the measurement window */
  averageFPS: number;
  /** Minimum FPS recorded */
  minFPS: number;
  /** Maximum FPS recorded */
  maxFPS: number;
  /** Number of frame samples collected */
  sampleCount: number;
  /** Actual measurement duration in ms */
  durationMs: number;
  /** Whether the test yielded a reliable measurement */
  reliable: boolean;
}

/**
 * Representative probe: 64 iterations/pixel of Kerr-like math.
 * Each iteration mixes length/normalize, reciprocal powers (the
 * sqrt/div core of the geodesic acceleration), and trig frame-drag
 * terms — the same ALU profile as one medium-quality ray-march pixel
 * (early-outs in the real shader make 64 probe iterations ≈ one
 * average medium frame at this resolution, within ~2x).
 */
const VERT_SRC = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG_SRC = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform vec2 u_res;
void main() {
  vec2 aspect = u_res / min(u_res.x, u_res.y);
  vec2 p = (v_uv * 2.0 - 1.0) * aspect * 8.0;
  vec3 v = normalize(vec3(p, 1.2));
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 64; i++) {
    float r = length(p) + 1e-3;
    float inv = 1.0 / r;
    float w = 2.0 * inv * inv * inv;
    float fi = float(i);
    float s = sin(p.x * w + fi * 0.13) + cos(p.y * w * 1.7 + fi * 0.07);
    vec3 a = vec3(s * inv, cos(r * 3.1 + fi) * inv * inv, sin(r * 1.3 + w) * inv);
    acc += a * 0.02;
    p += v.xy * 0.05 + a.xy * 0.001;
    v = normalize(v + vec3(a.x, 0.0, a.y) * 0.01);
  }
  float m = length(acc);
  vec3 col = vec3(m * 0.4, m * 0.25, m * 0.6) / (1.0 + m);
  fragColor = vec4(col, 1.0);
}`;

/**
 * Run an offscreen stress test that renders a representative workload
 * and returns throughput statistics.
 *
 * Measurement is SYNCHRONOUS (blocking draws + gl.finish, no rAF) so
 * results are not capped at the display refresh rate and weak GPUs are
 * honestly slow. Worst-case block is ~durationMs on the loading screen.
 *
 * @param durationMs  Time budget for measurement (default: 2500).
 * @param warmupMs    Unused legacy parameter (kept for API compatibility;
 *                    warmup is a fixed 8 synchronous draws).
 * @param targetSize  Offscreen canvas size (default: 768 → ~0.6 Mpix).
 */
export function runStressTest(
  durationMs: number = PERFORMANCE_CONFIG.startup.stressTestDurationMs,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  warmupMs: number = PERFORMANCE_CONFIG.startup.stressTestWarmupMs,
  targetSize: number = 768,
): Promise<StressTestResult> {
  return new Promise((resolve) => {
    const cfg = PERFORMANCE_CONFIG.startup;

    // Create offscreen canvas + WebGL2 context
    const canvas = document.createElement("canvas");
    canvas.width = targetSize;
    canvas.height = targetSize;
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });

    // If we can't get WebGL2, return unreliable result immediately.
    if (!gl) {
      resolve({
        averageFPS: 0,
        minFPS: 0,
        maxFPS: 0,
        sampleCount: 0,
        durationMs: 0,
        reliable: false,
      });
      return;
    }

    const finish = (
      result: Omit<StressTestResult, "durationMs">,
      startTime: number,
    ) => {
      resolve({ ...result, durationMs: performance.now() - startTime });
    };

    // Compile shaders with status checks (shared utils throw on error → map to null)
    let vs: WebGLShader | null;
    let fs: WebGLShader | null;
    try {
      vs = createShader(gl, gl.VERTEX_SHADER, VERT_SRC);
      fs = createShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    } catch {
      vs = null;
      fs = null;
    }
    if (!vs || !fs) {
      finish(
        {
          averageFPS: 0,
          minFPS: 0,
          maxFPS: 0,
          sampleCount: 0,
          reliable: false,
        },
        performance.now(),
      );
      return;
    }

    let prog: WebGLProgram | null;
    try {
      prog = createProgram(gl, vs, fs);
    } catch {
      prog = null;
    }
    if (!prog) {
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      finish(
        {
          averageFPS: 0,
          minFPS: 0,
          maxFPS: 0,
          sampleCount: 0,
          reliable: false,
        },
        performance.now(),
      );
      return;
    }

    gl.useProgram(prog);

    // Shared full-screen quad (two triangles forming a NDC square)
    const buf = getSharedQuadBuffer(gl);
    if (!buf) {
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      finish(
        {
          averageFPS: 0,
          minFPS: 0,
          maxFPS: 0,
          sampleCount: 0,
          reliable: false,
        },
        performance.now(),
      );
      return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);

    const posLoc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const resLoc = gl.getUniformLocation(prog, "u_res");
    if (resLoc) gl.uniform2f(resLoc, targetSize, targetSize);

    gl.viewport(0, 0, targetSize, targetSize);

    // Warmup: fixed synchronous draws to stabilise GPU clocks.
    for (let i = 0; i < 8; i++) {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.finish();

    // Measurement phase: blocking draws, wall-clocked. No rAF, so no
    // vsync cap — a fast GPU honestly reports hundreds of fps.
    const maxFrames = cfg.stressTestTargetFrames;
    const frameMs: number[] = [];
    const startTime = performance.now();
    for (let i = 0; i < maxFrames; i++) {
      const t0 = performance.now();
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.finish();
      frameMs.push(performance.now() - t0);
      // Time-box: on very slow GPUs stop early and extrapolate from what
      // we collected rather than blocking the loading screen indefinitely.
      if (
        performance.now() - startTime >= durationMs &&
        frameMs.length >= 10
      ) {
        break;
      }
    }

    gl.deleteProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    // Do not delete buf as it is shared via getSharedQuadBuffer

    if (frameMs.length < cfg.minSamplesForReliable) {
      finish(
        {
          averageFPS: 0,
          minFPS: 0,
          maxFPS: 0,
          sampleCount: frameMs.length,
          reliable: false,
        },
        startTime,
      );
      return;
    }

    // Honest average: mean frame time → fps (NOT mean of per-frame fps,
    // which over-weights fast outliers).
    let sumMs = 0;
    let minMs = Infinity;
    let maxMs = -Infinity;
    for (const ms of frameMs) {
      sumMs += ms;
      if (ms < minMs) minMs = ms;
      if (ms > maxMs) maxMs = ms;
    }
    const meanMs = sumMs / frameMs.length;
    finish(
      {
        averageFPS: meanMs > 0 ? 1000 / meanMs : 0,
        minFPS: maxMs > 0 ? 1000 / maxMs : 0,
        maxFPS: minMs > 0 && minMs !== Infinity ? 1000 / minMs : 0,
        sampleCount: frameMs.length,
        reliable: true,
      },
      startTime,
    );
  });
}
