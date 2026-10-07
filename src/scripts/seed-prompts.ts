import 'dotenv/config'
import { prisma } from '@/lib/prisma'
import { STARTER_PROMPTS } from '@/data/starter-prompts'

/** Inserts the starter prompts once; re-running skips ones that already exist. */
async function main() {
    let created = 0
    for (const p of STARTER_PROMPTS) {
        const exists = await prisma.prompt.findFirst({ where: { category: p.category, title: p.title } })
        if (exists) continue
        await prisma.prompt.create({ data: p })
        created++
    }
    console.log(`Seeded ${created} prompt(s), skipped ${STARTER_PROMPTS.length - created}.`)
}

main()
    .catch((err) => {
        console.error('Seed failed:', err)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
