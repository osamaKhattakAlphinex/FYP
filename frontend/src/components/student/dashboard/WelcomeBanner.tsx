"use client";

import { Sparkles } from 'lucide-react';
import Link from 'next/link';

interface WelcomeBannerProps {
    userName: string;
    profileCompletion: number;
}

export default function WelcomeBanner({ userName, profileCompletion }: WelcomeBannerProps) {
    return (
        <div className="bg-gradient-to-br from-[#4F46E5] via-[#6366F1] to-[#06B6D4] rounded-2xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>

            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5" />
                    <span className="text-sm font-semibold">Welcome back!</span>
                </div>
                <h1 className="text-3xl font-extrabold mb-2">
                    Hello, {userName}! 👋
                </h1>
                <p className="text-white/90 mb-6 max-w-2xl">
                    Ready to take on new challenges? Check out your recommended tasks and continue building your portfolio.
                </p>

                {profileCompletion < 100 && (
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold">Profile Completion</span>
                            <span className="text-sm font-bold">{profileCompletion}%</span>
                        </div>
                        <div className="w-full bg-white/30 rounded-full h-2 mb-3">
                            <div
                                className="bg-white h-2 rounded-full transition-all duration-300"
                                style={{ width: `${profileCompletion}%` }}
                            ></div>
                        </div>
                        <Link
                            href="/student/profile"
                            className="text-sm font-semibold hover:underline"
                        >
                            Complete your profile →
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
