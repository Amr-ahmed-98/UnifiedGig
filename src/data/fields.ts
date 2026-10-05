export interface LearningField {
    slug: string
    name: string
    blurb: string
    topics: string[]
    /** lucide-react icon name, resolved in the client via fieldIcons */
    icon: 'code' | 'network' | 'shield' | 'brain' | 'pen' | 'cloud' | 'smartphone' | 'compass' | 'megaphone'
}

export const learningFields: LearningField[] = [
    { slug: 'software-engineering', name: 'Software Engineering', icon: 'code', blurb: 'Fundamentals, system design, clean code and the roadmaps that get you hired.', topics: ['DSA', 'System design', 'Backend'] },
    { slug: 'networking', name: 'Networking', icon: 'network', blurb: 'From subnetting to CCNA — everything for network and infrastructure roles.', topics: ['CCNA', 'Routing', 'Subnetting'] },
    { slug: 'cybersecurity', name: 'Cybersecurity', icon: 'shield', blurb: 'Hands-on labs, SOC skills and the security basics every engineer needs.', topics: ['SOC', 'Web security', 'CTFs'] },
    { slug: 'data-science-ai', name: 'Data Science & AI', icon: 'brain', blurb: 'Analytics, machine learning and deep learning, from first notebook to models.', topics: ['Python', 'ML', 'SQL'] },
    { slug: 'ui-ux-design', name: 'UI / UX Design', icon: 'pen', blurb: 'Design principles, research methods and portfolio-ready practice.', topics: ['Figma', 'UX research', 'UI'] },
    { slug: 'devops-cloud', name: 'DevOps & Cloud', icon: 'cloud', blurb: 'CI/CD, containers, Kubernetes and cloud certifications.', topics: ['AWS', 'Docker', 'Kubernetes'] },
    { slug: 'mobile-development', name: 'Mobile Development', icon: 'smartphone', blurb: 'Flutter, native Android and iOS — build and ship real apps.', topics: ['Flutter', 'Kotlin', 'Swift'] },
    { slug: 'product-management', name: 'Product Management', icon: 'compass', blurb: 'Discovery, prioritisation and the frameworks PMs use daily.', topics: ['Discovery', 'Roadmaps', 'Metrics'] },
    { slug: 'digital-marketing', name: 'Digital Marketing', icon: 'megaphone', blurb: 'SEO, paid ads, content and analytics for growth roles.', topics: ['SEO', 'Ads', 'Content'] },
]

export const fieldMap: Record<string, LearningField> = Object.fromEntries(
    learningFields.map((f) => [f.slug, f])
)
