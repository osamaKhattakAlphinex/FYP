import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '../ui/button'

export default function CTABanner() {
    return (
        <section className="bg-brand-700">
            <div className="mx-auto flex max-w-[1280px] flex-col items-start gap-6 px-4 py-16 lg:flex-row lg:items-center lg:justify-between lg:px-6 lg:py-20">
                <div>
                    <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
                        Ready to build proof of work?
                    </h2>
                    <p className="mt-2 max-w-xl text-base text-brand-100">
                        Free for students, forever. Join thousands building credentials that employers verify.
                    </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <Button asChild variant="accent" size="lg">
                        <Link href="/register">
                            Get started free
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                    <Button
                        asChild
                        variant="ghost"
                        size="lg"
                        className="text-white hover:bg-white/10"
                    >
                        <Link href="/#how-it-works">See how it works</Link>
                    </Button>
                </div>
            </div>
        </section>
    )
}
