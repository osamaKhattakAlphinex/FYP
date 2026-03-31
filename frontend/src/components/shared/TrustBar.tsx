export default function TrustBar() {
    const companies = ['SZABIST', 'NUST', 'FAST', 'Arbisoft', 'Systems Limited', '10Pearls', 'Teradata', 'NetSol']

    return (
        <section className="bg-slate-50 py-8 border-t border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <p className="text-center text-sm text-slate-500 uppercase tracking-wider mb-6">
                    Trusted by students and companies across Pakistan and beyond
                </p>
                <div className="flex justify-center items-center space-x-8 lg:space-x-12 opacity-50 hover:opacity-100 transition-opacity">
                    {companies.map((company) => (
                        <span key={company} className="text-slate-600 font-semibold text-sm lg:text-base hover:text-slate-900 transition-colors">
                            {company}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    )
}