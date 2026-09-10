import type { Metadata } from "next";
import FreelanceClient from "./freelance-client";

export const metadata: Metadata = {
  title: "Freelance Projects & Gigs | مشاريع فريلانس",
  description:
    "Browse fixed-price and hourly freelance projects from Freelancer, Nafezly and Mostaql in one feed — budgets up front, deadlines flagged. تصفح مشاريع فريلانس وأعمال حرة بالساعة أو بسعر ثابت، مجمعة من أشهر منصات العمل الحر.",
  keywords: [
    "freelance projects",
    "freelance jobs",
    "hire a freelancer",
    "remote freelance work",
    "فريلانس",
    "مشاريع فريلانس",
    "عمل حر",
    "اعمال حرة",
    "مستقل",
    "فري لانس",
  ],
  alternates: { canonical: "/freelance" },
  openGraph: {
    title: "UnifiedGig — Freelance Projects & Gigs",
    description:
      "Fixed-price and hourly freelance gigs from Freelancer, Nafezly and Mostaql — budgets up front, deadlines flagged.",
    url: "/freelance",
  },
};

export default function FreelancePage() {
  return <FreelanceClient />;
}
