'use client'

import { useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'

interface ProfileCompletionBannerProps {
    score: number
    onWhatsMissing: () => void
}

export default function ProfileCompletionBanner({
    score,
    onWhatsMissing,
}: ProfileCompletionBannerProps) {
    const [dismissed, setDismissed] = useState(false)
    if (dismissed || score >= 100) return null

    return (
        <Card className="relative bg-accent-50 border-accent-100 p-5">
            <div className="flex flex-col gap-4 pr-8 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-md bg-accent-500 text-accent-foreground">
                        <Sparkles className="h-4 w-4" />
                    </span>
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">
                            Complete your profile to get better matches
                        </h3>
                        <p className="mt-0.5 text-xs text-foreground/70">
                            You're {score}% there. Finish up to unlock AI matching and apply to tasks.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 sm:flex-shrink-0">
                    <Progress value={score} className="hidden w-32 sm:block" />
                    <Button onClick={onWhatsMissing} variant="secondary" size="sm">
                        What's missing?
                    </Button>
                </div>
            </div>
            <button
                onClick={() => setDismissed(true)}
                className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Dismiss"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </Card>
    )
}
