"use client";

import { LucideIcon, Plus } from "lucide-react";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    ctaLabel?: string;
    onCtaClick?: () => void;
}

export default function EmptyState({
    icon: Icon,
    title,
    description,
    ctaLabel,
    onCtaClick,
}: EmptyStateProps) {
    return (
        <div className="py-10 px-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#F8FAFC] border border-[#E2E8F0]">
                <Icon className="w-6 h-6 text-[#CBD5E1]" />
            </div>
            <h3 className="mt-4 text-[15px] font-semibold text-[#0F172A]">{title}</h3>
            <p className="mt-1.5 text-[13px] text-[#94A3B8] max-w-[280px] mx-auto">
                {description}
            </p>
            {ctaLabel && onCtaClick && (
                <button
                    onClick={onCtaClick}
                    className="mt-4 inline-flex items-center gap-1.5 px-5 py-2 bg-[#EEF2FF] text-[#4F46E5] text-[13px] font-medium rounded-lg hover:bg-[#E0E7FF] transition-colors duration-200"
                >
                    <Plus className="w-4 h-4" />
                    {ctaLabel}
                </button>
            )}
        </div>
    );
}
