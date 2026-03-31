import { UserCircle, Cpu, Clipboard, BadgeCheck } from 'lucide-react'
import Badge from '../ui/Badge'

export default function HowItWorksSection() {
    const steps = [
        {
            step: '01',
            icon: UserCircle,
            title: 'Create Your Profile',
            description: 'Build a verified profile with your skills, projects, and academic background'
        },
        {
            step: '02',
            icon: Cpu,
            title: 'Get AI-Matched',
            description: 'Our AI engine analyzes your profile and recommends the most relevant tasks for you'
        },
        {
            step: '03',
            icon: Clipboard,
            title: 'Complete Real Tasks',
            description: 'Work on real company tasks with mentor guidance and structured feedback'
        },
        {
            step: '04',
            icon: BadgeCheck,
            title: 'Earn Certificates',
            description: 'Get verified certificates and build a portfolio that employers trust'
        }
    ]

    return (
        <section id="how-it-works" className="bg-white py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <Badge className="mb-4">Simple Process</Badge>
                    <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
                        How NexIntern Works
                    </h2>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        From signup to certificate in 4 simple steps
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
                    {/* Connecting Lines */}
                    <div className="hidden lg:block absolute top-16 left-1/4 right-1/4 h-px bg-slate-200 border-dashed border-t"></div>

                    {steps.map((item, index) => (
                        <div key={index} className="bg-slate-50 rounded-2xl p-8 border border-slate-200 hover:border-indigo-600 hover:-translate-y-1 hover:shadow-lg transition-all group">
                            <div className="text-5xl font-extrabold text-indigo-100 mb-4">
                                {item.step}
                            </div>
                            <item.icon className="w-8 h-8 text-indigo-600 mb-4" />
                            <h3 className="text-lg font-bold text-slate-900 mb-2">
                                {item.title}
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                {item.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}