import type { Metadata } from "next";
import SocialJobsClient from "./social-jobs-client";

export const metadata: Metadata = {
  title: "Social Jobs — LinkedIn Hiring Posts Feed | وظائف من منشورات لينكدإن",
  description:
    "Paste any public LinkedIn hiring post and embed it into a live community job feed — fresh social job posts, auto-removed after 48 hours. شارك منشورات التوظيف من لينكدإن واعرضها في فيد مباشر للوظائف، مع حذف تلقائي بعد ٤٨ ساعة.",
  keywords: [
    "social jobs",
    "linkedin jobs",
    "linkedin hiring posts",
    "job posts",
    "hiring posts",
    "community jobs",
    "linkedin feed",
    "job sharing",
    "share jobs",
    "وظائف لينكدإن",
    "وظائف لينكدان",
    "منشورات توظيف",
    "وظائف شاغرة",
    "فرص عمل",
    "مشاركة وظائف",
  ],
  alternates: { canonical: "/social-jobs", languages: { "en": "/social-jobs", "ar": "/social-jobs", "x-default": "/social-jobs" } },
  openGraph: {
    title: "UnifiedGig — Social Jobs: LinkedIn Hiring Posts",
    description:
      "Community-embedded LinkedIn hiring posts, kept fresh for 48 hours at a time.",
    url: "/social-jobs",
  },
};

export default function SocialJobsPage() {
  return <SocialJobsClient />;
}
