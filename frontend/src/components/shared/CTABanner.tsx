import Button from '../ui/Button'

export default function CTABanner() {
    return (
        <section className="bg-slate-900 py-24">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-6">
                    Ready to Start Your Journey?
                </h2>
                <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
                    Join thousands of students and companies building the future of work — one micro-internship at a time.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                    <Button size="lg" className="px-9 py-4 hover:shadow-lg hover:-translate-y-0.5">
                        Get Started for Free
                    </Button>
                    <Button variant="outline" size="lg" className="px-9 py-4">
                        See How It Works
                    </Button>
                </div>

                <p className="text-sm text-slate-500">
                    No credit card required · Free forever for students
                </p>
            </div>
        </section>
    )
}