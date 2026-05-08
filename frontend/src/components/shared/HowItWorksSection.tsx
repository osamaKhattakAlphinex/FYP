import { UserCircle, Cpu, ClipboardList, BadgeCheck } from 'lucide-react'

export default function HowItWorksSection() {
    const steps = [
        {
            icon: UserCircle,
            title: 'Build a verified profile',
            description: 'Add your skills, projects and academic background. AI scores your profile-completion in real time.',
        },
        {
            icon: Cpu,
            title: 'Get matched with real tasks',
            description: 'Our matching engine surfaces micro-internships from companies that need your exact skills.',
        },
        {
            icon: ClipboardList,
            title: 'Apply, deliver, get feedback',
            description: 'Work alongside a mentor on a 1–6 week task. Track your progress and submit deliverables.',
        },
        {
            icon: BadgeCheck,
            title: 'Earn a credential employers trust',
            description: 'Verified certificates link back to live deliverables — proof of work, not just promises.',
        },
    ]

    return (
        <section id="how-it-works" className="bg-background">
            <div className="mx-auto max-w-[1280px] px-4 py-20 lg:px-6 lg:py-28">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
                        How it works
                    </p>
                    <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                        From signup to first credential, in four steps
                    </h2>
                    <p className="mt-3 text-base text-muted-foreground">
                        Most students publish their first deliverable within 14 days of joining.
                    </p>
                </div>

                <ol className="relative mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                    {/* connecting line for lg+ */}
                    <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-6 hidden h-px bg-border lg:block" />
                    {steps.map((s, i) => (
                        <li key={s.title} className="relative">
                            <div className="flex flex-col items-start gap-4">
                                <div className="relative grid h-12 w-12 place-items-center rounded-full border border-border bg-card text-brand-700 shadow-sm">
                                    <s.icon className="h-5 w-5" />
                                    <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-[11px] font-semibold text-white">
                                        {i + 1}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-foreground">
                                        {s.title}
                                    </h3>
                                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                                        {s.description}
                                    </p>
                                </div>
                            </div>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    )
}
