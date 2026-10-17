/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance: Enable Gzip compression
  compress: true,
  // Security: Hide Next.js header
  poweredByHeader: false,

  // Next 16 blocks cross-origin dev resources (HMR websocket, dev assets)
  // by default. The codebuff preview serves this dev server through its
  // own hostname, so allow exactly that origin — nothing else.
  allowedDevOrigins: ["pv-7744a3a2f71b-0b39de08-918d-4d59-93df-3f3e4586cf45.style.dev"],
  // Strict Mode for better development practices
  reactStrictMode: true,

  // Production Optimizations
  compiler: {
    // Remove console.log in production for cleaner performance.
    // Preserve console.error and console.warn so critical diagnostics
    // and user-facing error messages are not stripped.
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  // Asset Optimization
  // Tree shake heavy libraries (experimental.* in Next 16 per
  // api-reference/config/next-config-js/optimizePackageImports)
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion"],
  },

  webpack: (config, { isServer }) => {
    // Enable WebAssembly
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Fix for WASM in Next.js
    if (!isServer) {
      config.output.webassemblyModuleFilename = "static/wasm/[modulehash].wasm";
    }

    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
          // COEP=require-corp rejects same-origin sub-resources that don't
          // declare an embedding policy. Static assets in /public (logo,
          // favicon, the static-fallback render) and Next.js's optimized
          // image responses both go through this header rule, so a single
          // CORP=same-origin declaration unblocks every same-origin embed.
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
        ],
      },
      // Smoothness: WASM physics bundle (~MBs) + immutable Next static
      // assets cache for a year. Repeat visits skip re-download, so the
      // loading overlay dismisses faster and first frame arrives sooner.
      {
        // NOTE: no forced Content-Type here — /wasm contains both the
        // .wasm binary and the wasm-pack .js glue. Forcing
        // application/wasm would break the JS import.
        // (No rule for /_next/static/*: Next.js already emits its own
        // immutable Cache-Control there, and overriding it only trips a
        // dev-mode warning with zero production benefit.)
        source: "/wasm/:path*.wasm",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
