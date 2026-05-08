'use client'

import { AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface CompanyProfileCompletionBannerProps {
    score: number
    onComplete: () => void
}

export default function CompanyProfileCompletionBanner({
    score,
    onComplete,
}: CompanyProfileCompletionBannerProps) {
    if (score >= 100) return null

    return (
        <Card className="bg-accent-50 border-accent-100 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-600" />
                    <div>
                        <p className="text-sm font-medium text-foreground">
                            Profile {score}% complete
                        </p>
                        <p className="text-xs text-foreground/70">
                            Complete it to attract top student talent.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 sm:flex-shrink-0">
                    <Progress value={score} className="hidden w-32 sm:block" />
                    <Button onClick={onComplete} variant="accent" size="sm">
                        Complete profile
                    </Button>
                </div>
            </div>
        </Card>
    )
}
