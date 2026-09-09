'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'

import ProgressListView from '@/components/progress/ProgressListView'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRoleProtection } from '@/hooks/useRoleProtection'

export default function StudentInternshipsPage() {
    useRoleProtection({ allowedRoles: ['student'] })

    return (
        <ProgressListView
            perspective="student"
            title="My internships"
            subtitle="Track your milestones, log the hours you put in, and keep your mentor in the loop."
            hrefFor={(p) => `/student/internships/${p.id}`}
            emptyTitle="No internships yet"
            emptyBody="Once a company accepts one of your applications, the internship appears here with its milestone plan."
            rightRail={
                <Card className="overflow-hidden">
                    <div className="bg-accent-500 px-4 py-3 text-accent-foreground">
                        <p className="text-xs font-semibold uppercase tracking-wider">Tip</p>
                        <p className="mt-1 text-sm font-semibold">Log time as you go</p>
                    </div>
                    <div className="px-4 py-3">
                        <p className="text-xs text-muted-foreground">
                            Hours logged and regular check-ins are what your mentor and the
                            company see between milestones. A week of silence is what flags an
                            internship as at risk — not slow progress.
                        </p>
                        <Button asChild variant="accent" size="sm" className="mt-3 w-full">
                            <Link href="/tasks">
                                <Sparkles className="h-3.5 w-3.5" /> Browse more tasks
                            </Link>
                        </Button>
                    </div>
                </Card>
            }
        />
    )
}
