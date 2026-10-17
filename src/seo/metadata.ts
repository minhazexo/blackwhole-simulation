import type { Metadata, Viewport } from "next";

import { SITE_NAME, SITE_URL } from "./site";

export const siteViewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const siteMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Interactive Real-time Kerr Physics Engine`,
    template: `%s | ${SITE_NAME} Lab`,
  },
  description:
    "Explore the universe's most extreme objects with our scientifically accurate, real-time black hole simulation. Experience gravitational lensing, the Kerr metric, and relativistic optics directly in your browser.",
  keywords: [
    "Black Hole Simulation",
    "Interactive Black Hole",
    "Kerr Metric Visualization",
    "General Relativity Simulator",
    "Event Horizon Telescope",
    "Accretion Disk Physics",
    "Gravitational Lensing",
    "Relativistic Doppler Effect",
    "Schwarzschild Radius Calculator",
    "WebGL Physics Engine",
    "WebGPU Ray Tracing",
    "Educational Astronomy Tool",
    "Astrophysics Visualization",
    "Frame Dragging Effect",
    "Lense-Thirring Effect",
    "Spacetime Curvature",
    "Einstein-Rosen Bridge",
    "Supermassive Black Hole",
    "Sagittarius A*",
    "M87*",
    "Interstellar Physics",
  ],
  authors: [{ name: "Minhazexo" }],
  creator: "Minhazexo",
  publisher: "Minhazexo",
  applicationName: "Blackhole Simulation",
  category: "science",
  classification: "Educational Simulation",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: `${SITE_NAME} | Interactive General Relativity`,
    description:
      "Experience a physically accurate Kerr black hole simulation in real-time. Explore the event horizon, photon ring, and accretion disk.",
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Interactive Black Hole Simulation",
    description:
      "Visualize General Relativity in real-time. Experience gravitational lensing and the event horizon directly in your browser.",
    creator: "@minhazexo",
    site: "@minhazexo",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
    // languages: populated only when real translations exist at the cited URLs.
    // Misleading hreflang demotes ranking; strict empty policy until real i18n ships.
  },
  // SEO env vars (set in Vercel project settings, never committed):
  //   YANDEX_VERIFICATION_TOKEN  (Yandex Webmaster Tools)
  //   BING_VERIFICATION_TOKEN    (Bing Webmaster Tools)
  // See .mayank/seo/multi-engine-checklist.md for setup walkthrough.
  verification: {
    google: "vycsFH0oxZh3hYxinQ1JGOghyPymDAt4tkDFdKk-V7M",
    ...(process.env.YANDEX_VERIFICATION_TOKEN && {
      yandex: process.env.YANDEX_VERIFICATION_TOKEN,
    }),
    ...(process.env.BING_VERIFICATION_TOKEN && {
      other: { "msvalidate.01": process.env.BING_VERIFICATION_TOKEN },
    }),
  },
  appleWebApp: {
    capable: true,
    title: "Black Hole Lab",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": SITE_NAME,
    "application-name": SITE_NAME,
    "msapplication-TileColor": "#000000",
    "msapplication-tap-highlight": "no",
  },
  icons: {
    icon: "/brand-logo.png",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.jpg",
  },
};
