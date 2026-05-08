import * as React from 'react'
import { cn } from '@/lib/utils'

interface AppShellProps {
    leftRail?: React.ReactNode
    rightRail?: React.ReactNode
    children: React.ReactNode
    className?: string
    /** Match LinkedIn's content max width */
    maxWidth?: 'default' | 'wide'
}

/**
 * LinkedIn-style 3-column shell.
 * lg+: left rail (224px) | main (flex) | right rail (296px)
 * md:  main + right rail
 * sm:  main only
 */
export default function AppShell({
    leftRail,
    rightRail,
    children,
    className,
    maxWidth = 'default',
}: AppShellProps) {
    const widthClass = maxWidth === 'wide' ? 'max-w-[1280px]' : 'max-w-[1128px]'
    return (
        <div className="surface-canvas min-h-[calc(100vh-3.5rem)]">
            <div className={cn('mx-auto px-4 py-6 lg:px-6', widthClass, className)}>
                <div
                    className={cn(
                        'grid gap-6',
                        leftRail && rightRail
                            ? 'lg:grid-cols-[224px_minmax(0,1fr)_296px] md:grid-cols-[minmax(0,1fr)_296px] grid-cols-1'
                            : leftRail
                            ? 'md:grid-cols-[224px_minmax(0,1fr)] grid-cols-1'
                            : rightRail
                            ? 'md:grid-cols-[minmax(0,1fr)_296px] grid-cols-1'
                            : 'grid-cols-1'
                    )}
                >
                    {leftRail && (
                        <aside className="hidden lg:block space-y-3">
                            <div className="sticky top-[4.5rem] space-y-3">{leftRail}</div>
                        </aside>
                    )}
                    <main className="min-w-0 space-y-3">{children}</main>
                    {rightRail && (
                        <aside className="hidden md:block space-y-3">
                            <div className="sticky top-[4.5rem] space-y-3">{rightRail}</div>
                        </aside>
                    )}
                </div>
            </div>
        </div>
    )
}
