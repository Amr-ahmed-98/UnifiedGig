import type { Metadata } from 'next'
import PeopleClient from './people-client'

export const metadata: Metadata = {
  title: 'People to Follow — Recruiters & Pages That Post Jobs',
  description:
    'A community list of the recruiters, hiring managers and pages that share job openings on LinkedIn, Facebook, X, Instagram and Telegram. Follow them, or add someone good.',
  keywords: ['recruiters to follow', 'who posts jobs', 'LinkedIn recruiters', 'job groups', 'hiring managers', 'job channels'],
  alternates: { canonical: '/people' },
  openGraph: {
    title: 'UnifiedGig — People to Follow',
    description: 'Follow the people who post the jobs. Recruiters, hiring managers and community pages in one list.',
    url: '/people',
  },
}

export default function PeoplePage() {
  return <PeopleClient />
}
