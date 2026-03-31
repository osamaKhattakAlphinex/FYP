import { CheckCircle } from 'lucide-react'
import Link from 'next/link'
import Badge from '../ui/Badge'
import Button from '../ui/Button'

export default function HeroSection() {
    return (
        <section className="pt-16 min-h-screen flex items-center bg-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-50 rounded-full blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="grid lg:grid-cols-5 gap-12 items-center">
                    {/* Left Column - Text */}
                    <div className="lg:col-span-3 space-y-8">
                        {/* Badge */}
                        <Badge>
                            <span className="mr-2">✦</span>
                            AI-Powered Micro-Internships
                        </Badge>

                        {/* Main Heading */}
                        <div className="space-y-2">
                            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-tight">
                                <div className="animate-fade-in-up">Bridge the Gap Between</div>
                                <div className="animate-fade-in-up animation-delay-200">Learning and</div>
                                <div className="animate-fade-in-up animation-delay-400 text-indigo-600 relative">
                                    Industry
                                    <span className="absolute bottom-2 left-0 w-full h-1 bg-indigo-600 transform scale-x-0 animate-underline animation-delay-800"></span>
                                </div>
                            </h1>
                        </div>

                        {/* Subtext */}
                        <p className="text-lg text-slate-600 max-w-lg leading-relaxed animate-fade-in-up animation-delay-600">
                            Connect with top companies, complete real-world tasks, build your portfolio, and earn verified certificates — all in one intelligent platform.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up animation-delay-800">
                            <Link href="/register">
                                <Button size="lg">Start as a Student</Button>
                            </Link>
                            <Link href="/register">
                                <Button variant="secondary" size="lg">Post a Task</Button>
                            </Link>
                        </div>

                        {/* Social Proof */}
                        <div className="flex items-center space-x-4 pt-8 animate-fade-in-up animation-delay-1000">
                            <div className="flex -space-x-2">
                                {['SA', 'MK', 'AR', 'FH', 'ZA'].map((initials, i) => (
                                    <div key={i} className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-semibold border-2 border-white">
                                        {initials}
                                    </div>
                                ))}
                            </div>
                            <p className="text-slate-600 text-sm">
                                Join 12,000+ students already building their careers
                            </p>
                        </div>
                    </div>

                    {/* Right Column - Visual */}
                    <div className="lg:col-span-2 relative">
                        {/* Main Dashboard Card */}
                        <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200 animate-float">
                            <div className="flex items-center justify-between mb-4">
                                <Badge variant="success" className="text-xs">
                                    AI Match Found!
                                </Badge>
                                <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-semibold">
                                    SA
                                </div>
                            </div>

                            <h3 className="font-semibold text-slate-900 mb-3">
                                UI/UX Design Audit — FinTech Startup
                            </h3>

                            <div className="flex flex-wrap gap-2 mb-4">
                                {['Figma', 'UX Research', 'Prototyping'].map((skill) => (
                                    <span key={skill} className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-md text-xs font-medium">
                                        {skill}
                                    </span>
                                ))}
                            </div>

                            <div className="mb-4">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-600">Progress</span>
                                    <span className="text-slate-900 font-medium">70%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div className="bg-indigo-600 h-2 rounded-full w-3/4"></div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-900">Match Score: 94%</span>
                                <Button size="sm">Apply Now</Button>
                            </div>
                        </div>

                        {/* Certificate Card */}
                        <div className="absolute -bottom-4 -left-8 bg-white rounded-xl p-4 shadow-lg border border-slate-200 animate-float animation-delay-500">
                            <div className="flex items-center space-x-2">
                                <span className="text-lg">🎓</span>
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">Certificate Earned</p>
                                    <div className="flex items-center space-x-1">
                                        <CheckCircle size={12} className="text-emerald-500" />
                                        <span className="text-xs text-slate-600">Verified</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notification Card */}
                        <div className="absolute -top-4 -right-4 bg-white rounded-xl p-3 shadow-lg border border-slate-200 animate-float animation-delay-1000">
                            <div className="flex items-center space-x-2">
                                <span className="text-sm">🔔</span>
                                <span className="text-xs font-medium text-slate-900">New Task Match</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}