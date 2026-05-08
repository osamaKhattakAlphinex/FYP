import Link from 'next/link'
import { Sparkles, ShieldCheck, ArrowRight, Bookmark, Building2, MapPin } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'

export default function HeroSection() {
    return (
        <section className="surface-canvas border-b border-border">
            <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-12 px-4 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-6 lg:py-24">
                {/* Left — copy */}
                <div className="space-y-6">
                    <Badge variant="soft" className="px-3 py-1 text-xs">
                        <Sparkles className="h-3.5 w-3.5" />
                        AI-matched micro-internships
                    </Badge>

                    <h1 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem]">
                        Find work that <span className="text-brand-700">moves your career</span> forward.
                    </h1>

                    <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                        NexIntern connects students with short, paid micro-internships from real companies.
                        Build a portfolio, earn verified credentials, and get hired — without the year-long commitment.
                    </p>

                    <div className="flex flex-wrap gap-3 pt-2">
                        <Button asChild size="lg">
                            <Link href="/register">
                                Join as a student
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="lg">
                            <Link href="/register">Post a task</Link>
                        </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-success" />
                            Free for students, forever
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-1.5">
                                {['SA', 'MK', 'AR', 'FH'].map((i) => (
                                    <span
                                        key={i}
                                        className="grid h-6 w-6 place-items-center rounded-full border-2 border-canvas bg-brand-100 text-[10px] font-semibold text-brand-700"
                                    >
                                        {i}
                                    </span>
                                ))}
                            </div>
                            12,000+ students enrolled
                        </div>
                    </div>
                </div>

                {/* Right — task card preview */}
                <div className="relative">
                    <div className="rounded-lg border border-border bg-card p-5 shadow-pop">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="grid h-10 w-10 place-items-center rounded-md bg-brand-50 font-bold text-brand-700">
                                    F
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-foreground">
                                        UI/UX Audit · Mobile Banking
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        FinTech Co · Remote · Posted 2h ago
                                    </p>
                                </div>
                            </div>
                            <button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
                                <Bookmark className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="mb-4 flex flex-wrap gap-1.5">
                            {['Figma', 'UX Research', 'Prototyping'].map((s) => (
                                <Badge key={s} variant="muted" className="font-normal">
                                    {s}
                                </Badge>
                            ))}
                        </div>

                        <div className="mb-4 flex items-center justify-between rounded-md border border-success/20 bg-success/5 px-3 py-2 text-sm">
                            <div className="flex items-center gap-2 text-success">
                                <Sparkles className="h-4 w-4" />
                                <span className="font-medium">94% match for your skills</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">$450 · 2 weeks</span>
                            <Button size="sm">Apply</Button>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-border bg-card p-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                                <span className="grid h-5 w-5 place-items-center rounded-full bg-success/15 text-success">
                                    ✓
                                </span>
                                Certificate verified
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">React Development</p>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                                <Building2 className="h-3.5 w-3.5 text-brand-600" />
                                3 new matches
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">Based on your profile</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
