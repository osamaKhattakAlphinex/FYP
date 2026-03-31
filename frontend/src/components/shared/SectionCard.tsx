"use client";

import { LucideIcon, Pencil, Plus } from "lucide-react";
import { ReactNode } from "react";

interface SectionCardProps {
    title: string;
    icon: LucideIcon;
    onEdit?: () => void;
    isEmpty?: boolean;
    children: ReactNode;
}

export default function SectionCard({
    title,
    icon: Icon,
    onEdit,
    isEmpty = false,
    children,
}: SectionCardProps) {
    return (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-7">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                    <Icon className="w-5 h-5 text-[#4F46E5]" />
                    <h2 className="text-lg font-semibold text-[#0F172A]">{title}</h2>
                </div>
                {onEdit && (
                    <button
                        onClick={onEdit}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] text-[13px] font-medium rounded-lg hover:bg-[#EEF2FF] hover:border-[#4F46E5] hover:text-[#4F46E5] transition-all duration-200"
                    >
                        {isEmpty ? (
                            <>
                                <Plus className="w-3.5 h-3.5" />
                                Add
                            </>
                        ) : (
                            <>
                                <Pencil className="w-3.5 h-3.5" />
                                Edit
                            </>
                        )}
                    </button>
                )}
            </div>
            {children}
        </div>
    );
}
