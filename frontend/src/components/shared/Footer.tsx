import Link from 'next/link'
import { Linkedin, Twitter, Instagram, Github } from 'lucide-react'

export default function Footer() {
    return (
        <footer className="bg-slate-900 pt-16 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-4 gap-8 mb-12">
                    {/* Brand Column */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <div className="w-4 h-4 border-2 border-white transform rotate-45"></div>
                            </div>
                            <span className="text-xl font-bold text-white">
                                <span className="text-indigo-400">Nex</span>Intern
                            </span>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Bridging the gap between learning and industry through AI-powered micro-internships.
                        </p>
                        <div className="flex space-x-4">
                            <Linkedin className="w-5 h-5 text-slate-500 hover:text-white cursor-pointer transition-colors" />
                            <Twitter className="w-5 h-5 text-slate-500 hover:text-white cursor-pointer transition-colors" />
                            <Instagram className="w-5 h-5 text-slate-500 hover:text-white cursor-pointer transition-colors" />
                            <Github className="w-5 h-5 text-slate-500 hover:text-white cursor-pointer transition-colors" />
                        </div>
                    </div>

                    {/* Platform Column */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Platform</h4>
                        <div className="space-y-2">
                            {['How It Works', 'For Students', 'For Companies', 'Pricing', 'AI Matching'].map((link) => (
                                <Link key={link} href="#" className="block text-slate-400 hover:text-white transition-colors text-sm">
                                    {link}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Company Column */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Company</h4>
                        <div className="space-y-2">
                            {['About Us', 'Blog', 'Careers', 'Press', 'Contact'].map((link) => (
                                <Link key={link} href="#" className="block text-slate-400 hover:text-white transition-colors text-sm">
                                    {link}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Legal Column */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Legal</h4>
                        <div className="space-y-2">
                            {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((link) => (
                                <Link key={link} href="#" className="block text-slate-400 hover:text-white transition-colors text-sm">
                                    {link}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-800 pt-8">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <p className="text-slate-500 text-sm">
                            © 2026 NexIntern. All rights reserved.
                        </p>
                        <p className="text-slate-500 text-sm mt-2 md:mt-0">
                            Made with ❤️ at SZABIST Islamabad
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    )
}