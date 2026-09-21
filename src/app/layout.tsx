import type { Metadata } from "next";
import { Space_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"
import { CustomCursor } from "@/components/custom-cursor"
import { PageTransition } from "@/components/page-transition"
import { NavBar } from "@/components/navbar"
import { Analytics } from "@vercel/analytics/next";
import { SITE_URL } from "@/lib/site";

const display = Space_Grotesk({ variable: "--font-display", subsets: ["latin"], weight: ["400","500","600","700"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

const SITE_NAME = "UnifiedGig";
const SITE_TAGLINE = "Jobs & Freelance Projects, One Feed";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `UnifiedGig — ${SITE_TAGLINE} | Job Search Aggregator | وظائف ومشاريع فريلانس`,
    template: "%s | UnifiedGig — Jobs & Freelance Projects",
  },
  description:
    "UnifiedGig (unified gig / unifiedgig) is the job search aggregator that merges every job post, freelance project and gig from LinkedIn, Indeed, Glassdoor, Wuzzuf, Tanqeeb, Freelancer, Nafezly and Mostaql into one searchable feed — remote jobs, hybrid and on-site roles, updated every 30 minutes. ابحث عن وظائف شاغرة وفرص عمل ومشاريع فريلانس وعمل حر في مصر والوطن العربي وعن بعد، مجمعة من أشهر مواقع التوظيف في مكان واحد.",
  keywords: [
    // Brand + how people actually type it
    "UnifiedGig",
    "Unified Gig",
    "unified gig",
    "unifiedgig",
    "unified-gig",
    "unified gig jobs",
    "unified gig freelance",
    "يونيفايد جيج",
    // Core English search intent
    "jobs",
    "job search",
    "job post",
    "job postings",
    "job listings",
    "job board",
    "job aggregator",
    "find a job",
    "search jobs",
    "jobs near me",
    "hiring",
    "hiring now",
    "vacancies",
    "careers",
    "job opportunities",
    "remote jobs",
    "remote work",
    "work from home jobs",
    "full time jobs",
    "part time jobs",
    "jobs in Egypt",
    "Egypt jobs",
    "linkedin jobs",
    "indeed jobs",
    "employment",
    // Freelance intent
    "freelance",
    "freelance jobs",
    "freelance projects",
    "freelance work",
    "freelance gigs",
    "freelancer jobs",
    "gigs",
    "gig work",
    "side hustle",
    "online work",
    // Core Arabic search intent
    "وظائف",
    "وظائف شاغرة",
    "وظائف خالية",
    "وظائف اليوم",
    "وظائف مصر",
    "وظائف عن بعد",
    "وظائف قريبة مني",
    "بحث عن وظيفة",
    "البحث عن عمل",
    "فرص عمل",
    "فرص عمل مصر",
    "فرص عمل عن بعد",
    "توظيف",
    "إعلانات وظائف",
    "التقديم على الوظائف",
    "عمل حر",
    "فريلانس",
    "فري لانس",
    "مشاريع فريلانس",
    "مشاريع عمل حر",
    "أعمال حرة",
    "اعمال حرة",
    "مستقل",
    "عمل من المنزل",
    "دوام كامل",
    "دوام جزئي",
    "وظائف لينكدإن",
  ],
  authors: [{ name: "UnifiedGig" }],
  creator: "UnifiedGig",
  publisher: "UnifiedGig",
  applicationName: "UnifiedGig",
  category: "Jobs & Careers",
  alternates: {
    canonical: "/",
    languages: { "en": "/", "ar": "/", "x-default": "/" },
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "UnifiedGig",
    title: `UnifiedGig — ${SITE_TAGLINE} | وظائف ومشاريع فريلانس`,
    description:
      "Every job listing and freelance project, aggregated into one feed — remote, hybrid & on-site, updated every 30 minutes. كل الوظائف ومشاريع الفريلانس في مكان واحد.",
    locale: "en_US",
    alternateLocale: ["ar_EG"],
  },
  twitter: {
    card: "summary_large_image",
    title: `UnifiedGig — ${SITE_TAGLINE}`,
    description: "Every job listing and freelance project, aggregated into one feed. Updated every 30 minutes.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${mono.variable} h-full antialiased`}>
      <head>
        <meta name="google-site-verification" content="xiDI7BBGZ3IxVMHVxA2gwvyWOYfFKbiszva65owsB1k" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": `${SITE_URL}/#website`,
                  name: SITE_NAME,
                  // Every way a person might type or transliterate the brand —
                  // feeds Google's entity matching for "unified gig" style queries.
                  alternateName: [
                    "Unified Gig",
                    "unifiedgig",
                    "unified-gig",
                    "UnifiedGig jobs",
                    "يونيفايد جيج",
                    "منصة وظائف وفريلانس",
                  ],
                  url: SITE_URL,
                  description:
                    "Job search aggregator merging job posts, freelance projects and gigs from LinkedIn, Indeed, Glassdoor, Wuzzuf, Tanqeeb, Freelancer, Nafezly and Mostaql into one feed. منصة تجمع الوظائف الشاغرة ومشاريع الفريلانس في مكان واحد.",
                  inLanguage: ["en", "ar"],
                  isAccessibleForFree: true,
                  potentialAction: {
                    "@type": "SearchAction",
                    target: {
                      "@type": "EntryPoint",
                      urlTemplate: `${SITE_URL}/jobs?q={search_term_string}`,
                    },
                    "query-input": "required name=search_term_string",
                  },
                },
                {
                  "@type": "Organization",
                  "@id": `${SITE_URL}/#organization`,
                  name: SITE_NAME,
                  url: SITE_URL,
                  logo: `${SITE_URL}/favicon.ico`,
                  description:
                    "UnifiedGig aggregates jobs and freelance projects into one continuously updated feed for job seekers in Egypt, the MENA region and worldwide.",
                  areaServed: ["Worldwide", "EG", "MENA"],
                  knowsLanguage: ["en", "ar"],
                  sameAs: [],
                },
              ],
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-canvas text-fg font-sans">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <CustomCursor />
          <NavBar />
          <PageTransition>{children}</PageTransition>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
