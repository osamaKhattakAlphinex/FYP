import Link from 'next/link'
import { Linkedin, Twitter, Instagram, Github } from 'lucide-react'

export default function Footer() {
    const platform = ['How it works', 'For students', 'For companies', 'Pricing', 'AI matching']
    const company = ['About', 'Blog', 'Careers', 'Press', 'Contact']
    const legal = ['Privacy', 'Terms', 'Cookie policy']

    return (
        <footer className="bg-brand-800 text-brand-100">
            <div className="mx-auto max-w-[1280px] px-4 py-14 lg:px-6">
                <div className="grid gap-10 md:grid-cols-12">
                    <div className="md:col-span-4">
                        <Link href="/" className="text-xl font-bold tracking-tight text-white">
                            <span className="text-brand-300">Nex</span>Intern
                        </Link>
                        <p className="mt-3 max-w-sm text-sm leading-relaxed text-brand-100/80">
                            AI-matched micro-internships connecting students with the work that builds
                            their careers.
                        </p>
                        <div className="mt-5 flex items-center gap-3">
                            {[Linkedin, Twitter, Instagram, Github].map((Icon, i) => (
                                <button
                                    key={i}
                                    aria-label="social link"
                                    className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-brand-100 transition-colors hover:bg-white/10 hover:text-white"
                                >
                                    <Icon className="h-4 w-4" />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <h4 className="text-sm font-semibold text-white">Platform</h4>
                        <ul className="mt-4 space-y-2.5 text-sm">
                            {platform.map((l) => (
                                <li key={l}>
                                    <Link href="#" className="text-brand-100/80 hover:text-white">
                                        {l}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="md:col-span-2">
                        <h4 className="text-sm font-semibold text-white">Company</h4>
                        <ul className="mt-4 space-y-2.5 text-sm">
                            {company.map((l) => (
                                <li key={l}>
                                    <Link href="#" className="text-brand-100/80 hover:text-white">
                                        {l}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="md:col-span-2">
                        <h4 className="text-sm font-semibold text-white">Legal</h4>
                        <ul className="mt-4 space-y-2.5 text-sm">
                            {legal.map((l) => (
                                <li key={l}>
                                    <Link href="#" className="text-brand-100/80 hover:text-white">
                                        {l}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="md:col-span-2">
                        <h4 className="text-sm font-semibold text-white">Stay updated</h4>
                        <p className="mt-4 text-xs text-brand-100/80">
                            New tasks weekly, straight to your inbox.
                        </p>
                        <form className="mt-3 flex">
                            <input
                                type="email"
                                placeholder="Email"
                                className="h-9 w-full rounded-l-md border-0 bg-white/10 px-3 text-sm text-white placeholder:text-brand-100/60 focus:outline-none focus:ring-2 focus:ring-white/40"
                            />
                            <button
                                type="submit"
                                className="rounded-r-md bg-accent-500 px-3 text-sm font-semibold text-accent-foreground hover:bg-accent-600"
                            >
                                Join
                            </button>
                        </form>
                    </div>
                </div>

                <div className="mt-12 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-6 text-xs text-brand-100/60 sm:flex-row">
                    <p>&copy; {new Date().getFullYear()} NexIntern. All rights reserved.</p>
                    <p>Built at SZABIST Islamabad</p>
                </div>
            </div>
        </footer>
    )
}
