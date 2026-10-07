import type { Metadata } from 'next'
import PromptsClient from './prompts-client'

export const metadata: Metadata = {
  title: 'AI Prompt Library — Prompts for Code, Images, Video, Writing & Careers',
  description:
    'Copy-ready AI prompts for programming, image and video generation, writing and your job search. Fill in the [brackets], paste into your AI tool, and share your own.',
  keywords: ['AI prompts', 'ChatGPT prompts', 'Claude prompts', 'Midjourney prompts', 'prompt library', 'CV prompts', 'coding prompts'],
  alternates: { canonical: '/prompts' },
  openGraph: {
    title: 'UnifiedGig — AI Prompt Library',
    description: 'Better prompts, better output. Copy-ready prompts for code, images, video, writing and your job search.',
    url: '/prompts',
  },
}

export default function PromptsPage() {
  return <PromptsClient />
}
