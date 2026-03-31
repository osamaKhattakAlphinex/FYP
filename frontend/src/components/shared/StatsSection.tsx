export default function StatsSection() {
    const stats = [
        { number: '12,000+', label: 'Students Enrolled' },
        { number: '500+', label: 'Companies Onboard' },
        { number: '98%', label: 'Completion Rate' },
        { number: '4.9/5', label: 'Avg Rating from Employers' }
    ]

    return (
        <section className="bg-gradient-to-r from-indigo-600 to-cyan-500 py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
                    {stats.map((stat, index) => (
                        <div key={index} className="relative">
                            {index > 0 && (
                                <div className="hidden lg:block absolute left-0 top-1/2 w-px h-16 bg-white/20 -translate-y-1/2"></div>
                            )}
                            <div className="text-4xl lg:text-5xl font-extrabold text-white mb-2">
                                {stat.number}
                            </div>
                            <div className="text-sm text-white/70">
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}