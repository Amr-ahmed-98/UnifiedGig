export interface Source {
    id: string
    name: string
    color: string
    kind: 'jobs' | 'freelance'
}

export const sources: Source[] = [
    { id: 'linkedin', name: 'LinkedIn', color: '#22E0D6', kind: 'jobs' },
    { id: 'indeed', name: 'Indeed', color: '#8B5CF6', kind: 'jobs' },
    { id: 'glassdoor', name: 'Glassdoor', color: '#CCFF00', kind: 'jobs' },
    { id: 'wuzzuf', name: 'Wuzzuf', color: '#FF5C38', kind: 'jobs' },
    { id: 'tanqeeb', name: 'Tanqeeb', color: '#0084FF', kind: 'jobs' },
    { id: 'freelancer', name: 'Freelancer', color: '#CCFF00', kind: 'freelance' },
    { id: 'nafezly', name: 'Nafezly', color: '#22E0D6', kind: 'freelance' },
    { id: 'mostaql', name: 'Mostaql', color: '#FF5C38', kind: 'freelance' },
]

export const sourceMap: Record<string, Source> = sources.reduce((acc, s) => {
    acc[s.id] = s
    return acc
}, {} as Record<string, Source>)

export const jobSources = sources.filter((s) => s.kind === 'jobs')
export const freelanceSources = sources.filter((s) => s.kind === 'freelance')