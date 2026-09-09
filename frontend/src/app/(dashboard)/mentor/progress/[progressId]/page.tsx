'use client'

import { useParams } from 'next/navigation'

import ProgressWorkspace from '@/components/progress/ProgressWorkspace'
import { useRoleProtection } from '@/hooks/useRoleProtection'

export default function MentorProgressDetailPage() {
    useRoleProtection({ allowedRoles: ['mentor'] })
    const params = useParams()
    const progressId = String(params.progressId)

    return (
        <ProgressWorkspace
            progressId={progressId}
            perspective="mentor"
            backHref="/mentor/progress"
            backLabel="Mentee progress"
        />
    )
}
