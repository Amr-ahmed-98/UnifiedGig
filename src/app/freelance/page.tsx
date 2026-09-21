import type { Metadata } from "next";
import FreelanceClient from "./freelance-client";

export const metadata: Metadata = {
  title: "Freelance Projects & Gigs — Remote Freelance Work | مشاريع فريلانس وعمل حر",
  description:
    "Browse fixed-price and hourly freelance projects and gigs from Freelancer, Nafezly and Mostaql in one feed — budgets up front, deadlines flagged, skills matched. تصفح مشاريع فريلانس وأعمال حرة بالساعة أو بسعر ثابت، فرص عمل حر عن بعد، مجمعة من أشهر منصات العمل الحر والفريلانس.",
  keywords: [
    "freelance",
    "freelance projects",
    "freelance jobs",
    "freelance work",
    "freelance gigs",
    "gigs",
    "gig work",
    "freelancer jobs",
    "hire a freelancer",
    "remote freelance work",
    "remote gigs",
    "online work",
    "side hustle",
    "freelance projects online",
    "فريلانس",
    "فري لانس",
    "مشاريع فريلانس",
    "مشاريع عمل حر",
    "عمل حر",
    "أعمال حرة",
    "اعمال حرة",
    "مستقل",
    "فرص عمل حر",
    "شغل حر",
    "عمل عن بعد",
    "مشاريع عن بعد",
  ],
  alternates: { canonical: "/freelance", languages: { "en": "/freelance", "ar": "/freelance", "x-default": "/freelance" } },
  openGraph: {
    title: "UnifiedGig — Freelance Projects & Gigs",
    description:
      "Fixed-price and hourly freelance gigs from Freelancer, Nafezly and Mostaql — budgets up front, deadlines flagged. مشاريع الفريلانس في مكان واحد.",
    url: "/freelance",
  },
};

export default function FreelancePage() {
  return <FreelanceClient />;
}
