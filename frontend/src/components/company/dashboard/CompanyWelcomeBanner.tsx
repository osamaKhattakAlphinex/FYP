'use client'

import Link from 'next/link'
import { Plus, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface CompanyWelcomeBannerProps {
    companyName: string
    activeTasks: number
}

export default function CompanyWelcomeBanner({
    companyName,
    activeTasks,
}: CompanyWelcomeBannerProps) {
    return (
        <Card className="overflow-hidden">
            <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                        Company workspace
                    </p>
                    <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                        Welcome back, {companyName}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        You have <span className="font-semibold text-foreground">{activeTasks}</span> active task
                        {activeTasks === 1 ? '' : 's'} and a strong pipeline of applicants.
                    </p>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                    <Button asChild>
                        <Link href="/company/post-task">
                            <Plus className="h-4 w-4" />
                            Post task
                        </Link>
                    </Button>
                    <Button asChild variant="secondary">
                        <Link href="/company/tasks">
                            Manage tasks <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </div>
        </Card>
    )
}
