import { GraduationCap, Briefcase, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import Button from '../ui/Button'

export default function ForStudentsCompaniesSection() {
    const studentFeatures = [
        'AI-matched micro-internship tasks',
        'Mentor guidance throughout the task',
        'Verified digital certificates',
        'Analytics dashboard for skill growth',
        'Portfolio building with real deliverables'
    ]

    const companyFeatures = [
        'Post short-term micro-internship tasks',
        'AI-recommended top matching candidates',
        'Evaluate performance through real tasks',
        'Save on recruitment time and cost',
        'Analytics on candidate performance'
    ]

    return (
        <section id="for-students" className="bg-slate-50 py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Students Card */}
                    <div className="bg-white rounded-3xl p-12 border border-slate-200">
                        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
                            <GraduationCap className="w-8 h-8 text-indigo-600" />
                        </div>

                        <h3 className="text-3xl font-bold text-slate-900 mb-4">
                            For Students
                        </h3>
                        <p className="text-slate-600 mb-8 text-lg">
                            Launch your career with hands-on experience that actually matters
                        </p>

                        <div className="space-y-4 mb-8">
                            {studentFeatures.map((feature, index) => (
                                <div key={index} className="flex items-center space-x-3">
                                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                    <span className="text-slate-700">{feature}</span>
                                </div>
                            ))}
                        </div>

                        <Link href="/register" className="block">
                            <Button className="w-full py-4">Join as a Student</Button>
                        </Link>
                    </div>

                    {/* Companies Card */}
                    <div className="bg-slate-900 rounded-3xl p-12 text-white">
                        <div className="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center mb-6">
                            <Briefcase className="w-8 h-8 text-cyan-400" />
                        </div>

                        <h3 className="text-3xl font-bold mb-4">
                            For Companies
                        </h3>
                        <p className="text-slate-300 mb-8 text-lg">
                            Find and evaluate top talent through real project work
                        </p>

                        <div className="space-y-4 mb-8">
                            {companyFeatures.map((feature, index) => (
                                <div key={index} className="flex items-center space-x-3">
                                    <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                                    <span className="text-slate-200">{feature}</span>
                                </div>
                            ))}
                        </div>

                        <Link href="/register" className="block">
                            <Button className="w-full py-4">Post Your First Task</Button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}