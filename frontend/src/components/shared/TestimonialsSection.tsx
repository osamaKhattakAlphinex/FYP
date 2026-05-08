import { Star } from 'lucide-react'

export default function TestimonialsSection() {
    const testimonials = [
        {
            quote:
                "I landed my first paid project before graduation. The match algorithm sent me the exact kind of design work I'd been hoping to get into.",
            name: 'Sarah K.',
            role: 'CS Student · FAST Islamabad',
            relationship: 'Worked on a UI/UX audit',
            initials: 'SK',
        },
        {
            quote:
                "We hired three interns through NexIntern in under a week. Two of them are now full-time engineers at Arbisoft.",
            name: 'Ahmed R.',
            role: 'CTO · Arbisoft',
            relationship: 'Hired via NexIntern',
            initials: 'AR',
        },
        {
            quote:
                "The certificate from my React task carried more weight in interviews than any course completion I've ever shown.",
            name: 'Usman T.',
            role: 'Software Engineering · NUST',
            relationship: 'Earned 2 certificates',
            initials: 'UT',
        },
    ]

    return (
        <section id="testimonials" className="surface-canvas border-y border-border">
            <div className="mx-auto max-w-[1280px] px-4 py-20 lg:px-6 lg:py-24">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
                        Recommendations
                    </p>
                    <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                        Real students, real companies
                    </h2>
                </div>

                <div className="mt-12 grid gap-5 md:grid-cols-3">
                    {testimonials.map((t) => (
                        <article
                            key={t.name}
                            className="flex flex-col rounded-lg border border-border bg-card p-6"
                        >
                            <div className="mb-3 flex gap-0.5 text-accent-500">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="h-4 w-4 fill-current" />
                                ))}
                            </div>
                            <p className="flex-1 text-sm leading-relaxed text-foreground">
                                &ldquo;{t.quote}&rdquo;
                            </p>
                            <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                                <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                                    {t.initials}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                                    <p className="truncate text-xs text-muted-foreground">{t.role}</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        <span className="font-medium text-foreground">·</span> {t.relationship}
                                    </p>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}
