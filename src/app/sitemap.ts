// src/app/sitemap.ts
import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://blazekeyapp.com' // production origin

  // PUBLIC, EVERGREEN ROUTES ONLY
  return [
    { url: `${base}/`, lastModified: new Date() },
    { url: `${base}/leaderboard`, lastModified: new Date() },
  ]
}
