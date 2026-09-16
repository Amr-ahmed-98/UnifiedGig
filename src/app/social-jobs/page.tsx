import type { Metadata } from "next";
import SocialJobsClient from "./social-jobs-client";

export const metadata: Metadata = {
  title: "Social Jobs: LinkedIn Post Feed | UnifiedGig",
  description:
    "Paste any public LinkedIn hiring post and embed it into a live feed — auto-removed after 48 hours.",
  alternates: { canonical: "/social-jobs" },
  openGraph: {
    title: "UnifiedGig — Social Jobs",
    description:
      "Community-embedded LinkedIn hiring posts, kept fresh for 48 hours at a time.",
    url: "/social-jobs",
  },
};

export default function SocialJobsPage() {
  return <SocialJobsClient />;
}
