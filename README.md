# ⚡ UnifiedGig

<div align="center">

**Jobs & Freelance Gigs, One Unified Feed.**  
*منصة توظيف وعمل حر تجمع كل الوظائف الشاغرة ومشاريع الفريلانس في مكان واحد*

[![Live Demo](https://img.shields.io/badge/Demo-unified--gig.vercel.app-22E0D6?style=for-the-badge&logo=vercel&logoColor=white)](https://unified-gig.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Neon Postgres](https://img.shields.io/badge/Neon_Postgres-00E599?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Playwright](https://img.shields.io/badge/Playwright-45BA4B?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev/)

</div>

---

## 📖 Overview

**UnifiedGig** is an automated aggregator platform that eliminates the fragmentation of the modern job hunt. Instead of checking a dozen tabs across local portals, global job boards, and freelance marketplaces, UnifiedGig merges salaried employment listings, freelance gigs, and community-shared social opportunities into a single, high-performance, deduplicated feed.

The platform targets both global tech opportunities and regional MENA/Egypt markets, syncing listings every 30 minutes via scheduled automation.

---

## ✨ Key Features

- **🎯 Unified Discovery Engine**: Aggregates salaried full-time roles, contract work, and freelance projects into dedicated, searchable views.
- **⚡ Automated 30-Minute Synchronization**: Background scraping pipelines powered by GitHub Actions keep listings continually refreshed without manual intervention.
- **💬 Social Jobs (Community LinkedIn Embeds)**: Allows users to submit public LinkedIn hiring posts. UnifiedGig parses OpenGraph metadata, extracts descriptions, applies tags, and auto-purges posts after 48 hours to guarantee freshness.
- **🔍 Granular Filtering & Fast Search**:
  - Filter by remote, hybrid, or on-site status.
  - Filter by platform source, project budget, and required tech skills.
  - Sort by posting freshness and relevance.
- **🎨 Neo-Digital Design & Rich Micro-Interactions**:
  - Built with Tailwind CSS v4 and Framer Motion (`motion/react`).
  - Seamless Dark & Light themes with persistent state.
  - Dynamic mesh background, custom cursor, smooth page transitions, and interactive animated counters.
- **🛡️ Resilient Anti-Detection Scraping**: Combines fast Cheerio/Axios extraction for lightweight targets with stealth-configured Playwright & Patchright instances for bot-protected platforms.
- **🧪 Comprehensive Test Suite**: Unit and integration testing with Vitest and full end-to-end (E2E) testing with Playwright.

---

## 🛠️ Technology Stack

### **Frontend & Framework**
- **[Next.js 16 (App Router)](https://nextjs.org/)**: Server and client components, API route handlers, image optimization, dynamic metadata, and OpenGraph generators.
- **[React 19](https://react.dev/)**: Latest concurrent features and component architecture.
- **[TypeScript 5](https://www.typescriptlang.org/)**: Strict static typing across all modules, APIs, scrapers, and database models.
- **[Tailwind CSS v4](https://tailwindcss.com/)**: Modern zero-config utility engine with CSS variable themes.
- **[shadcn/ui](https://ui.shadcn.com/) & [Base UI](https://base-ui.com/)**: Accessible, headless primitive components.
- **[Motion (Framer Motion v13)](https://motion.dev/)**: Fluid layout animations, entrance transitions, and interactive UI elements.
- **[Lucide Icons](https://lucide.dev/)**: Clean, consistent icon set.
- **[next-themes](https://github.com/pacocoursey/next-themes)**: System-aware dark and light mode management.

### **Backend, Database & Storage**
- **[Neon Serverless PostgreSQL](https://neon.tech/)**: Cloud-native, scalable serverless PostgreSQL with WebSocket pooling (`@neondatabase/serverless`).
- **[Prisma ORM 7](https://www.prisma.io/)**: Type-safe query building, migrations, and Prisma Neon adapter (`@prisma/adapter-neon`).
- **Next.js Route Handlers**: RESTful API endpoints for jobs, freelance projects, social jobs, and live platform statistics.

### **Scraping & Data Ingestion**
- **[Cheerio](https://cheerio.js.org/) & [Axios](https://axios-http.com/)**: High-speed HTML parsing for static feeds and REST-accessible endpoints.
- **[Playwright](https://playwright.dev/) & [Patchright](https://github.com/Kaliiiiiiiiii-tools/patchright)**: Headless browser automation with bot-detection mitigation for complex single-page apps.
- **OpenGraph & Metadata Parsers**: Custom LinkedIn URL resolver and post scraper (`src/lib/linkedin-embed.ts`).

### **CI/CD & Automation**
- **GitHub Actions**: 9 independent cron workflows running on scheduled intervals for:
  - Scraping individual platforms (Wuzzuf, Tanqeeb, LinkedIn, Indeed, Glassdoor, Freelancer, Nafezly, Mostaql).
  - Pruning expired social jobs (`cleanup-social-jobs.yml`).

### **Testing & Quality Control**
- **[Vitest 5](https://vitest.dev/)**: Blazing-fast unit and service-level testing.
- **[Testing Library (React & DOM)](https://testing-library.com/)**: Component interaction testing with jsdom.
- **[Playwright Test](https://playwright.dev/)**: End-to-end browser tests for home, jobs, freelance, and navigation flows.
- **[ESLint 9](https://eslint.org/)**: Code linting and style enforcement.

---

## 🌐 Supported Platforms

| Platform | Type | Target Scope / Region | Extraction Method |
| :--- | :--- | :--- | :--- |
| **LinkedIn** | Full-Time / Contract Jobs | Global / Regional | Playwright / Headless Browser |
| **Indeed** | Full-Time / Remote Jobs | Global | Patchright / Anti-Bot Bypass |
| **Glassdoor** | Full-Time / Remote Jobs | Global | Patchright / Proxy-ready |
| **Wuzzuf** | Jobs | Egypt & MENA | Cheerio + Axios |
| **Tanqeeb** | Jobs | Egypt & Gulf / Arab Region | Playwright / Stealth |
| **Freelancer** | Freelance Projects | Global | Cheerio + Axios |
| **Mostaql (مستقل)** | Freelance Projects | Arab Region | Cheerio + Axios |
| **Nafezly (نفذلي)** | Freelance Projects | Arab Region | Cheerio + Axios |
| **Social Jobs** | LinkedIn Posts | Global Community | OpenGraph + Cheerio parser (48h TTL) |

---

## 📁 Project Structure

```
job-freelance-platform/
├── .github/workflows/          # GitHub Actions cron workflows for scrapers & cleanups
├── e2e/                        # Playwright end-to-end tests & fixtures
│   ├── freelance.spec.ts
│   ├── home.spec.ts
│   ├── jobs.spec.ts
│   └── navigation.spec.ts
├── prisma/
│   ├── migrations/             # Database migration history
│   └── schema.prisma           # Prisma schema (Job, FreelanceProject, SocialJobPost)
├── public/                     # Static assets & icons
├── src/
│   ├── app/                    # Next.js App Router (pages & API routes)
│   │   ├── api/                # REST endpoints (/jobs, /freelance, /social-jobs, /stats)
│   │   ├── freelance/          # Freelance gig directory page
│   │   ├── jobs/               # Full-time job directory page
│   │   ├── social-jobs/        # Community LinkedIn post feed
│   │   ├── layout.tsx          # Root layout & providers
│   │   └── page.tsx            # Landing page
│   ├── components/             # Reusable UI components & custom widgets
│   │   ├── ui/                 # Headless shadcn/ui components
│   │   ├── custom-cursor.tsx   # Custom animated cursor
│   │   ├── embed-linkedin-modal.tsx # Modal to parse & submit LinkedIn posts
│   │   ├── freelance-card.tsx  # Project listing card
│   │   ├── job-card.tsx        # Job listing card
│   │   ├── mesh-background.tsx # Neo-gradient canvas background
│   │   └── navbar.tsx          # Responsive navigation bar
│   ├── data/                   # Static configurations & platform registries
│   ├── lib/                    # Shared utilities, Prisma client, and LinkedIn parser
│   ├── scrapers/               # Standalone scrapers for each supported platform
│   ├── scripts/                # Utility scripts (e.g. social jobs 48h cleanup)
│   ├── services/               # Data access layer & business logic
│   └── types/                  # Shared TypeScript interfaces
├── vitest.config.ts            # Vitest unit test configuration
├── playwright.config.ts        # Playwright E2E configuration
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20.x` or higher
- **npm** or **pnpm**
- **PostgreSQL Database**: Neon serverless database recommended (or local Postgres instance)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Amr-ahmed-98/UnifiedGig.git
cd UnifiedGig
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# PostgreSQL connection string (Neon or standard Postgres)
DATABASE_URL="postgresql://user:password@host/neondb?sslmode=require"

# Optional: Proxy settings for scrapers (Indeed, Glassdoor, Tanqeeb)
# PROXY_SERVER="http://proxy-host:port"
# PROXY_USERNAME="username"
# PROXY_PASSWORD="password"
```

### 3. Initialize the Database

Run Prisma migrations and generate the client:

```bash
npx prisma db push
# or
npx prisma migrate dev
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🕷️ Scraping & Maintenance Commands

Scrapers can be executed locally on-demand via `tsx`:

```bash
# Run individual job scrapers
npm run scrape:wuzzuf
npm run scrape:linkedin
npm run scrape:indeed
npm run scrape:glassdoor
npm run scrape:tanqeeb

# Run freelance project scrapers
npm run scrape:freelancer
npm run scrape:mostaql
npm run scrape:nafezly

# Clean up expired social job posts (older than 48 hours)
npm run cleanup:social-jobs
```

> **Note**: In production, these scrapers are triggered automatically via **GitHub Actions** workflows defined in [`.github/workflows/`](.github/workflows/).

---

## 🧪 Testing

### Unit & Integration Tests (Vitest)

```bash
# Run unit tests in watch mode
npm run test

# Run single test pass
npm run test:run
```

### End-to-End Tests (Playwright)

```bash
# Run headless E2E tests
npm run test:e2e

# Run tests with interactive Playwright UI
npm run test:e2e:ui

# View HTML test report
npm run test:e2e:report
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
