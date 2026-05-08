'use client'

import { BadgeCheck } from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface VerificationBadgeProps {
    isVerified: boolean
    size?: 'sm' | 'md'
}

export default function VerificationBadge({
    isVerified,
    size = 'md',
}: VerificationBadgeProps) {
    if (!isVerified) return null

    return (
        <TooltipProvider delayDuration={150}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span
                        className={cn(
                            'inline-flex items-center gap-1 rounded-full bg-success/10 font-medium text-success',
                            size === 'sm'
                                ? 'px-2 py-0.5 text-[11px]'
                                : 'px-2.5 py-0.5 text-xs'
                        )}
                    >
                        <BadgeCheck
                            className={cn(size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')}
                        />
                        Verified
                    </span>
                </TooltipTrigger>
                <TooltipContent>Verified by NexIntern</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
