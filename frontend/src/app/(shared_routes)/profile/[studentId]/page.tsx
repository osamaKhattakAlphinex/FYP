"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, GraduationCap, MessageCircle, UserPlus, Briefcase } from "lucide-react";
import AboutSection from "@/components/student/profile/AboutSection";
import SkillsSection from "@/components/student/profile/SkillsSection";
import EducationSection from "@/components/student/profile/EducationSection";
import ExperienceSection from "@/components/student/profile/ExperienceSection";
import ProjectsSection from "@/components/student/profile/ProjectsSection";
import CertificatesSection from "@/components/student/profile/CertificatesSection";
import ProgressBar from "@/components/shared/ProgressBar";
import { StudentProfile } from "@/types/student.types";
import { studentService } from "@/services/studentService";

export default function PublicProfilePage({ params }: { params: { studentId: string } }) {
    const router = useRouter();
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const aiMatchScore = 87; // Mock AI match score - can be calculated later

    useEffect(() => {
        loadPublicProfile();
    }, [params.studentId]);

    const loadPublicProfile = async () => {
        try {
            setLoading(true);
            const data = await studentService.getPublicProfile(params.studentId);

            // Transform backend data to frontend format
            const transformedProfile: StudentProfile = {
                id: data._id,
                userId: data.userId || "",
                fullName: `${data.firstName} ${data.lastName}`,
                profilePicture: data.profilePicture || null,
                headline: data.headline || "",
                about: data.bio || "",
                university: data.education?.[0]?.institution || "",
                degree: data.education?.[0]?.degree || "",
                major: data.education?.[0]?.fieldOfStudy || "",
                graduationYear: data.education?.[0]?.endYear || new Date().getFullYear(),
                cgpa: data.education?.[0]?.grade ? parseFloat(data.education[0].grade) : null,
                city: data.location?.city || "",
                country: data.location?.country || "",
                profileCompletionScore: data.profileCompletion || 0,
                isAvailable: data.isProfilePublic,
                resumeUrl: null,
                skills: data.skills?.map((skill: any) => ({
                    id: skill._id,
                    name: skill.name,
                    level: skill.level
                })) || [],
                education: data.education?.map((edu: any) => ({
                    id: edu._id,
                    institution: edu.institution,
                    degree: edu.degree,
                    fieldOfStudy: edu.fieldOfStudy || "",
                    startYear: edu.startYear || 0,
                    endYear: edu.endYear || null,
                    isCurrentlyStudying: edu.isCurrentlyStudying || false,
                    grade: edu.grade || null,
                    description: edu.description || null
                })) || [],
                experience: data.experience?.map((exp: any) => ({
                    id: exp._id,
                    title: exp.title,
                    company: exp.company || "",
                    employmentType: exp.employmentType || "Internship",
                    startDate: exp.startDate || "",
                    endDate: exp.endDate || null,
                    isCurrentlyWorking: exp.isCurrentlyWorking || false,
                    description: exp.description || "",
                    skills: exp.skills || []
                })) || [],
                projects: data.projects?.map((proj: any) => ({
                    id: proj._id,
                    title: proj.title,
                    description: proj.description || "",
                    techStack: proj.techStack || [],
                    projectUrl: proj.projectUrl || null,
                    githubUrl: proj.githubUrl || null,
                    thumbnailUrl: proj.thumbnailUrl || null,
                    startDate: proj.startDate || "",
                    endDate: proj.endDate || null
                })) || [],
                certificates: data.certificates?.map((cert: any) => ({
                    id: cert._id,
                    title: cert.title,
                    issuer: cert.issuer || "",
                    issueDate: cert.issueDate || "",
                    expiryDate: cert.expiryDate || null,
                    credentialId: cert.credentialId || null,
                    credentialUrl: cert.credentialUrl || null,
                    certificateImage: cert.certificateImage || null,
                    isNexInternCertificate: cert.isNexInternCertificate || false
                })) || [],
                socialLinks: data.socialLinks || {
                    linkedin: null,
                    github: null,
                    portfolio: null,
                    twitter: null
                },
                createdAt: data.createdAt,
                updatedAt: data.updatedAt
            };

            setProfile(transformedProfile);
        } catch (err: any) {
            console.error("Failed to load public profile:", err);
            setError(err.response?.data?.message || "Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4F46E5] mx-auto"></div>
                    <p className="mt-4 text-[#64748B]">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-[#EF4444]">{error || "Profile not found"}</p>
                    <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-[#4F46E5] text-white rounded-lg hover:bg-[#4338CA]">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

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
                                                src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${profile.profilePicture}`}
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
                        <AboutSection about={profile.about} />

                        <SkillsSection skills={profile.skills} />

                        <EducationSection
                            education={profile.education}
                        />

                        <ExperienceSection
                            experience={profile.experience}
                        />

                        <ProjectsSection
                            projects={profile.projects}
                        />

                        <CertificatesSection
                            certificates={profile.certificates}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
