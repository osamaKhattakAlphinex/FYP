import { Quote, Star } from 'lucide-react'
import Badge from '../ui/Badge'

export default function TestimonialsSection() {
    const testimonials = [
        {
            quote: "NexIntern helped me land my first real project before graduation. The AI matching was spot on.",
            name: "Sarah K.",
            role: "CS Student, FAST Islamabad",
            initials: "SK"
        },
        {
            quote: "We found 3 talented interns through NexIntern in under a week. The quality blew us away.",
            name: "Ahmed R.",
            role: "CTO at Arbisoft",
            initials: "AR"
        },
        {
            quote: "The certificate I earned here carried more weight than I expected in my job interviews.",
            name: "Usman T.",
            role: "Software Engineering, NUST",
            initials: "UT"
        }
    ]

    return (
        <section id="testimonials" className="bg-white py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <Badge className="mb-4">Success Stories</Badge>
                    <h2 className="text-4xl lg:text-5xl font-bold text-slate-900">
                        Real Students. Real Results.
                    </h2>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <div key={index} className="bg-slate-50 rounded-2xl p-8 border border-slate-200 hover:scale-105 transition-transform">
                            <Quote className="w-8 h-8 text-indigo-100 mb-4" />
                            <p className="text-slate-600 italic leading-relaxed mb-6">
                                "{testimonial.quote}"
                            </p>
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-semibold">
                                    {testimonial.initials}
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-900">{testimonial.name}</div>
                                    <div className="text-sm text-slate-500">{testimonial.role}</div>
                                    <div className="flex space-x-1 mt-1">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}