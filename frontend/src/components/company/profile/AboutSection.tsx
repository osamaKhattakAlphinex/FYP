"use client";

import { Building2, Cpu } from 'lucide-react';
import { useState } from 'react';
import SectionCard from '@/components/shared/SectionCard';
import EditModal from '@/components/shared/EditModal';
import EmptyState from '@/components/shared/EmptyState';
import TagInput from '@/components/shared/TagInput';

interface AboutSectionProps {
    about: string;
    tagline: string;
    techStack: string[];
    isEditMode?: boolean;
    onUpdateAbout?: (data: { about: string; tagline: string }) => void;
    onUpdateTechStack?: (techStack: string[]) => void;
}

export default function AboutSection({
    about,
    tagline,
    techStack,
    isEditMode = false,
    onUpdateAbout,
    onUpdateTechStack
}: AboutSectionProps) {
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [showTechModal, setShowTechModal] = useState(false);
    const [showFullAbout, setShowFullAbout] = useState(false);
    const [formData, setFormData] = useState({ about, tagline });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateAboutForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.about.trim() || formData.about.length < 100) {
            newErrors.about = 'About must be at least 100 characters';
        }
        if (formData.about.length > 1200) {
            newErrors.about = 'About must not exceed 1200 characters';
        }
        if (!formData.tagline.trim() || formData.tagline.length < 10) {
            newErrors.tagline = 'Tagline must be at least 10 characters';
        }
        if (formData.tagline.length > 100) {
            newErrors.tagline = 'Tagline must not exceed 100 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveAbout = () => {
        if (!validateAboutForm()) return;
        onUpdateAbout?.(formData);
        setShowAboutModal(false);
    };

    const truncateText = (text: string, maxLines: number = 5) => {
        const lines = text.split('\n');
        if (lines.length <= maxLines && text.length <= 400) {
            return text;
        }
        return text.slice(0, 400) + '...';
    };

    const shouldShowMore = about.length > 400 || about.split('\n').length > 5;

    return (
        <>
            {/* About Section */}
            <SectionCard
                icon={Building2}
                title="About the Company"
                onEdit={isEditMode ? () => setShowAboutModal(true) : undefined}
            >
                {!about ? (
                    <EmptyState
                        icon={Building2}
                        title="No description yet"
                        description="Tell students about your company, mission, and culture"
                        ctaLabel="Add Company Description"
                        onCtaClick={() => setShowAboutModal(true)}
                    />
                ) : (
                    <div>
                        <p className="text-[15px] text-[#475569] leading-relaxed whitespace-pre-wrap">
                            {showFullAbout ? about : truncateText(about)}
                        </p>
                        {shouldShowMore && (
                            <button
                                onClick={() => setShowFullAbout(!showFullAbout)}
                                className="mt-3 text-sm font-medium text-[#4F46E5] hover:text-[#4338CA] transition-colors duration-200"
                            >
                                {showFullAbout ? 'Show less' : 'Show more'}
                            </button>
                        )}
                    </div>
                )}
            </SectionCard>

            {/* Tech Stack Section */}
            <SectionCard
                icon={Cpu}
                title="Technologies We Use"
                onEdit={isEditMode ? () => setShowTechModal(true) : undefined}
            >
                {techStack.length === 0 ? (
                    isEditMode ? (
                        <EmptyState
                            icon={Cpu}
                            title="No tech stack added"
                            description="Add technologies your team uses — students will be matched based on this"
                            ctaLabel="Add Tech Stack"
                            onCtaClick={() => setShowTechModal(true)}
                        />
                    ) : null
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {techStack.map((tech, index) => (
                            <span
                                key={index}
                                className="inline-flex items-center bg-[#0F172A] text-white text-[13px] font-medium px-3.5 py-1.5 rounded-full"
                            >
                                {tech}
                            </span>
                        ))}
                    </div>
                )}
            </SectionCard>

            {/* About Edit Modal */}
            {showAboutModal && (
                <EditModal
                    isOpen={showAboutModal}
                    title="Edit About Company"
                    onSave={handleSaveAbout}
                    onClose={() => {
                        setShowAboutModal(false);
                        setFormData({ about, tagline });
                        setErrors({});
                    }}
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
                                Tagline <span className="text-[#EF4444]">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.tagline}
                                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                                placeholder="A short punchy tagline for your company"
                                maxLength={100}
                                className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                            />
                            <div className="flex items-center justify-between mt-1">
                                {errors.tagline ? (
                                    <p className="text-xs text-[#EF4444] flex items-center gap-1">
                                        <span>⚠</span> {errors.tagline}
                                    </p>
                                ) : (
                                    <span />
                                )}
                                <span className="text-xs text-[#94A3B8]">
                                    {formData.tagline.length}/100
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
                                Company Description <span className="text-[#EF4444]">*</span>
                            </label>
                            <textarea
                                value={formData.about}
                                onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                                placeholder="Describe your company, mission, values, and what makes you unique..."
                                rows={6}
                                maxLength={1200}
                                className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent resize-none"
                            />
                            <div className="flex items-center justify-between mt-1">
                                {errors.about ? (
                                    <p className="text-xs text-[#EF4444] flex items-center gap-1">
                                        <span>⚠</span> {errors.about}
                                    </p>
                                ) : (
                                    <span />
                                )}
                                <span className="text-xs text-[#94A3B8]">
                                    {formData.about.length}/1200
                                </span>
                            </div>
                        </div>
                    </div>
                </EditModal>
            )}

            {/* Tech Stack Edit Modal */}
            {showTechModal && (
                <EditModal
                    isOpen={showTechModal}
                    title="Edit Tech Stack"
                    onSave={() => {
                        setShowTechModal(false);
                    }}
                    onClose={() => setShowTechModal(false)}
                >
                    <div className="space-y-4">
                        <p className="text-sm text-[#475569]">
                            Add up to 20 technologies your team uses. Students will be matched based on these skills.
                        </p>
                        <TagInput
                            tags={techStack}
                            onChange={onUpdateTechStack || (() => { })}
                            placeholder="e.g. React, Node.js, Python..."
                            maxTags={20}
                            suggestions={[
                                'React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Express',
                                'Django', 'FastAPI', 'PostgreSQL', 'MongoDB', 'AWS', 'Docker',
                                'Kubernetes', 'TypeScript', 'Python', 'Java', 'Go', 'Rust'
                            ]}
                        />
                    </div>
                </EditModal>
            )}
        </>
    );
}
