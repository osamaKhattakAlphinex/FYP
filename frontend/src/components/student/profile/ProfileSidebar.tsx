"use client";

import { GraduationCap, ExternalLink, Linkedin, Github, Globe, Twitter, Pencil } from "lucide-react";
import ProfileHeader from "./ProfileHeader";
import { SocialLinks } from "@/types/student.types";

interface ProfileSidebarProps {
    fullName: string;
    headline: string;
    city: string;
    country: string;
    profilePicture: string | null;
    isAvailable: boolean;
    university: string;
    degree: string;
    major: string;
    graduationYear: number;
    cgpa: number | null;
    profileViews: number;
    tasksApplied: number;
    tasksCompleted: number;
    socialLinks: SocialLinks;
    studentId: string;
    onToggleAvailability: () => void;
    onUpdateAvatar: (file: File) => void;
    onEditHeadline: () => void;
    onEditProfile: () => void;
    onEditSocialLinks: () => void;
}

export default function ProfileSidebar({
    fullName,
    headline,
    city,
    country,
    profilePicture,
    isAvailable,
    university,
    degree,
    major,
    graduationYear,
    cgpa,
    profileViews,
    tasksApplied,
    tasksCompleted,
    socialLinks,
    studentId,
    onToggleAvailability,
    onUpdateAvatar,
    onEditHeadline,
    onEditProfile,
    onEditSocialLinks,
}: ProfileSidebarProps) {
    const stats = [
        { label: "Profile Views", value: profileViews },
        { label: "Tasks Applied", value: tasksApplied },
        { label: "Tasks Completed", value: tasksCompleted },
    ];

    const socialIcons = [
        { icon: Linkedin, url: socialLinks.linkedin, color: "#0A66C2", name: "LinkedIn" },
        { icon: Github, url: socialLinks.github, color: "#0F172A", name: "GitHub" },
        { icon: Globe, url: socialLinks.portfolio, color: "#06B6D4", name: "Portfolio" },
        { icon: Twitter, url: socialLinks.twitter, color: "#1DA1F2", name: "Twitter" },
    ];

    return (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
            <ProfileHeader
                fullName={fullName}
                headline={headline}
                city={city}
                country={country}
                profilePicture={profilePicture}
                isAvailable={isAvailable}
                onToggleAvailability={onToggleAvailability}
                onUpdateAvatar={onUpdateAvatar}
                onEditHeadline={onEditHeadline}
            />

            <button
                onClick={onEditProfile}
                className="w-full mx-6 mb-5 px-0 py-2.5 bg-white border border-[#E2E8F0] text-[#0F172A] text-sm font-medium rounded-lg hover:border-[#4F46E5] hover:text-[#4F46E5] transition-all duration-200 flex items-center justify-center gap-2"
                style={{ width: "calc(100% - 48px)" }}
            >
                <Pencil className="w-4 h-4" />
                Edit Profile
            </button>

            <div className="h-px bg-[#E2E8F0]" />

            <div className="p-6">
                <div className="flex items-start gap-3">
                    <GraduationCap className="w-4 h-4 text-[#94A3B8] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0F172A]">
                            {degree}, {major}
                        </p>
                        <p className="text-[13px] text-[#475569] mt-0.5">{university}</p>
                        <p className="text-[13px] text-[#94A3B8] mt-0.5">
                            Graduating {graduationYear}
                            {cgpa && ` | CGPA: ${cgpa.toFixed(2)}`}
                        </p>
                    </div>
                </div>
            </div>

            <div className="h-px bg-[#E2E8F0]" />

            <div className="p-6">
                <h3 className="text-[13px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">
                    Profile Stats
                </h3>
                <div className="space-y-2">
                    {stats.map((stat, index) => (
                        <div key={index}>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm text-[#475569]">{stat.label}</span>
                                <span className="text-sm font-semibold text-[#0F172A]">{stat.value}</span>
                            </div>
                            {index < stats.length - 1 && (
                                <div className="h-px bg-[#E2E8F0] border-dashed" style={{ borderTop: "1px dashed #E2E8F0", height: 0 }} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="h-px bg-[#E2E8F0]" />

            <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[13px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                        Connect
                    </h3>
                    <button
                        onClick={onEditSocialLinks}
                        className="text-[13px] text-[#4F46E5] hover:underline font-medium"
                    >
                        Edit
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    {socialIcons.map(({ icon: Icon, url, color, name }) => (
                        <button
                            key={name}
                            onClick={() => (url ? window.open(url, "_blank") : onEditSocialLinks())}
                            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 ${url
                                ? "bg-[#F8FAFC] border-[#E2E8F0] hover:bg-[#EEF2FF] hover:border-[#4F46E5]"
                                : "bg-[#F8FAFC] border-[#E2E8F0] hover:bg-[#EEF2FF] hover:border-[#4F46E5]"
                                }`}
                            style={url ? {} : { opacity: 0.5 }}
                            aria-label={name}
                            title={url ? `Visit ${name}` : `Add ${name}`}
                        >
                            <Icon
                                className="w-4 h-4 transition-colors duration-200"
                                style={{ color: url ? color : "#CBD5E1" }}
                            />
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] p-4">
                <a
                    href={`/profile/${studentId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-[13px] font-medium text-[#4F46E5] hover:underline transition-all duration-200"
                >
                    <ExternalLink className="w-4 h-4" />
                    View Public Profile
                </a>
            </div>
        </div>
    );
}
