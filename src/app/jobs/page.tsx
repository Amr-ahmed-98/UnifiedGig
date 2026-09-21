import type { Metadata } from "next";
import JobsClient from "./jobs-client";

export const metadata: Metadata = {
  title: "Job Search — Remote, Hybrid & On-site Jobs, Updated Hourly | وظائف شاغرة",
  description:
    "Search live job posts and vacancies from LinkedIn, Indeed, Glassdoor, Wuzzuf and Tanqeeb in one feed — remote, hybrid and on-site roles, full-time and contract, updated every 30 minutes. ابحث عن وظائف شاغرة وفرص عمل في مصر والخليج، وظائف عن بعد ودوام كامل وغيرها، محدثة كل نصف ساعة.",
  keywords: [
    "job search",
    "jobs",
    "job post",
    "job postings",
    "job listings",
    "find a job",
    "search jobs",
    "remote jobs",
    "remote work",
    "work from home jobs",
    "jobs near me",
    "jobs in Egypt",
    "Egypt jobs",
    "vacancies",
    "hiring",
    "hiring now",
    "job opportunities",
    "job board",
    "full time jobs",
    "part time jobs",
    "linkedin jobs",
    "indeed jobs",
    "وظائف",
    "وظائف شاغرة",
    "وظائف خالية",
    "وظائف اليوم",
    "وظائف مصر",
    "وظائف عن بعد",
    "وظائف قريبة مني",
    "بحث عن وظيفة",
    "فرص عمل",
    "فرص عمل مصر",
    "توظيف",
    "إعلانات وظائف",
    "عمل من المنزل",
    "دوام كامل",
    "دوام جزئي",
  ],
  alternates: { canonical: "/jobs", languages: { "en": "/jobs", "ar": "/jobs", "x-default": "/jobs" } },
  openGraph: {
    title: "UnifiedGig — Job Search: Remote, Hybrid & On-site Jobs",
    description:
      "Every job post from LinkedIn, Indeed, Glassdoor, Wuzzuf and Tanqeeb — deduped, tagged, ranked by freshness. كل الوظائف الشاغرة في مكان واحد.",
    url: "/jobs",
  },
};

export default function JobsPage() {
  return <JobsClient />;
}
