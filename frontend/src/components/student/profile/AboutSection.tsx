"use client";

import { User } from "lucide-react";
import { useState } from "react";
import SectionCard from "@/components/shared/SectionCard";
import EmptyState from "@/components/shared/EmptyState";

interface AboutSectionProps {
    about: string;
    onEdit: () => void;
}

export default function AboutSection({ about, onEdit }: AboutSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const maxLines = 4;
    const lines = about.split("\n");
    const shouldTruncate = lines.length > maxLines;
    const displayText = isExpanded || !shouldTruncate
        ? about
        : lines.slice(0, maxLines).join("\n");

    return (
        <SectionCard title="About" icon={User} onEdit={onEdit} isEmpty={!about}>
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
                <EmptyState
                    icon={User}
                    title="Tell companies and mentors about yourself"
                    description="Share your background, interests, and career goals"
                    ctaLabel="Add Bio"
                    onCtaClick={onEdit}
                />
            )}
        </SectionCard>
    );
}
