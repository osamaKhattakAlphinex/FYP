import { ReactNode } from 'react'

interface BadgeProps {
    children: ReactNode
    variant?: 'primary' | 'success' | 'warning'
    className?: string
}

export default function Badge({ children, variant = 'primary', className = '' }: BadgeProps) {
    const variants = {
        primary: 'bg-indigo-50 text-indigo-600',
        success: 'bg-emerald-100 text-emerald-700',
        warning: 'bg-amber-100 text-amber-700'
    }

    return (
        <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${variants[variant]} ${className}`}>
            {children}
        </span>
    )
}