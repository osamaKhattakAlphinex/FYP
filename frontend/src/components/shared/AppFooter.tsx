import Link from 'next/link'

export default function AppFooter() {
    const year = new Date().getFullYear()
    return (
        <footer className="border-t border-border bg-card">
            <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-3 px-4 py-4 text-xs text-muted-foreground sm:flex-row lg:px-6">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                        <span className="text-brand-700">Nex</span>Intern
                    </span>
                    <span>&copy; {year}</span>
                </div>
                <nav className="flex flex-wrap items-center gap-x-5 gap-y-1">
                    <Link href="/about" className="hover:text-foreground">About</Link>
                    <Link href="/help" className="hover:text-foreground">Help center</Link>
                    <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
                    <Link href="/terms" className="hover:text-foreground">Terms</Link>
                    <Link href="/accessibility" className="hover:text-foreground">Accessibility</Link>
                </nav>
            </div>
        </footer>
    )
}
