"use client";

import { Briefcase, Calendar, MoreVertical } from "lucide-react";
import { useState } from "react";
import SectionCard from "@/components/shared/SectionCard";
import EmptyState from "@/components/shared/EmptyState";
import { Experience } from "@/types/student.types";

interface ExperienceSectionProps {
    experience: Experience[];
    onEdit: (exp: Experience) => void;
    onDelete: (id: string) => void;
    onAdd: () => void;
}

export default function ExperienceSection({
    experience,
    onEdit,
    onDelete,
    onAdd,
}: ExperienceSectionProps) {
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const employmentTypeStyles = {
        Internship: "bg-[#EEF2FF] text-[#4F46E5]",
        "Full-time": "bg-[#F0FDF4] text-[#16A34A]",
        "Part-time": "bg-[#FFF7ED] text-[#C2410C]",
        Freelance: "bg-[#F5F3FF] text-[#7C3AED]",
    };

    const formatDuration = (exp: Experience) => {
        const start = new Date(exp.startDate).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
        });
        if (exp.isCurrentlyWorking) {
            return `${start} – Present`;
        }
        const end = exp.endDate
            ? new Date(exp.endDate).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
            })
            : "Present";
        return `${start} – ${end}`;
    };

    const toggleExpanded = (id: string) => {
        const newExpanded = new Set(expandedIds);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedIds(newExpanded);
    };

    const shouldTruncate = (text: string) => text.split("\n").length > 3;

    return (
        <SectionCard
            title="Work Experience"
            icon={Briefcase}
            onEdit={onAdd}
            isEmpty={experience.length === 0}
        >
            {experience.length > 0 ? (
                <div className="space-y-5">
                    {experience.map((exp, index) => {
                        const isExpanded = expandedIds.has(exp.id);
                        const needsTruncation = shouldTruncate(exp.description);
                        const displayDescription =
                            isExpanded || !needsTruncation
                                ? exp.description
                                : exp.description.split("\n").slice(0, 3).join("\n");

                        return (
                            <div key={exp.id}>
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] flex items-center justify-center flex-shrink-0">
                                        <Briefcase className="w-5 h-5 text-[#4F46E5]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-[15px] font-semibold text-[#0F172A]">
                                                    {exp.title}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <p className="text-sm text-[#475569]">{exp.company}</p>
                                                    <span className="text-[#CBD5E1]">·</span>
                                                    <span
                                                        className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${employmentTypeStyles[exp.employmentType]
                                                            }`}
                                                    >
                                                        {exp.employmentType}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <button
                                                    onClick={() =>
                                                        setOpenMenuId(openMenuId === exp.id ? null : exp.id)
                                                    }
                                                    className="p-1.5 hover:bg-[#F8FAFC] rounded-lg transition-colors duration-200"
                                                    aria-label="Options"
                                                >
                                                    <MoreVertical className="w-4 h-4 text-[#94A3B8]" />
                                                </button>
                                                {openMenuId === exp.id && (
                                                    <>
                                                        <div
                                                            className="fixed inset-0 z-10"
                                                            onClick={() => setOpenMenuId(null)}
                                                        />
                                                        <div className="absolute right-0 top-8 z-20 bg-white border border-[#E2E8F0] rounded-lg shadow-md py-1 min-w-[120px]">
                                                            <button
                                                                onClick={() => {
                                                                    onEdit(exp);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="w-full px-4 py-2 text-left text-sm text-[#0F172A] hover:bg-[#F8FAFC] transition-colors duration-150"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    onDelete(exp.id);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="w-full px-4 py-2 text-left text-sm text-[#EF4444] hover:bg-[#FEF2F2] transition-colors duration-150"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-2 text-[13px] text-[#94A3B8]">
                                            <Calendar className="w-3 h-3" />
                                            <span>{formatDuration(exp)}</span>
                                        </div>
                                        <p className="mt-2 text-[13px] text-[#64748B] leading-relaxed whitespace-pre-wrap">
                                            {displayDescription}
                                        </p>
                                        {needsTruncation && (
                                            <button
                                                onClick={() => toggleExpanded(exp.id)}
                                                className="mt-1 text-[13px] font-medium text-[#4F46E5] hover:underline"
                                            >
                                                {isExpanded ? "Show less" : "Show more"}
                                            </button>
                                        )}
                                        {exp.skills.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                                {exp.skills.map((skill, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="px-2 py-0.5 bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] text-xs font-medium rounded-full"
                                                    >
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {index < experience.length - 1 && (
                                    <div className="mt-5 h-px border-t border-dashed border-[#E2E8F0]" />
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <EmptyState
                    icon={Briefcase}
                    title="Add internships, jobs or freelance work"
                    description="Showcase your professional experience and achievements"
                    ctaLabel="Add Experience"
                    onCtaClick={onAdd}
                />
            )}
        </SectionCard>
    );
}
