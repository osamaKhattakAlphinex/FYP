"use client";

import { AlertCircle } from 'lucide-react';
import ProgressBar from '@/components/shared/ProgressBar';

interface CompanyProfileCompletionBannerProps {
    score: number;
    onComplete: () => void;
}

export default function CompanyProfileCompletionBanner({ score, onComplete }: CompanyProfileCompletionBannerProps) {
    if (score >= 100) return null;

    return (
        <div className="w-full bg-[#FFF7ED] border-b border-[#FED7AA] px-8 py-3">
            <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#F59E0B] flex-shrink-0" />
                    <p className="text-sm text-[#92400E]">
                        Your company profile is {score}% complete. Complete it to attract top student talent.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <ProgressBar progress={score} className="w-40" color="#F59E0B" trackColor="#FED7AA" />
                        <span className="text-sm font-medium text-[#92400E] whitespace-nowrap">{score}%</span>
                    </div>
                    <button
                        onClick={onComplete}
                        className="bg-[#F59E0B] text-white text-[13px] font-medium px-3.5 py-1.5 rounded-lg hover:bg-[#D97706] transition-colors duration-200"
                    >
                        Complete Profile
                    </button>
                </div>
            </div>
        </div>
    );
}
