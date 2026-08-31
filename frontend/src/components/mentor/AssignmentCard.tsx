'use client'

import Link from 'next/link'
import { Building2, CalendarDays, MessageSquare, Star } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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

const formatDate = (iso?: string | null) => {
    if (!iso) return null
    return new Date(iso).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

interface AssignmentCardProps {
    assignment: MentorAssignment
    /** Whose perspective the card is rendered from. */
    perspective: 'mentor' | 'student' | 'company'
    href?: string
    actions?: React.ReactNode
}

export default function AssignmentCard({
    assignment,
    perspective,
    href,
    actions,
}: AssignmentCardProps) {
    // A mentor looks at their mentee; everyone else looks at the mentor.
    const person =
        perspective === 'mentor'
            ? {
                  name: [assignment.student?.firstName, assignment.student?.lastName]
                      .filter(Boolean)
                      .join(' '),
                  subtitle: assignment.student?.headline,
                  avatar: assignment.student?.profilePicture,
              }
            : {
                  name: [assignment.mentor?.firstName, assignment.mentor?.lastName]
                      .filter(Boolean)
                      .join(' '),
                  subtitle: assignment.mentor?.headline,
                  avatar: assignment.mentor?.profilePicture,
              }

    const started = formatDate(assignment.startedAt || assignment.createdAt)

    const body = (
        <Card className="p-4 transition-shadow hover:shadow-card-hover">
            <div className="flex items-start gap-3">
                <Avatar className="h-11 w-11 shrink-0">
                    <AvatarImage src={resolveImage(person.avatar)} alt={person.name} />
                    <AvatarFallback>{getInitials(person.name || '?')}</AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-foreground">
                            {person.name || 'Unknown'}
                        </h3>
                        <span
                            className={cn(
                                'rounded-full px-2 py-0.5 text-xs font-semibold',
                                mentorAssignmentService.getStatusColor(assignment.status),
                            )}
                        >
                            {mentorAssignmentService.getStatusLabel(assignment.status)}
                        </span>
                        {assignment.matchScore != null && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                                <Star className="h-3 w-3" /> {assignment.matchScore}
                            </span>
                        )}
                    </div>

                    {person.subtitle && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {person.subtitle}
                        </p>
                    )}

                    <p className="mt-1.5 truncate text-sm text-foreground">
                        {assignment.task?.title || 'Untitled task'}
                    </p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {assignment.company?.companyName && (
                            <span className="inline-flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" />
                                {assignment.company.companyName}
                            </span>
                        )}
                        {started && (
                            <span className="inline-flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {assignment.startedAt ? 'Started' : 'Requested'} {started}
                            </span>
                        )}
                        {assignment.lastNoteAt && (
                            <span className="inline-flex items-center gap-1">
                                <MessageSquare className="h-3.5 w-3.5" />
                                Last note {formatDate(assignment.lastNoteAt)}
                            </span>
                        )}
                    </div>

                    {assignment.status === 'declined' && assignment.declineReason && (
                        <p className="mt-2 rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Reason:</span>{' '}
                            {assignment.declineReason}
                        </p>
                    )}

                    {assignment.ratings?.student != null && (
                        <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="h-3.5 w-3.5 fill-accent-500 text-accent-500" />
                            Rated {assignment.ratings.student}/5 by the student
                        </p>
                    )}
                </div>

                {actions && <div className="flex shrink-0 flex-col gap-2">{actions}</div>}
            </div>
        </Card>
    )

    if (!href) return body
    return (
        <Link href={href} className="block">
            {body}
        </Link>
    )
}
