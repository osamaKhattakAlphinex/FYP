"use client";

import Modal from "@/components/shared/Modal";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";

interface WhatsMissingModalProps {
    isOpen: boolean;
    onClose: () => void;
    profileData: {
        hasBasicInfo: boolean;
        hasEducation: boolean;
        hasSkills: boolean;
        hasExperience: boolean;
        hasProjects: boolean;
        hasBio: boolean;
        hasResume: boolean;
    };
    completionScore: number;
}

export default function WhatsMissingModal({ isOpen, onClose, profileData, completionScore }: WhatsMissingModalProps) {
    const sections = [
        {
            name: "Basic Information",
            description: "Name and location (city or country)",
            completed: profileData.hasBasicInfo,
            weight: 20
        },
        {
            name: "Education",
            description: "At least one education entry",
            completed: profileData.hasEducation,
            weight: 15
        },
        {
            name: "Skills",
            description: "At least 3 skills",
            completed: profileData.hasSkills,
            weight: 15
        },
        {
            name: "Experience",
            description: "At least one work experience",
            completed: profileData.hasExperience,
            weight: 15
        },
        {
            name: "Projects",
            description: "At least one project",
            completed: profileData.hasProjects,
            weight: 15
        },
        {
            name: "About/Bio",
            description: "Tell us about yourself",
            completed: profileData.hasBio,
            weight: 10
        },
        {
            name: "Resume",
            description: "Upload your resume",
            completed: profileData.hasResume,
            weight: 10
        }
    ];

    const completedSections = sections.filter(s => s.completed);
    const missingSections = sections.filter(s => !s.completed);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Profile Completion" size="md">
            <div className="p-6">
                {/* Progress Summary */}
                <div className="mb-6 p-4 bg-gradient-to-r from-[#EEF2FF] to-[#E0F2FE] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-[#0F172A]">Overall Progress</span>
                        <span className="text-2xl font-bold text-[#4F46E5]">{completionScore}%</span>
                    </div>
                    <div className="w-full bg-white rounded-full h-3 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-[#4F46E5] to-[#06B6D4] transition-all duration-500"
                            style={{ width: `${completionScore}%` }}
                        />
                    </div>
                    <p className="mt-2 text-xs text-[#64748B]">
                        {completedSections.length} of {sections.length} sections completed
                    </p>
                </div>

                {/* Completed Sections */}
                {completedSections.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-[#0F172A] mb-3 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                            Completed ({completedSections.length})
                        </h3>
                        <div className="space-y-2">
                            {completedSections.map((section, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg">
                                    <CheckCircle2 className="w-5 h-5 text-[#10B981] flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[#0F172A]">{section.name}</p>
                                        <p className="text-xs text-[#64748B] mt-0.5">{section.description}</p>
                                    </div>
                                    <span className="text-xs font-medium text-[#10B981] bg-white px-2 py-1 rounded">
                                        +{section.weight}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Missing Sections */}
                {missingSections.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold text-[#0F172A] mb-3 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-[#F59E0B]" />
                            To Complete ({missingSections.length})
                        </h3>
                        <div className="space-y-2">
                            {missingSections.map((section, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 bg-[#FEF3C7] border border-[#FDE68A] rounded-lg">
                                    <Circle className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[#0F172A]">{section.name}</p>
                                        <p className="text-xs text-[#64748B] mt-0.5">{section.description}</p>
                                    </div>
                                    <span className="text-xs font-medium text-[#F59E0B] bg-white px-2 py-1 rounded">
                                        +{section.weight}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Call to Action */}
                {completionScore === 100 ? (
                    <div className="mt-6 p-4 bg-gradient-to-r from-[#10B981] to-[#059669] rounded-lg text-center">
                        <p className="text-white font-semibold">🎉 Your profile is 100% complete!</p>
                        <p className="text-white/90 text-sm mt-1">You're ready to get matched with opportunities</p>
                    </div>
                ) : (
                    <div className="mt-6 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                        <p className="text-sm text-[#475569] text-center">
                            Complete your profile to unlock AI matching and apply for tasks
                        </p>
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="w-full mt-4 px-4 py-2.5 bg-[#4F46E5] text-white font-medium rounded-lg hover:bg-[#4338CA] transition-colors duration-200"
                >
                    Got it
                </button>
            </div>
        </Modal>
    );
}
