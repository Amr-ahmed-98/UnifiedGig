import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'UnifiedGig — Jobs & Freelance Projects, One Feed',
        short_name: 'UnifiedGig',
        description:
            'Job search aggregator merging job posts, freelance projects and gigs from LinkedIn, Indeed, Glassdoor, Wuzzuf, Tanqeeb, Freelancer, Nafezly and Mostaql into one feed.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0A0616',
        theme_color: '#CCFF00',
        categories: ['business', 'productivity'],
        icons: [
            {
                src: '/favicon.ico',
                sizes: 'any',
                type: 'image/x-icon',
            },
        ],
    }
}
