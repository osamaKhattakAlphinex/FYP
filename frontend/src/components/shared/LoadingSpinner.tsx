'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg' | 'xl'
    color?: 'blue' | 'gray' | 'white'
    className?: string
}

const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-7 w-7',
    xl: 'h-10 w-10',
}

const colorClasses = {
    blue: 'text-brand-600',
    gray: 'text-muted-foreground',
    white: 'text-white',
}

export default function LoadingSpinner({
    size = 'md',
    color = 'blue',
    className = '',
}: LoadingSpinnerProps) {
    return (
        <div className={cn('inline-flex items-center justify-center', className)}>
            <Loader2 className={cn('animate-spin', sizeClasses[size], colorClasses[color])} />
        </div>
    )
}
