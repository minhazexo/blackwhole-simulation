import type { MetadataRoute } from "next";

import { SITE_URL } from "@/seo/site";

const BASE_URL = SITE_URL;

export default function sitemap(): MetadataRoute.Sitemap {
  // SOURCE: Vercel deploy timestamp; future enhancement reads git commit date for per-anchor accuracy.
  const lastModified = new Date();

  return [
    {
      url: BASE_URL,
      lastModified,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/#physics-guide`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/#features`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/#cinematic`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/#references`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
