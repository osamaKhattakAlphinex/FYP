export default function StatsSection() {
    const stats = [
        { number: '12,000+', label: 'Students enrolled' },
        { number: '500+', label: 'Companies hiring' },
        { number: '98%', label: 'Task completion rate' },
        { number: '4.9/5', label: 'Avg employer rating' },
    ]

    return (
        <section className="bg-background">
            <div className="mx-auto max-w-[1280px] px-4 py-16 lg:px-6">
                <div className="grid grid-cols-2 divide-y divide-border rounded-lg border border-border bg-card sm:grid-cols-4 sm:divide-x sm:divide-y-0">
                    {stats.map((stat, i) => (
                        <div key={stat.label} className="px-6 py-8 text-center">
                            <div className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                                {stat.number}
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
