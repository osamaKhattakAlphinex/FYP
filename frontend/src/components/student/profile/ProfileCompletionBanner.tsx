"use client";

import { Sparkles, X } from "lucide-react";
import { useState } from "react";
import ProgressBar from "@/components/shared/ProgressBar";

interface ProfileCompletionBannerProps {
    score: number;
    onWhatsMissing: () => void;
}

export default function ProfileCompletionBanner({
    score,
    onWhatsMissing,
}: ProfileCompletionBannerProps) {
    const [isDismissed, setIsDismissed] = useState(false);

    if (isDismissed || score >= 100) return null;

    return (
        <div className="relative bg-gradient-to-r from-[#EEF2FF] to-[#E0E7FF] border border-[#C7D2FE] rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-[#4F46E5] flex-shrink-0" />
                    <div>
                        <h3 className="text-[15px] font-semibold text-[#0F172A]">
                            Complete your profile to get better matches
                        </h3>
                        <p className="text-[13px] text-[#475569] mt-0.5">
                            You're {score}% there! Complete your profile to unlock AI matching and apply for tasks.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <ProgressBar value={score} className="hidden sm:flex" />
                    <button
                        onClick={onWhatsMissing}
                        className="px-4 py-2 bg-white border border-[#C7D2FE] text-[#4F46E5] text-[13px] font-medium rounded-lg hover:bg-[#EEF2FF] transition-colors duration-200 whitespace-nowrap"
                    >
                        What's missing?
                    </button>
                </div>
            </div>
            <button
                onClick={() => setIsDismissed(true)}
                className="absolute top-4 right-4 text-[#94A3B8] hover:text-[#475569] transition-colors duration-200"
                aria-label="Dismiss"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
