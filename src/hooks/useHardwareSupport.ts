import { useState, useEffect } from "react";
import { isInAppBrowser, isSoftwareWebGL } from "@/utils/device-detection";

export interface HardwareSupport {
  webgl: boolean;
  webgpu: boolean;
  isInApp: boolean;
  isReady: boolean;
  error?: string;
  /** True if WebGL is running in software/CPU mode (extremely slow) */
  isSoftwareWebGL?: boolean;
  /** WebGL renderer string for diagnostics */
  webglRenderer?: string;
}

export function useHardwareSupport() {
  const [support, setSupport] = useState<HardwareSupport>({
    webgl: false,
    webgpu: false,
    isInApp: false,
    isReady: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    const checkSupport = async () => {
      // 1. Detect In-App browsers (Instagram, FB, LinkedIn, etc.)
      const isInApp = isInAppBrowser();

      // 2. Check WebGL 2 (Required for 3D textures and float buffers)
      let webgl = false;
      let isSoftware = false;
      let renderer = "";
      try {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl2");
        webgl = !!gl;
        if (gl) {
          isSoftware = isSoftwareWebGL(gl);
          // Get renderer string
          try {
            const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
            if (debugInfo) {
              renderer = String(
                gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
              );
            }
          } catch {
            // Ignore
          }
        }
      } catch (e) {
        webgl = false;
      }

      // 3. Check WebGPU
      let webgpu = false;
      if (navigator.gpu) {
        try {
          const adapter = await navigator.gpu.requestAdapter();
          webgpu = !!adapter;
        } catch (e) {
          webgpu = false;
        }
      }

      if (cancelled) return;
      setSupport({
        webgl,
        webgpu,
        isInApp,
        isReady: true,
        isSoftwareWebGL: isSoftware,
        webglRenderer: renderer,
      });
    };

    checkSupport();
    return () => {
      cancelled = true;
    };
  }, []);

  return support;
}
