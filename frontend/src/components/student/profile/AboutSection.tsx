"use client";

import { User } from "lucide-react";
import { useState } from "react";
import SectionCard from "@/components/shared/SectionCard";
import EmptyState from "@/components/shared/EmptyState";

interface AboutSectionProps {
    about: string;
    isEditMode?: boolean;
    onEdit?: () => void;
}

export default function AboutSection({ about, isEditMode = false, onEdit }: AboutSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const maxLines = 4;
    const lines = about.split("\n");
    const shouldTruncate = lines.length > maxLines;
    const displayText = isExpanded || !shouldTruncate
        ? about
        : lines.slice(0, maxLines).join("\n");

    return (
        <SectionCard title="About" icon={User} onEdit={isEditMode ? onEdit : undefined} isEmpty={!about}>
            {about ? (
                <div>
                    <p className="text-[15px] text-[#475569] leading-relaxed whitespace-pre-wrap">
                        {displayText}
                    </p>
                    {shouldTruncate && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="mt-2 text-[13px] font-medium text-[#4F46E5] hover:underline"
                        >
                            {isExpanded ? "Show less" : "Show more"}
                        </button>
                    )}
                </div>
            ) : (
                isEditMode ? (
                    <EmptyState
                        icon={User}
                        title="Tell companies and mentors about yourself"
                        description="Share your background, interests, and career goals"
                        ctaLabel="Add Bio"
                        onCtaClick={onEdit}
                    />
                ) : (
                    <div className="text-center py-8">
                        <User className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
                        <p className="text-[#64748B] text-sm">No bio available</p>
                    </div>
                )
            )}
        </SectionCard>
    );
}
