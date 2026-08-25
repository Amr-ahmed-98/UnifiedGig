export interface Job {
    id: string
    title: string
    company: string
    location: string | null
    datePosted: string | null
    remote: boolean
    hybrid: boolean
    salary: string | null
    description: string | null
    url: string
    source: string
}

export type WorkMode = 'remote' | 'hybrid' | 'onsite'

export function workModeOf(job: Pick<Job, 'remote' | 'hybrid'>): WorkMode {
    if (job.remote) return 'remote'
    if (job.hybrid) return 'hybrid'
    return 'onsite'
}