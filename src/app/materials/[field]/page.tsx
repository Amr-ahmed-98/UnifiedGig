import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fieldMap, learningFields } from '@/data/fields'
import FieldClient from './field-client'

interface PageProps {
  params: Promise<{ field: string }>
}

export function generateStaticParams() {
  return learningFields.map((f) => ({ field: f.slug }))
}

export const dynamicParams = false

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { field } = await params
  const f = fieldMap[field]
  if (!f) return { title: 'Field not found', robots: { index: false, follow: true } }
  const title = `${f.name} Learning Materials`
  const path = `/materials/${f.slug}`
  return {
    title,
    description: `${f.blurb} Community-shared courses, videos, docs and books for ${f.name}.`,
    alternates: { canonical: path },
    openGraph: { title: `UnifiedGig — ${title}`, description: f.blurb, url: path },
  }
}

export default async function FieldPage({ params }: PageProps) {
  const { field } = await params
  const f = fieldMap[field]
  if (!f) notFound()
  return <FieldClient field={f} />
}
