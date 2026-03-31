"use client";

import { useState } from "react";
import { MapPin, GraduationCap, MessageCircle, UserPlus, Briefcase } from "lucide-react";
import AboutSection from "@/components/student/profile/AboutSection";
import SkillsSection from "@/components/student/profile/SkillsSection";
import EducationSection from "@/components/student/profile/EducationSection";
import ExperienceSection from "@/components/student/profile/ExperienceSection";
import ProjectsSection from "@/components/student/profile/ProjectsSection";
import CertificatesSection from "@/components/student/profile/CertificatesSection";
import ProgressBar from "@/components/shared/ProgressBar";
import { StudentProfile } from "@/types/student.types";

// Mock data - replace with actual API calls based on studentId
const mockProfile: StudentProfile = {
    id: "student-1",
    userId: "user-1",
    fullName: "Sarah Johnson",
    profilePicture: null,
    headline: "Final Year CS Student | React Developer | AI Enthusiast",
    about: "Passionate computer science student with a strong foundation in full-stack development and machine learning. I love building user-centric applications and exploring cutting-edge technologies.",
    university: "Stanford University",
    degree: "Bachelor of Science",
    major: "Computer Science",
    graduationYear: 2025,
    cgpa: 3.8,
    city: "San Francisco",
    country: "USA",
    profileCompletionScore: 72,
    isAvailable: true,
    skills: [
        { id: "1", name: "React", level: "Advanced" },
        { id: "2", name: "TypeScript", level: "Advanced" },
        { id: "3", name: "Node.js", level: "Intermediate" },
        { id: "4", name: "Python", level: "Advanced" },
        { id: "5", name: "Machine Learning", level: "Intermediate" },
    ],
    education: [
        {
            id: "1",
            institution: "Stanford University",
            degree: "Bachelor of Science",
            fieldOfStudy: "Computer Science",
            startYear: 2021,
            endYear: null,
            isCurrentlyStudying: true,
            grade: "3.8",
            description: "Focus on AI and Software Engineering",
        },
    ],
    experience: [
        {
            id: "1",
            title: "Software Engineering Intern",
            company: "Google",
            employmentType: "Internship",
            startDate: "2024-06-01",
            endDate: "2024-08-31",
            isCurrentlyWorking: false,
            description:
                "Worked on the Chrome team to improve performance metrics.\nImplemented new features using React and TypeScript.\nCollaborated with cross-functional teams.",
            skills: ["React", "TypeScript", "Performance Optimization"],
        },
    ],
    projects: [
        {
            id: "1",
            title: "AI Study Buddy",
            description:
                "An AI-powered study assistant that helps students learn more effectively using personalized recommendations.",
            techStack: ["React", "Python", "OpenAI API", "Firebase"],
            projectUrl: "https://example.com",
            githubUrl: "https://github.com/example",
            thumbnailUrl: null,
            startDate: "2024-01-01",
            endDate: null,
        },
    ],
    certificates: [
        {
            id: "1",
            title: "React Development Micro-Internship",
            issuer: "NexIntern",
            issueDate: "2024-03-15",
            expiryDate: null,
            credentialId: "NI-2024-001234",
            credentialUrl: "https://nexintern.com/verify/001234",
            isNexInternCertificate: true,
        },
    ],
    socialLinks: {
        linkedin: "https://linkedin.com/in/sarahjohnson",
        github: "https://github.com/sarahjohnson",
        portfolio: "https://sarahjohnson.dev",
        twitter: null,
    },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-03-20T00:00:00Z",
};

export default function PublicProfilePage({ params }: { params: { studentId: string } }) {
    const [profile] = useState<StudentProfile>(mockProfile);
    const aiMatchScore = 87; // Mock AI match score

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] py-8">
            <div className="max-w-[1200px] mx-auto px-8">
                <div className="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-6">
                    {/* Left Sidebar */}
                    <div className="space-y-4">
                        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
                            <div className="h-20 bg-gradient-to-r from-[#4F46E5] to-[#06B6D4]" />
                            <div className="px-6 pb-6">
                                <div className="relative inline-block -mt-11 mb-4">
                                    <div className="w-[88px] h-[88px] rounded-full border-3 border-white bg-[#EEF2FF] flex items-center justify-center overflow-hidden">
                                        {profile.profilePicture ? (
                                            <img
                                                src={profile.profilePicture}
                                                alt={profile.fullName}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-[28px] font-bold text-[#4F46E5]">
                                                {getInitials(profile.fullName)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <h1 className="text-lg font-bold text-[#0F172A]">{profile.fullName}</h1>
                                <p className="text-[13px] text-[#475569] leading-relaxed mt-1">
                                    {profile.headline}
                                </p>
                                <div className="flex items-center gap-1.5 mt-2 text-[13px] text-[#94A3B8]">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span>
                                        {profile.city}, {profile.country}
                                    </span>
                                </div>
                                {profile.isAvailable && (
                                    <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#16A34A]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                        Open to Opportunities
                                    </div>
                                )}
                                <p className="mt-3 text-xs text-[#94A3B8]">Last Active: 2 days ago</p>
                            </div>

                            <div className="px-6 pb-6 space-y-3">
                                <button className="w-full py-2.5 bg-[#4F46E5] text-white text-sm font-semibold rounded-lg hover:bg-[#4338CA] transition-colors duration-200 flex items-center justify-center gap-2">
                                    <UserPlus className="w-4 h-4" />
                                    Connect
                                </button>
                                <button className="w-full py-2.5 bg-white border border-[#4F46E5] text-[#4F46E5] text-sm font-semibold rounded-lg hover:bg-[#EEF2FF] transition-colors duration-200 flex items-center justify-center gap-2">
                                    <Briefcase className="w-4 h-4" />
                                    Invite to Task
                                </button>
                            </div>

                            <div className="h-px bg-[#E2E8F0]" />

                            <div className="p-6">
                                <div className="flex items-start gap-3">
                                    <GraduationCap className="w-4 h-4 text-[#94A3B8] mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[#0F172A]">
                                            {profile.degree}, {profile.major}
                                        </p>
                                        <p className="text-[13px] text-[#475569] mt-0.5">{profile.university}</p>
                                        <p className="text-[13px] text-[#94A3B8] mt-0.5">
                                            Graduating {profile.graduationYear}
                                            {profile.cgpa && ` | CGPA: ${profile.cgpa.toFixed(2)}`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions Card */}
                        <div className="sticky top-[88px] bg-white border border-[#E2E8F0] rounded-2xl p-5">
                            <h3 className="text-[15px] font-bold text-[#0F172A] mb-4">
                                Hire {profile.fullName.split(" ")[0]}
                            </h3>
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[13px] text-[#475569]">AI Match</span>
                                    <span className="text-[13px] font-semibold text-[#4F46E5]">
                                        {aiMatchScore}%
                                    </span>
                                </div>
                                <ProgressBar value={aiMatchScore} />
                            </div>
                            <div className="space-y-2">
                                <button className="w-full py-2 bg-[#4F46E5] text-white text-sm font-semibold rounded-lg hover:bg-[#4338CA] transition-colors duration-200">
                                    Connect
                                </button>
                                <button className="w-full py-2 bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] text-sm font-medium rounded-lg hover:bg-[#EEF2FF] hover:border-[#4F46E5] hover:text-[#4F46E5] transition-all duration-200 flex items-center justify-center gap-2">
                                    <MessageCircle className="w-4 h-4" />
                                    Message
                                </button>
                                <button className="w-full py-2 bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] text-sm font-medium rounded-lg hover:bg-[#EEF2FF] hover:border-[#4F46E5] hover:text-[#4F46E5] transition-all duration-200 flex items-center justify-center gap-2">
                                    <Briefcase className="w-4 h-4" />
                                    Invite to Task
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Content */}
                    <div className="space-y-4">
                        <AboutSection about={profile.about} onEdit={() => { }} />

                        <SkillsSection skills={profile.skills} onEdit={() => { }} />

                        <EducationSection
                            education={profile.education}
                            onEdit={() => { }}
                            onDelete={() => { }}
                            onAdd={() => { }}
                        />

                        <ExperienceSection
                            experience={profile.experience}
                            onEdit={() => { }}
                            onDelete={() => { }}
                            onAdd={() => { }}
                        />

                        <ProjectsSection
                            projects={profile.projects}
                            onEdit={() => { }}
                            onDelete={() => { }}
                            onAdd={() => { }}
                        />

                        <CertificatesSection
                            certificates={profile.certificates}
                            onEdit={() => { }}
                            onDelete={() => { }}
                            onAdd={() => { }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
