'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'

interface AuthLayoutProps {
    children: ReactNode
    title: string
    subtitle: string
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
    return (
        <div className="min-h-screen bg-background">
            <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
                {/* Brand panel */}
                <aside className="relative hidden flex-col justify-between overflow-hidden bg-brand-700 px-12 py-10 text-white lg:flex">
                    <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-white/[0.04]" />
                    <div className="absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-accent-500/10" />

                    <Link href="/" className="relative z-10 inline-flex items-center text-2xl font-bold tracking-tight">
                        <span className="text-brand-300">Nex</span>Intern
                    </Link>

                    <div className="relative z-10 max-w-md space-y-6">
                        <h1 className="text-balance text-4xl font-bold leading-[1.15] tracking-tight">
                            Build proof of work that gets you hired.
                        </h1>
                        <p className="text-base leading-relaxed text-brand-100">
                            Join the platform connecting students with paid micro-internships from real companies.
                        </p>
                        <ul className="space-y-3">
                            {[
                                'AI-matched tasks for your skills',
                                'Verified credentials linked to deliverables',
                                'Free for students, forever',
                            ].map((f) => (
                                <li key={f} className="flex items-start gap-3 text-sm text-brand-100">
                                    <span className="mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-accent-500 text-accent-foreground">
                                        <Check className="h-3 w-3" strokeWidth={3} />
                                    </span>
                                    <span>{f}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="relative z-10 grid grid-cols-3 gap-3 max-w-md">
                        {[
                            { v: '12K+', l: 'Students' },
                            { v: '500+', l: 'Companies' },
                            { v: '5K+', l: 'Tasks shipped' },
                        ].map((s) => (
                            <div key={s.l} className="rounded-md bg-white/5 px-3 py-2.5">
                                <div className="text-lg font-bold text-white">{s.v}</div>
                                <div className="text-xs text-brand-100/80">{s.l}</div>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Form panel */}
                <main className="flex items-center justify-center px-4 py-10 sm:px-8">
                    <div className="w-full max-w-md">
                        <Link
                            href="/"
                            className="mb-8 inline-flex items-center text-xl font-bold tracking-tight text-foreground lg:hidden"
                        >
                            <span className="text-brand-700">Nex</span>Intern
                        </Link>

                        <div className="mb-7">
                            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                                {title}
                            </h2>
                            {subtitle && (
                                <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
                            )}
                        </div>

                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
