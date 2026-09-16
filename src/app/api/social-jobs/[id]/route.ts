import { NextRequest, NextResponse } from 'next/server'
import { deleteSocialJobPost } from '@/services/socialJobService'

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    try {
        await deleteSocialJobPost(id)
        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('Error deleting social job post:', error)
        return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
    }
}
