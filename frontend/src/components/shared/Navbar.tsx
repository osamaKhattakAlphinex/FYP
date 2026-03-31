"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import UserDropdown from './UserDropdown'

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isScrolled, setIsScrolled] = useState(false)
    const { user, loading } = useAuth()

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200'
            : 'bg-white border-b border-slate-200'
            }`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-white transform rotate-45"></div>
                        </div>
                        <span className="text-xl font-bold">
                            <span className="text-indigo-600">Nex</span>
                            <span className="text-slate-900">Intern</span>
                        </span>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        <Link href="#how-it-works" className="text-slate-600 hover:text-indigo-600 transition-colors relative group">
                            How It Works
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-600 transition-all group-hover:w-full"></span>
                        </Link>
                        <Link href="#for-students" className="text-slate-600 hover:text-indigo-600 transition-colors relative group">
                            For Students
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-600 transition-all group-hover:w-full"></span>
                        </Link>
                        <Link href="#for-companies" className="text-slate-600 hover:text-indigo-600 transition-colors relative group">
                            For Companies
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-600 transition-all group-hover:w-full"></span>
                        </Link>
                        <Link href="#testimonials" className="text-slate-600 hover:text-indigo-600 transition-colors relative group">
                            Success Stories
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-600 transition-all group-hover:w-full"></span>
                        </Link>
                    </div>

                    {/* CTA Buttons / User Dropdown */}
                    <div className="hidden md:flex items-center space-x-3">
                        {!loading && (
                            user ? (
                                <UserDropdown />
                            ) : (
                                <>
                                    <Link href="/login" className="px-5 py-2.5 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors">
                                        Log In
                                    </Link>
                                    <Link href="/register" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 hover:scale-105 transition-all shadow-sm">
                                        Get Started Free
                                    </Link>
                                </>
                            )
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <button
                        className="md:hidden"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden bg-white border-t border-slate-200">
                    <div className="px-4 py-4 space-y-4">
                        <Link href="#how-it-works" className="block text-slate-600">How It Works</Link>
                        <Link href="#for-students" className="block text-slate-600">For Students</Link>
                        <Link href="#for-companies" className="block text-slate-600">For Companies</Link>
                        <Link href="#testimonials" className="block text-slate-600">Success Stories</Link>
                        <div className="pt-4 space-y-2">
                            {!loading && (
                                user ? (
                                    <div className="space-y-2">
                                        <div className="px-4 py-3 bg-slate-50 rounded-lg">
                                            <p className="text-sm font-semibold text-slate-900">{user.email}</p>
                                            <p className="text-xs text-slate-500 mt-1">{user.role}</p>
                                        </div>
                                        <UserDropdown />
                                    </div>
                                ) : (
                                    <>
                                        <Link href="/login" className="block w-full px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg text-center">
                                            Log In
                                        </Link>
                                        <Link href="/register" className="block w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-center">
                                            Get Started Free
                                        </Link>
                                    </>
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    )
}