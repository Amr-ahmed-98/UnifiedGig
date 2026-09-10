import type { Metadata } from "next";
import JobsClient from "./jobs-client";

export const metadata: Metadata = {
  title: "Job Search: Remote & On-site Jobs | وظائف شاغرة",
  description:
    "Search live job listings from LinkedIn, Indeed, Glassdoor, Wuzzuf and Tanqeeb in one feed — remote, hybrid and on-site roles, updated every 30 minutes. ابحث عن وظائف شاغرة في مصر والخليج، وظائف عن بعد ودوام كامل، محدثة كل نصف ساعة.",
  keywords: [
    "job search",
    "find a job",
    "remote jobs",
    "jobs in Egypt",
    "job board",
    "وظائف",
    "وظائف شاغرة",
    "وظائف اليوم",
    "وظائف عن بعد",
    "توظيف",
    "فرص عمل",
  ],
  alternates: { canonical: "/jobs" },
  openGraph: {
    title: "UnifiedGig — Job Search: Remote & On-site Jobs",
    description:
      "Every job listing from LinkedIn, Indeed, Glassdoor, Wuzzuf and Tanqeeb — deduped, tagged, ranked by freshness.",
    url: "/jobs",
  },
};

export default function JobsPage() {
  return <JobsClient />;
}
