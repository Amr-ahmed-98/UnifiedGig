import type { Metadata } from 'next'
import MaterialsClient from './materials-client'

export const metadata: Metadata = {
  title: 'Learning Materials — Courses, Docs & Roadmaps by Field',
  description:
    'A community library of the courses, videos, docs and books people actually used to get hired — browse by field and share the links that helped you.',
  keywords: ['learning materials', 'free courses', 'roadmaps', 'career resources', 'learn software engineering', 'CCNA', 'cybersecurity'],
  alternates: { canonical: '/materials' },
  openGraph: {
    title: 'UnifiedGig — Learning Materials',
    description: 'Pick your field and see the courses, videos, docs and books people used to land the role.',
    url: '/materials',
  },
}

export default function MaterialsPage() {
  return <MaterialsClient />
}
