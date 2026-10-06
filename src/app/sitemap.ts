import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import { learningFields } from "@/data/fields";

// Shared listing pages are real, indexable URLs now, so they belong in the
// sitemap. Capped per type to keep the file small and the query cheap.
const MAX_PER_TYPE = 500;

export const revalidate = 3600;

async function listingEntries(): Promise<MetadataRoute.Sitemap> {
    try {
        const [jobs, projects] = await Promise.all([
            prisma.job.findMany({
                select: { id: true, updatedAt: true },
                orderBy: [{ datePosted: "desc" }, { id: "desc" }],
                take: MAX_PER_TYPE,
            }),
            prisma.freelanceProject.findMany({
                select: { id: true, updatedAt: true },
                orderBy: [{ id: "desc" }],
                take: MAX_PER_TYPE,
            }),
        ]);

        return [
            ...jobs.map((job) => ({
                url: `${SITE_URL}/jobs/${job.id}`,
                lastModified: job.updatedAt,
                changeFrequency: "daily" as const,
                priority: 0.7,
            })),
            ...projects.map((project) => ({
                url: `${SITE_URL}/freelance/${project.id}`,
                lastModified: project.updatedAt,
                changeFrequency: "daily" as const,
                priority: 0.7,
            })),
        ];
    } catch {
        // Sitemap generation must never break a build or a crawl just because
        // the database is unreachable — fall back to the static routes.
        return [];
    }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const now = new Date();
    return [
        { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
        { url: `${SITE_URL}/jobs`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
        { url: `${SITE_URL}/freelance`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
        { url: `${SITE_URL}/social-jobs`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
        { url: `${SITE_URL}/materials`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
        { url: `${SITE_URL}/people`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
        ...learningFields.map((f) => ({ url: `${SITE_URL}/materials/${f.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.6 })),
        ...(await listingEntries()),
    ];
}
