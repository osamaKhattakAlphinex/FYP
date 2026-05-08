"use client";

import { Zap } from "lucide-react";
import SectionCard from "@/components/shared/SectionCard";
import EmptyState from "@/components/shared/EmptyState";
import { Skill } from "@/types/student.types";

interface SkillsSectionProps {
    skills: Skill[];
    isEditMode?: boolean;
    onEdit?: () => void;
}

const SkillBadge = ({ skill }: { skill: Skill }) => {
    const levelStyles = {
        Expert: "bg-[#0F172A] text-white border-[#0F172A]",
        Advanced: "bg-[#4F46E5] text-white border-[#4F46E5]",
        Intermediate: "bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE]",
        Beginner: "bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]",
    };

    return (
        <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-[13px] font-medium border ${levelStyles[skill.level]
                }`}
        >
            {skill.name}
        </span>
    );
};

export default function SkillsSection({ skills, isEditMode = false, onEdit }: SkillsSectionProps) {
    return (
        <SectionCard title="Skills" icon={Zap} onEdit={isEditMode ? onEdit : undefined} isEmpty={skills.length === 0}>
            {skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                        <SkillBadge key={skill.id} skill={skill} />
                    ))}
                </div>
            ) : (
                isEditMode ? (
                    <EmptyState
                        icon={Zap}
                        title="Add your skills to get AI-matched with relevant tasks"
                        description="Include technical skills, tools, and frameworks you know"
                        ctaLabel="Add Skills"
                        onCtaClick={onEdit}
                    />
                ) : (
                    <div className="text-center py-8">
                        <Zap className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
                        <p className="text-[#64748B] text-sm">No skills information available</p>
                    </div>
                )
            )}
        </SectionCard>
    );
}
