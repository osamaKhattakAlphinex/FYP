'use client'

import Link from 'next/link'
import { Users } from 'lucide-react'

import ProgressListView from '@/components/progress/ProgressListView'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRoleProtection } from '@/hooks/useRoleProtection'

export default function MentorProgressPage() {
    useRoleProtection({ allowedRoles: ['mentor'] })

    return (
        <ProgressListView
            perspective="mentor"
            title="Mentee progress"
            subtitle="The internships you are guiding. Review submissions, clear blockers, and step in before a deadline slips."
            hrefFor={(p) => `/mentor/progress/${p.id}`}
            emptyTitle="No mentee internships yet"
            emptyBody="Once you accept a mentorship request, that student's internship progress appears here."
            rightRail={
                <Card className="overflow-hidden">
                    <div className="bg-brand-600 px-4 py-3 text-white">
                        <p className="text-xs font-semibold uppercase tracking-wider">Tip</p>
                        <p className="mt-1 text-sm font-semibold">Review quickly</p>
                    </div>
                    <div className="px-4 py-3">
                        <p className="text-xs text-muted-foreground">
                            A milestone sitting in &ldquo;awaiting review&rdquo; blocks the
                            student as surely as a technical blocker does. When you send work
                            back, say specifically what needs to change — repeated rework shows
                            up in the performance report.
                        </p>
                        <Button asChild variant="secondary" size="sm" className="mt-3 w-full">
                            <Link href="/mentor/students">
                                <Users className="h-3.5 w-3.5" /> My mentees
                            </Link>
                        </Button>
                    </div>
                </Card>
            }
        />
    )
}
