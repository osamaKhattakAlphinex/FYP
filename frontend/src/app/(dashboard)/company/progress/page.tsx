'use client'

import Link from 'next/link'
import { Users } from 'lucide-react'

import ProgressListView from '@/components/progress/ProgressListView'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRoleProtection } from '@/hooks/useRoleProtection'

export default function CompanyProgressPage() {
    useRoleProtection({ allowedRoles: ['company'] })

    return (
        <ProgressListView
            perspective="company"
            title="Internship progress"
            subtitle="Every accepted internship across your tasks. Overdue and at-risk work sorts to the top."
            hrefFor={(p) => `/company/progress/${p.id}`}
            emptyTitle="No internships in progress"
            emptyBody="An internship starts tracking the moment you accept an application. Accept a candidate to see their progress here."
            rightRail={
                <Card className="overflow-hidden">
                    <div className="bg-brand-600 px-4 py-3 text-white">
                        <p className="text-xs font-semibold uppercase tracking-wider">
                            How health works
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                            Delays surface before they bite
                        </p>
                    </div>
                    <div className="space-y-2 px-4 py-3 text-xs text-muted-foreground">
                        <p>
                            <span className="font-semibold text-red-600">Overdue</span> — the
                            target end date or a milestone due date has passed.
                        </p>
                        <p>
                            <span className="font-semibold text-amber-600">At risk</span> — a
                            blocker is open, progress trails the schedule by more than 15 points,
                            or there has been no activity for a week.
                        </p>
                        <p>
                            <span className="font-semibold text-emerald-600">On track</span> —
                            none of the above.
                        </p>
                        <Button asChild variant="secondary" size="sm" className="mt-2 w-full">
                            <Link href="/company/mentors">
                                <Users className="h-3.5 w-3.5" /> Assign a mentor
                            </Link>
                        </Button>
                    </div>
                </Card>
            }
        />
    )
}
