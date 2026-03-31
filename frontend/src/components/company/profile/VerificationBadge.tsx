"use client";

import { BadgeCheck, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

interface VerificationBadgeProps {
    isVerified: boolean;
    size?: 'sm' | 'md';
}

export default function VerificationBadge({ isVerified, size = 'md' }: VerificationBadgeProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    if (!isVerified) return null;

    if (size === 'sm') {
        return (
            <div className="relative inline-flex">
                <div
                    className="inline-flex items-center gap-1 bg-[#DCFCE7] text-[#16A34A] text-[11px] font-medium px-2 py-0.5 rounded-full"
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    aria-label="Verified company"
                >
                    <BadgeCheck className="w-3.5 h-3.5" />
                    <span>Verified</span>
                </div>
                {showTooltip && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-[#0F172A] text-white text-xs rounded-md whitespace-nowrap z-50">
                        This company has been verified by NexIntern
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#0F172A]" />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="relative inline-flex">
            <div
                className="inline-flex items-center gap-1.5 bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0] text-xs font-medium px-3 py-1 rounded-full"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                aria-label="Verified company"
            >
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Company</span>
            </div>
            {showTooltip && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-[#0F172A] text-white text-xs rounded-md whitespace-nowrap z-50">
                    This company has been verified by NexIntern
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#0F172A]" />
                </div>
            )}
        </div>
    );
}
