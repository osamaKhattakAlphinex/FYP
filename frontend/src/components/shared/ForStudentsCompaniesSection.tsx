import Link from 'next/link'
import { GraduationCap, Briefcase, Check } from 'lucide-react'
import { Button } from '../ui/button'

export default function ForStudentsCompaniesSection() {
    const studentFeatures = [
        'AI-matched tasks based on real skills',
        'Mentor guidance from working professionals',
        'Verified credentials linked to live deliverables',
        'Skill-growth analytics and a portable portfolio',
        'Free forever — no premium tiers, no upsells',
    ]

    const companyFeatures = [
        'Post a 1–6 week scope, hire in days not weeks',
        'See ranked candidates with match scores',
        'Evaluate by deliverable quality, not by CV',
        'Pay only for completed milestones',
        'Built-in NDAs and IP transfer on completion',
    ]

    return (
        <section id="for-students" className="surface-canvas border-y border-border">
            <div className="mx-auto max-w-[1280px] px-4 py-20 lg:px-6 lg:py-24">
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Students */}
                    <div className="rounded-lg border border-border bg-card p-8 sm:p-10">
                        <div className="grid h-11 w-11 place-items-center rounded-md bg-brand-50 text-brand-700">
                            <GraduationCap className="h-5 w-5" />
                        </div>
                        <h3 className="mt-5 text-2xl font-bold tracking-tight text-foreground">
                            For students
                        </h3>
                        <p className="mt-2 text-base text-muted-foreground">
                            Get hands-on industry experience, build proof of work, and graduate with a portfolio
                            employers can verify.
                        </p>
                        <ul className="mt-6 space-y-3" id="for-students">
                            {studentFeatures.map((f) => (
                                <li key={f} className="flex items-start gap-3 text-sm text-foreground">
                                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                                    <span>{f}</span>
                                </li>
                            ))}
                        </ul>
                        <Button asChild className="mt-7 w-full sm:w-auto">
                            <Link href="/register">Join as a student</Link>
                        </Button>
                    </div>

                    {/* Companies */}
                    <div
                        id="for-companies"
                        className="rounded-lg border border-border bg-card p-8 sm:p-10"
                    >
                        <div className="grid h-11 w-11 place-items-center rounded-md bg-accent-100 text-accent-700">
                            <Briefcase className="h-5 w-5" />
                        </div>
                        <h3 className="mt-5 text-2xl font-bold tracking-tight text-foreground">
                            For companies
                        </h3>
                        <p className="mt-2 text-base text-muted-foreground">
                            Try-before-you-hire on real scoped work. Evaluate talent on shipped deliverables —
                            not interview performance.
                        </p>
                        <ul className="mt-6 space-y-3">
                            {companyFeatures.map((f) => (
                                <li key={f} className="flex items-start gap-3 text-sm text-foreground">
                                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                                    <span>{f}</span>
                                </li>
                            ))}
                        </ul>
                        <Button asChild variant="outline" className="mt-7 w-full sm:w-auto">
                            <Link href="/register">Post your first task</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    )
}
