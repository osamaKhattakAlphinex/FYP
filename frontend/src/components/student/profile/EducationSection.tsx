"use client";

import { GraduationCap, Calendar, Building2, MoreVertical } from "lucide-react";
import { useState } from "react";
import SectionCard from "@/components/shared/SectionCard";
import EmptyState from "@/components/shared/EmptyState";
import { Education } from "@/types/student.types";

interface EducationSectionProps {
    education: Education[];
    isEditMode?: boolean;
    onEdit?: (edu: Education) => void;
    onDelete?: (id: string) => void;
    onAdd?: () => void;
}

export default function EducationSection({
    education,
    isEditMode = false,
    onEdit,
    onDelete,
    onAdd,
}: EducationSectionProps) {
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const formatDuration = (edu: Education) => {
        if (edu.isCurrentlyStudying) {
            return `${edu.startYear} – Present`;
        }
        return `${edu.startYear} – ${edu.endYear}`;
    };

    return (
        <SectionCard
            title="Education"
            icon={GraduationCap}
            onEdit={isEditMode ? onAdd : undefined}
            isEmpty={education.length === 0}
        >
            {education.length > 0 ? (
                <div className="space-y-5">
                    {education.map((edu, index) => (
                        <div key={edu.id}>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] flex items-center justify-center flex-shrink-0">
                                    <Building2 className="w-5 h-5 text-[#4F46E5]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-[15px] font-semibold text-[#0F172A]">
                                                {edu.degree} in {edu.fieldOfStudy}
                                            </h3>
                                            <p className="text-sm text-[#475569] mt-0.5">{edu.institution}</p>
                                        </div>
                                        {isEditMode && (onEdit || onDelete) && (
                                            <div className="relative">
                                                <button
                                                    onClick={() => setOpenMenuId(openMenuId === edu.id ? null : edu.id)}
                                                    className="p-1.5 hover:bg-[#F8FAFC] rounded-lg transition-colors duration-200"
                                                    aria-label="Options"
                                                >
                                                    <MoreVertical className="w-4 h-4 text-[#94A3B8]" />
                                                </button>
                                                {openMenuId === edu.id && (
                                                    <>
                                                        <div
                                                            className="fixed inset-0 z-10"
                                                            onClick={() => setOpenMenuId(null)}
                                                        />
                                                        <div className="absolute right-0 top-8 z-20 bg-white border border-[#E2E8F0] rounded-lg shadow-md py-1 min-w-[120px]">
                                                            {onEdit && (
                                                                <button
                                                                    onClick={() => {
                                                                        onEdit(edu);
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    className="w-full px-4 py-2 text-left text-sm text-[#0F172A] hover:bg-[#F8FAFC] transition-colors duration-150"
                                                                >
                                                                    Edit
                                                                </button>
                                                            )}
                                                            {onDelete && (
                                                                <button
                                                                    onClick={() => {
                                                                        onDelete(edu.id);
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    className="w-full px-4 py-2 text-left text-sm text-[#EF4444] hover:bg-[#FEF2F2] transition-colors duration-150"
                                                                >
                                                                    Delete
                                                                </button>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-2 text-[13px] text-[#94A3B8]">
                                        <Calendar className="w-3 h-3" />
                                        <span>{formatDuration(edu)}</span>
                                    </div>
                                    {edu.grade && (
                                        <span className="inline-block mt-2 px-2 py-0.5 bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] text-xs font-medium rounded-full">
                                            CGPA: {edu.grade}
                                        </span>
                                    )}
                                    {edu.description && (
                                        <p className="mt-2 text-[13px] text-[#64748B] leading-relaxed">
                                            {edu.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {index < education.length - 1 && (
                                <div className="mt-5 h-px border-t border-dashed border-[#E2E8F0]" />
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                isEditMode ? (
                    <EmptyState
                        icon={GraduationCap}
                        title="Add your educational background"
                        description="Include your degree, university, and academic achievements"
                        ctaLabel="Add Education"
                        onCtaClick={onAdd}
                    />
                ) : (
                    <div className="text-center py-8">
                        <GraduationCap className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
                        <p className="text-[#64748B] text-sm">No education information available</p>
                    </div>
                )
            )}
        </SectionCard>
    );
}
