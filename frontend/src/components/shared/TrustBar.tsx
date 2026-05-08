export default function TrustBar() {
    const companies = [
        'SZABIST', 'NUST', 'FAST', 'Arbisoft',
        'Systems Limited', '10Pearls', 'Teradata', 'NetSol',
    ]

    return (
        <section className="border-b border-border bg-card">
            <div className="mx-auto max-w-[1280px] px-4 py-10 lg:px-6">
                <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Trusted by students &amp; companies across Pakistan
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
                    {companies.map((c) => (
                        <span
                            key={c}
                            className="text-sm font-semibold tracking-tight text-muted-foreground transition-colors hover:text-foreground"
                        >
                            {c}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    )
}
