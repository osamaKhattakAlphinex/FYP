'use client'

import { useParams } from 'next/navigation'

import ProgressWorkspace from '@/components/progress/ProgressWorkspace'
import { useRoleProtection } from '@/hooks/useRoleProtection'

export default function StudentInternshipDetailPage() {
    useRoleProtection({ allowedRoles: ['student'] })
    const params = useParams()
    const progressId = String(params.progressId)

    return (
        <ProgressWorkspace
            progressId={progressId}
            perspective="student"
            backHref="/student/internships"
            backLabel="My internships"
        />
    )
}
