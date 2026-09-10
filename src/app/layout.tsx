import type { Metadata } from "next";
import { Space_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"
import { CustomCursor } from "@/components/custom-cursor"
import { PageTransition } from "@/components/page-transition"
import { NavBar } from "@/components/navbar"
import { Analytics } from "@vercel/analytics/next";

const display = Space_Grotesk({ variable: "--font-display", subsets: ["latin"], weight: ["400","500","600","700"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

const SITE_URL = "https://unified-gig.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "UnifiedGig — Jobs & Freelance Gigs, One Feed | وظائف ومشاريع فريلانس",
    template: "%s | UnifiedGig",
  },
  description:
    "UnifiedGig merges job listings and freelance gigs from LinkedIn, Indeed, Glassdoor, Wuzzuf, Tanqeeb, Freelancer, Nafezly and Mostaql into one feed. منصة توظيف وعمل حر تجمع كل الوظائف الشاغرة ومشاريع الفريلانس في مصر والوطن العربي في مكان واحد.",
  keywords: [
    "UnifiedGig",
    "unified gig",
    "job search",
    "freelance projects",
    "jobs in Egypt",
    "remote jobs",
    "job aggregator",
    "وظائف",
    "وظائف شاغرة",
    "فريلانس",
    "عمل حر",
    "مشاريع فريلانس",
    "توظيف",
    "فرص عمل مصر",
  ],
  authors: [{ name: "UnifiedGig" }],
  alternates: {
    canonical: "/",
    languages: { "en": "/", "ar": "/" },
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "UnifiedGig",
    title: "UnifiedGig — Jobs & Freelance Gigs, One Feed",
    description: "Every job listing and freelance gig, aggregated into one feed. Updated every 30 minutes.",
    locale: "en_US",
    alternateLocale: ["ar_EG"],
  },
  twitter: {
    card: "summary_large_image",
    title: "UnifiedGig — Jobs & Freelance Gigs, One Feed",
    description: "Every job listing and freelance gig, aggregated into one feed.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  // Add your real Google Search Console verification code here after you claim the property.
  // verification: { google: "YOUR_VERIFICATION_CODE" },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${mono.variable} h-full antialiased`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "UnifiedGig",
              alternateName: "وظائف ومشاريع فريلانس - يونيفايد جيج",
              url: SITE_URL,
              description:
                "Every job listing and freelance gig, aggregated into one feed. منصة تجمع الوظائف ومشاريع الفريلانس في مكان واحد.",
              potentialAction: {
                "@type": "SearchAction",
                target: `${SITE_URL}/jobs?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
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