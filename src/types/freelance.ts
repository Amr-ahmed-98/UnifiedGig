export interface FreelanceProject {
    id: string
    title: string
    budget: string | null
    deadline: string | null
    skills: string[]
    description: string | null
    url: string
    source: string
}

export function deadlineDays(deadline: string | null): number | null {
    if (!deadline) return null
    const ms = new Date(deadline).getTime() - Date.now()
    return Math.ceil(ms / 86_400_000)
}