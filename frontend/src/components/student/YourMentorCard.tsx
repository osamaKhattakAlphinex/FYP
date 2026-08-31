'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Compass } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { mentorAssignmentService } from '@/services/mentorAssignmentService'
import type { MentorAssignment } from '@/types/mentor.types'
import { cn, getInitials } from '@/lib/utils'

const apiRoot = () => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    return base.replace(/\/api\/?$/, '')
}
const resolveImage = (url?: string | null) =>
    !url ? undefined : url.startsWith('http') ? url : `${apiRoot()}${url}`

interface YourMentorCardProps {
    applicationId: string
}

/** Renders nothing when there is no live or completed mentorship — the parent
 * page's layout stays unaffected either way. */
export default function YourMentorCard({ applicationId }: YourMentorCardProps) {
    const [assignment, setAssignment] = useState<MentorAssignment | null>(null)
    const [checked, setChecked] = useState(false)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const rows = await mentorAssignmentService.getForApplication(applicationId)
                const relevant = rows.find((a) => a.status === 'active' || a.status === 'completed')
                if (!cancelled) setAssignment(relevant || null)
            } catch {
                // Non-critical widget — fail silently.
            } finally {
                if (!cancelled) setChecked(true)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [applicationId])

    if (!checked || !assignment) return null

    const mentor = assignment.mentor
    const mentorName = [mentor?.firstName, mentor?.lastName].filter(Boolean).join(' ')

    return (
        <Card className="overflow-hidden">
            <div className="bg-brand-600 px-4 py-3 text-white">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                    <Compass className="h-3.5 w-3.5" /> Your mentor
                </p>
            </div>
            <Link
                href={`/student/mentorship/${assignment.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50"
            >
                <Avatar className="h-10 w-10">
                    <AvatarImage src={resolveImage(mentor?.profilePicture)} alt={mentorName} />
                    <AvatarFallback>{getInitials(mentorName || '?')}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                        {mentorName || 'Your mentor'}
                    </p>
                    {mentor?.headline && (
                        <p className="truncate text-xs text-muted-foreground">
                            {mentor.headline}
                        </p>
                    )}
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
        </Card>
    )
}
