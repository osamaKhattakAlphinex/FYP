'use client'

import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface WelcomeBannerProps {
    userName: string
    profileCompletion: number
}

export default function WelcomeBanner({ userName, profileCompletion }: WelcomeBannerProps) {
    return (
        <Card className="overflow-hidden">
            <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-600">
                        <Sparkles className="h-3.5 w-3.5" />
                        Welcome back
                    </div>
                    <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                        Hi {userName}, ready to pick up where you left off?
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Continue applying to recommended tasks and finish that strong
                        portfolio.
                    </p>
                </div>
                <Button asChild className="flex-shrink-0">
                    <Link href="/tasks">
                        Browse new tasks <ArrowRight className="h-4 w-4" />
                    </Link>
                </Button>
            </div>

            {profileCompletion < 100 && (
                <div className="border-t border-border bg-accent-50/60 px-6 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3 text-sm">
                            <span className="font-medium text-foreground">
                                Profile {profileCompletion}% complete
                            </span>
                            <div className="hidden h-1.5 w-40 overflow-hidden rounded-full bg-accent-100 sm:block">
                                <div
                                    className="h-full bg-accent-500"
                                    style={{ width: `${profileCompletion}%` }}
                                />
                            </div>
                        </div>
                        <Link
                            href="/student/profile"
                            className="text-sm font-semibold text-brand-700 hover:underline"
                        >
                            Complete profile →
                        </Link>
                    </div>
                </div>
            )}
        </Card>
    )
}
