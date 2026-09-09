'use client'

import { useParams } from 'next/navigation'

import ProgressWorkspace from '@/components/progress/ProgressWorkspace'
import { useRoleProtection } from '@/hooks/useRoleProtection'

export default function CompanyProgressDetailPage() {
    useRoleProtection({ allowedRoles: ['company'] })
    const params = useParams()
    const progressId = String(params.progressId)

    return (
        <ProgressWorkspace
            progressId={progressId}
            perspective="company"
            backHref="/company/progress"
            backLabel="Internship progress"
        />
    )
}
