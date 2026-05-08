"use client";

import { Code2, Github, Globe, MoreVertical } from "lucide-react";
import { useState } from "react";
import SectionCard from "@/components/shared/SectionCard";
import EmptyState from "@/components/shared/EmptyState";
import { Project } from "@/types/student.types";

interface ProjectsSectionProps {
    projects: Project[];
    isEditMode?: boolean;
    onEdit?: (project: Project) => void;
    onDelete?: (id: string) => void;
    onAdd?: () => void;
}

export default function ProjectsSection({
    projects,
    isEditMode = false,
    onEdit,
    onDelete,
    onAdd,
}: ProjectsSectionProps) {
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const toggleExpanded = (id: string) => {
        const newExpanded = new Set(expandedIds);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedIds(newExpanded);
    };

    const shouldTruncate = (text: string) => text.split("\n").length > 2;

    return (
        <SectionCard
            title="Projects"
            icon={Code2}
            onEdit={isEditMode ? onAdd : undefined}
            isEmpty={projects.length === 0}
        >
            {projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects.map((project) => {
                        const isExpanded = expandedIds.has(project.id);
                        const needsTruncation = shouldTruncate(project.description);
                        const displayDescription =
                            isExpanded || !needsTruncation
                                ? project.description
                                : project.description.split("\n").slice(0, 2).join("\n");

                        return (
                            <div
                                key={project.id}
                                className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-5 relative"
                            >
                                {isEditMode && (onEdit || onDelete) && (
                                    <div className="absolute top-4 right-4">
                                        <button
                                            onClick={() =>
                                                setOpenMenuId(openMenuId === project.id ? null : project.id)
                                            }
                                            className="p-1.5 hover:bg-white rounded-lg transition-colors duration-200"
                                            aria-label="Options"
                                        >
                                            <MoreVertical className="w-4 h-4 text-[#94A3B8]" />
                                        </button>
                                        {openMenuId === project.id && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-10"
                                                    onClick={() => setOpenMenuId(null)}
                                                />
                                                <div className="absolute right-0 top-8 z-20 bg-white border border-[#E2E8F0] rounded-lg shadow-md py-1 min-w-[120px]">
                                                    {onEdit && (
                                                        <button
                                                            onClick={() => {
                                                                onEdit(project);
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
                                                                onDelete(project.id);
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

                                {project.thumbnailUrl ? (
                                    <img
                                        src={project.thumbnailUrl}
                                        alt={project.title}
                                        className="w-full h-[120px] object-cover rounded-lg mb-3"
                                    />
                                ) : (
                                    <div className="w-full h-20 bg-[#EEF2FF] rounded-lg flex items-center justify-center mb-3">
                                        <Code2 className="w-8 h-8 text-[#C7D2FE]" />
                                    </div>
                                )}

                                <h3 className="text-[15px] font-semibold text-[#0F172A] pr-8">
                                    {project.title}
                                </h3>
                                <p className="mt-2 text-[13px] text-[#475569] leading-relaxed whitespace-pre-wrap">
                                    {displayDescription}
                                </p>
                                {needsTruncation && (
                                    <button
                                        onClick={() => toggleExpanded(project.id)}
                                        className="mt-1 text-[13px] font-medium text-[#4F46E5] hover:underline"
                                    >
                                        {isExpanded ? "Show less" : "Show more"}
                                    </button>
                                )}

                                {project.techStack.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                        {project.techStack.slice(0, 3).map((tech, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-0.5 bg-[#EEF2FF] text-[#4F46E5] text-xs font-medium rounded-full"
                                            >
                                                {tech}
                                            </span>
                                        ))}
                                        {project.techStack.length > 3 && (
                                            <span className="px-2 py-0.5 bg-[#EEF2FF] text-[#4F46E5] text-xs font-medium rounded-full">
                                                +{project.techStack.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-center gap-4 mt-4">
                                    {project.githubUrl && (
                                        <a
                                            href={project.githubUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-xs text-[#475569] hover:text-[#0F172A] transition-colors duration-200"
                                        >
                                            <Github className="w-3.5 h-3.5" />
                                            <span>GitHub</span>
                                        </a>
                                    )}
                                    {project.projectUrl && (
                                        <a
                                            href={project.projectUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-xs text-[#4F46E5] hover:underline transition-colors duration-200"
                                        >
                                            <Globe className="w-3.5 h-3.5" />
                                            <span>Live Demo</span>
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                isEditMode ? (
                    <EmptyState
                        icon={Code2}
                        title="Showcase your projects to stand out"
                        description="Add personal projects, hackathons, or open source contributions"
                        ctaLabel="Add Project"
                        onCtaClick={onAdd}
                    />
                ) : (
                    <div className="text-center py-8">
                        <Code2 className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
                        <p className="text-[#64748B] text-sm">No projects available</p>
                    </div>
                )
            )}
        </SectionCard>
    );
}
