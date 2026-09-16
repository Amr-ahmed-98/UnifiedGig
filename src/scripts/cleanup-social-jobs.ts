import 'dotenv/config'
import { prisma } from '@/lib/prisma'
import { cleanupExpiredSocialJobs } from '@/services/socialJobService'

async function main() {
    console.log(`[${new Date().toISOString()}] Cleaning up expired social job posts...`)
    const { count } = await cleanupExpiredSocialJobs()
    console.log(`Removed ${count} expired post(s).`)
}

main()
    .catch((err) => {
        console.error('Cleanup failed:', err)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
