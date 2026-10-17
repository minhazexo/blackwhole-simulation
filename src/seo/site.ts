/**
 * Canonical site identity.
 *
 * Single source of truth for the public URL, site name, and author
 * identity. Import from here instead of hard-coding deploy URLs in
 * metadata, JSON-LD schemas, robots, or sitemap modules.
 */
export const SITE_URL = "https://blackhole-simulation.vercel.app";
export const SITE_NAME = "Black Hole Simulation";
export const SITE_SHORT_NAME = "Black Hole";

export const AUTHOR_NAME = "Minhazexo";
export const AUTHOR_URL = "https://minhazexo.netlify.app";
/** schema.org node identifier for the author Person entity. */
export const AUTHOR_ID = `${AUTHOR_URL}/#person`;

export const REPO_URL = "https://github.com/minhazexo/blackholesimulation";

/**
 * Displayed as `softwareVersion` in the SoftwareApplication JSON-LD graph.
 * Keep in sync with package.json#version.
 */
export const APP_VERSION = "1.0.0";
