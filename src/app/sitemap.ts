import type { MetadataRoute } from "next";

const SITE_URL = "https://unified-gig.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();
    return [
        { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
        { url: `${SITE_URL}/jobs`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
        { url: `${SITE_URL}/freelance`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
        { url: `${SITE_URL}/social-jobs`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    ];
}
