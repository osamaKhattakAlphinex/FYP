"use client";

import { Linkedin, Twitter, Github, Facebook, ShieldCheck, Shield, Pencil } from 'lucide-react';
import { useState } from 'react';
import EditModal from '@/components/shared/EditModal';
import CompanyStatsPanel from './CompanyStatsPanel';
import ActiveTasksPreview from './ActiveTasksPreview';
import type { CompanyProfile, CompanySocialLinks, CompanyTask } from '@/types/company.types';

interface CompanySidebarProps {
    profile: CompanyProfile;
    tasks: CompanyTask[];
    isEditMode?: boolean;
    onUpdateSocial?: (links: CompanySocialLinks) => void;
    onRequestVerification?: () => void;
}

export default function CompanySidebar({
    profile,
    tasks,
    isEditMode = false,
    onUpdateSocial,
    onRequestVerification
}: CompanySidebarProps) {
    const [showSocialModal, setShowSocialModal] = useState(false);
    const [socialLinks, setSocialLinks] = useState(profile.socialLinks);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateUrl = (url: string) => {
        if (!url) return true;
        return url.match(/^https?:\/\/.+/);
    };

    const handleSaveSocial = () => {
        const newErrors: Record<string, string> = {};

        if (socialLinks.linkedin && !validateUrl(socialLinks.linkedin)) {
            newErrors.linkedin = 'Please enter a valid URL';
        }
        if (socialLinks.twitter && !validateUrl(socialLinks.twitter)) {
            newErrors.twitter = 'Please enter a valid URL';
        }
        if (socialLinks.github && !validateUrl(socialLinks.github)) {
            newErrors.github = 'Please enter a valid URL';
        }
        if (socialLinks.facebook && !validateUrl(socialLinks.facebook)) {
            newErrors.facebook = 'Please enter a valid URL';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onUpdateSocial?.(socialLinks);
        setShowSocialModal(false);
    };

    const socialPlatforms = [
        { key: 'linkedin', icon: Linkedin, color: '#0A66C2', label: 'LinkedIn' },
        { key: 'twitter', icon: Twitter, color: '#1DA1F2', label: 'Twitter' },
        { key: 'github', icon: Github, color: '#0F172A', label: 'GitHub' },
        { key: 'facebook', icon: Facebook, color: '#1877F2', label: 'Facebook' }
    ];

    const hasSocialLinks = Object.values(profile.socialLinks).some(link => link);

    return (
        <div className="space-y-4">
            {/* Stats Panel */}
            <CompanyStatsPanel
                totalTasksPosted={profile.totalTasksPosted}
                totalInterns={profile.totalInterns}
                activeTasks={profile.activeTasks}
                avgRating={profile.avgRating}
            />

            {/* Active Tasks Preview */}
            <ActiveTasksPreview
                tasks={tasks}
                activeTasks={profile.activeTasks}
                isEditMode={isEditMode}
            />

            {/* Social Links */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[13px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                        Social Links
                    </h3>
                    {isEditMode && (
                        <button
                            onClick={() => setShowSocialModal(true)}
                            className="text-[#4F46E5] hover:text-[#4338CA] transition-colors duration-200"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {!hasSocialLinks && isEditMode ? (
                    <button
                        onClick={() => setShowSocialModal(true)}
                        className="w-full py-3 text-sm text-[#64748B] border border-dashed border-[#E2E8F0] rounded-lg hover:border-[#4F46E5] hover:text-[#4F46E5] transition-all duration-200"
                    >
                        Add social links
                    </button>
                ) : (
                    <div className="flex items-center justify-center gap-3">
                        {socialPlatforms.map((platform) => {
                            const Icon = platform.icon;
                            const url = profile.socialLinks[platform.key as keyof CompanySocialLinks];

                            if (!url) return null;

                            return (
                                <a
                                    key={platform.key}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-200"
                                    style={{ backgroundColor: `${platform.color}15` }}
                                    aria-label={platform.label}
                                >
                                    <Icon className="w-5 h-5" style={{ color: platform.color }} />
                                </a>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Verification Status */}
            {isEditMode && (
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
                    {profile.isVerified ? (
                        <div className="text-center">
                            <div className="w-12 h-12 mx-auto mb-3 bg-[#DCFCE7] rounded-full flex items-center justify-center">
                                <ShieldCheck className="w-6 h-6 text-[#10B981]" />
                            </div>
                            <h3 className="text-[15px] font-semibold text-[#0F172A] mb-1">
                                Verified Company
                            </h3>
                            <p className="text-[13px] text-[#94A3B8] mb-3">
                                Verified on {new Date(profile.verificationDate!).toLocaleDateString()}
                            </p>
                            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg p-3">
                                <p className="text-[13px] text-[#15803D] leading-relaxed">
                                    Your company is verified. Students trust verified companies more and are more likely to apply to your tasks.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="w-12 h-12 mx-auto mb-3 bg-[#F1F5F9] rounded-full flex items-center justify-center">
                                <Shield className="w-6 h-6 text-[#94A3B8]" />
                            </div>
                            <h3 className="text-[15px] font-semibold text-[#0F172A] mb-3">
                                Verification Pending
                            </h3>
                            <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-lg p-3 mb-4">
                                <p className="text-[13px] text-[#92400E] leading-relaxed">
                                    Complete your profile and submit documents to get verified by NexIntern admin.
                                </p>
                            </div>
                            <button
                                onClick={onRequestVerification}
                                className="w-full bg-white border border-[#E2E8F0] text-[#475569] text-sm font-medium py-2.5 rounded-lg hover:border-[#4F46E5] hover:text-[#4F46E5] transition-all duration-200"
                            >
                                Request Verification
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Social Links Edit Modal */}
            {showSocialModal && (
                <EditModal
                    title="Edit Social Links"
                    onSave={handleSaveSocial}
                    onClose={() => {
                        setShowSocialModal(false);
                        setSocialLinks(profile.socialLinks);
                        setErrors({});
                    }}
                >
                    <div className="space-y-4">
                        {socialPlatforms.map((platform) => (
                            <div key={platform.key}>
                                <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
                                    {platform.label} URL
                                </label>
                                <input
                                    type="url"
                                    value={socialLinks[platform.key as keyof CompanySocialLinks] || ''}
                                    onChange={(e) => setSocialLinks({
                                        ...socialLinks,
                                        [platform.key]: e.target.value
                                    })}
                                    placeholder={`https://${platform.key}.com/yourcompany`}
                                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                                />
                                {errors[platform.key] && (
                                    <p className="text-xs text-[#EF4444] mt-1 flex items-center gap-1">
                                        <span>⚠</span> {errors[platform.key]}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </EditModal>
            )}
        </div>
    );
}
