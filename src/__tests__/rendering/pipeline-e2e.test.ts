import { describe, it, expect, vi, beforeEach } from "vitest";
import { BloomManager } from "../../rendering/bloom";
import { getSharedQuadBuffer } from "../../utils/webgl-utils";

// Mock WebGL Context
const createMockGL = () => {
  return {
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    useProgram: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    isBuffer: vi.fn(() => true),
    createTexture: vi.fn(() => ({})),
    bindTexture: vi.fn(),
    texImage2D: vi.fn(),
    texParameteri: vi.fn(),
    createFramebuffer: vi.fn(() => ({})),
    bindFramebuffer: vi.fn(),
    framebufferTexture2D: vi.fn(),
    checkFramebufferStatus: vi.fn(() => 36053), // FRAMEBUFFER_COMPLETE
    viewport: vi.fn(),
    drawArrays: vi.fn(),
    getUniformLocation: vi.fn(() => ({})),
    uniform1i: vi.fn(),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    activeTexture: vi.fn(),
    deleteFramebuffer: vi.fn(),
    deleteTexture: vi.fn(),
    deleteProgram: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    // Constants
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    FLOAT: 5126,
    TEXTURE_2D: 3553,
    RGBA: 6408,
    UNSIGNED_BYTE: 5121,
    LINEAR: 9729,
    CLAMP_TO_EDGE: 33071,
    FRAMEBUFFER: 36160,
    COLOR_ATTACHMENT0: 36064,
    FRAMEBUFFER_COMPLETE: 36053,
    TRIANGLES: 4,
    TEXTURE0: 33984,
    COLOR_BUFFER_BIT: 16384,
  } as unknown as WebGL2RenderingContext;
};

describe("Rendering Pipeline", () => {
  let gl: WebGL2RenderingContext;

  beforeEach(() => {
    gl = createMockGL();
  });

  it("BloomManager initializes correctly", () => {
    const bloom = new BloomManager(gl);
    const success = bloom.initialize(800, 600);
    expect(success).toBe(true);
    expect(gl.createFramebuffer).toHaveBeenCalled();
    expect(gl.createTexture).toHaveBeenCalled();
  });

  // Regression: the half/quarter dimensions and the combine viewport used to
  // be assigned only in resize(), so a plain initialize() left them at zero.
  // The bright pass then rendered into a 1x1 corner and the combine pass was
  // issued with a 0x0 viewport (nothing presented -> black/garbage canvas).
  it("BloomManager derives pass sizes and present viewport at init", () => {
    const bloom = new BloomManager(gl);
    expect(bloom.initialize(800, 600)).toBe(true);
    bloom.updateConfig({ enabled: true });
    bloom.beginScene(true);

    const sceneTexture = bloom.getSceneTexture();
    expect(sceneTexture).not.toBeNull();
    bloom.applyBloomToTexture(sceneTexture as WebGLTexture, 1);

    const viewport = vi.mocked(gl.viewport);
    const calls = viewport.mock.calls.map((c) => c.slice(2));
    expect(calls).toContainEqual([400, 300]); // bright pass (1/2 res)
    expect(calls).toContainEqual([200, 150]); // blur pass (1/4 res)
    expect(calls).toContainEqual([800, 600]); // combine -> backbuffer (full)
    expect(calls).not.toContainEqual([1, 1]);
    expect(calls).not.toContainEqual([0, 0, 0, 0]);
  });

  it("BloomManager renders the scene at its full size after init", () => {
    const bloom = new BloomManager(gl);
    bloom.initialize(800, 600);
    bloom.beginScene(true);
    bloom.drawTextureToScreen(bloom.getSceneTexture() as WebGLTexture, 1);

    expect(vi.mocked(gl.viewport)).toHaveBeenCalledWith(0, 0, 800, 600);
  });

  it("BloomManager keeps correct sizes after a resize", () => {
    const bloom = new BloomManager(gl);
    bloom.initialize(800, 600);
    bloom.resize(1000, 500);
    bloom.beginScene(true);
    bloom.drawTextureToScreen(bloom.getSceneTexture() as WebGLTexture, 1);

    expect(vi.mocked(gl.viewport)).toHaveBeenCalledWith(0, 0, 1000, 500);
  });

  it("BloomManager returns null and logs warning if FBO missing", () => {
    const bloom = new BloomManager(gl);
    bloom.initialize(800, 600);
    // Force FBO to be null (simulating failure)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (bloom as any).sceneFramebuffer = null;

    // Spy on console.warn
    const warnSpy = vi.spyOn(console, "warn");

    const fbo = bloom.beginScene();

    expect(fbo).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Bloom FBO missing"),
    );
  });

  it("BloomManager bypasses Bloom when disabled", () => {
    const bloom = new BloomManager(gl, {
      enabled: false,
      intensity: 1,
      threshold: 0,
      blurPasses: 1,
    });
    bloom.initialize(800, 600);

    const fbo = bloom.beginScene();
    expect(fbo).toBeNull(); // Should return null (screen)
  });

  it("Shared Geometry works", () => {
    const buffer1 = getSharedQuadBuffer(gl);
    const buffer2 = getSharedQuadBuffer(gl);

    expect(gl.createBuffer).toHaveBeenCalledTimes(1); // Should only create once per context
    expect(buffer1).toBe(buffer2); // Should be same instance
  });
});
