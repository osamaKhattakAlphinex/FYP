"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProfileCompletionBanner from "@/components/student/profile/ProfileCompletionBanner";
import ProfileSidebar from "@/components/student/profile/ProfileSidebar";
import AboutSection from "@/components/student/profile/AboutSection";
import SkillsSection from "@/components/student/profile/SkillsSection";
import EducationSection from "@/components/student/profile/EducationSection";
import ExperienceSection from "@/components/student/profile/ExperienceSection";
import ProjectsSection from "@/components/student/profile/ProjectsSection";
import CertificatesSection from "@/components/student/profile/CertificatesSection";
import EditAboutModal from "@/components/student/profile/modals/EditAboutModal";
import EditSkillsModal from "@/components/student/profile/modals/EditSkillsModal";
import EditEducationModal from "@/components/student/profile/modals/EditEducationModal";
import EditExperienceModal from "@/components/student/profile/modals/EditExperienceModal";
import EditProjectModal from "@/components/student/profile/modals/EditProjectModal";
import EditCertificateModal from "@/components/student/profile/modals/EditCertificateModal";
import EditBasicInfoModal from "@/components/student/profile/modals/EditBasicInfoModal";
import EditSocialLinksModal from "@/components/student/profile/modals/EditSocialLinksModal";
import WhatsMissingModal from "@/components/student/profile/modals/WhatsMissingModal";
import { StudentProfile, Education, Experience, Project, Certificate, Skill } from "@/types/student.types";
import { studentService } from "@/services/studentService";
import { useRoleProtection } from '@/hooks/useRoleProtection';

export default function StudentProfilePage() {
    // Protect this route - only students can access
    useRoleProtection({ allowedRoles: ['student'] });

    const router = useRouter();
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [showSkillsModal, setShowSkillsModal] = useState(false);
    const [showEducationModal, setShowEducationModal] = useState(false);
    const [showExperienceModal, setShowExperienceModal] = useState(false);
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [showCertificateModal, setShowCertificateModal] = useState(false);
    const [showBasicInfoModal, setShowBasicInfoModal] = useState(false);
    const [showSocialLinksModal, setShowSocialLinksModal] = useState(false);
    const [showWhatsMissingModal, setShowWhatsMissingModal] = useState(false);

    // Edit states
    const [editingEducation, setEditingEducation] = useState<Education | null>(null);
    const [editingExperience, setEditingExperience] = useState<Experience | null>(null);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [editingCertificate, setEditingCertificate] = useState<Certificate | null>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const data = await studentService.getProfile();

            // Transform backend data to frontend format
            const transformedProfile: StudentProfile = {
                id: data._id,
                userId: data.userId,
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
                resumeUrl: data.resume?.url || null,
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
            console.error("Failed to load profile:", err);
            setError(err.message || "Failed to load profile");

            if (err.response?.status === 401) {
                router.push("/login");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleToggleAvailability = async () => {
        if (!profile) return;
        try {
            await studentService.updateProfileVisibility(!profile.isAvailable);
            setProfile({ ...profile, isAvailable: !profile.isAvailable });
        } catch (err) {
            console.error("Failed to update availability:", err);
        }
    };

    const handleSaveAbout = async (about: string) => {
        await studentService.updateBasicInfo({ bio: about });
        await loadProfile();
    };

    const handleSaveSkills = async (skills: Omit<Skill, "id">[]) => {
        if (!profile) return;
        for (const skill of profile.skills) {
            await studentService.deleteSkill(skill.id);
        }
        for (const skill of skills) {
            await studentService.addSkill(skill);
        }
        await loadProfile();
    };

    const handleSaveEducation = async (data: Omit<Education, "id">) => {
        if (editingEducation) {
            await studentService.updateEducation(editingEducation.id, data);
        } else {
            await studentService.addEducation(data);
        }
        await loadProfile();
    };

    const handleSaveExperience = async (data: Omit<Experience, "id">) => {
        if (editingExperience) {
            await studentService.updateExperience(editingExperience.id, data);
        } else {
            await studentService.addExperience(data);
        }
        await loadProfile();
    };

    const handleSaveProject = async (data: Omit<Project, "id">) => {
        if (editingProject) {
            await studentService.updateProject(editingProject.id, data);
        } else {
            await studentService.addProject(data);
        }
        await loadProfile();
    };

    const handleSaveCertificate = async (data: Omit<Certificate, "id">, file?: File) => {
        if (editingCertificate) {
            await studentService.updateCertificate(editingCertificate.id, data, file);
        } else {
            await studentService.addCertificate(data, file);
        }
        await loadProfile();
    };

    const handleSaveBasicInfo = async (data: any) => {
        await studentService.updateBasicInfo(data);
        await loadProfile();
    };

    const handleSaveSocialLinks = async (links: any) => {
        await studentService.updateSocialLinks(links);
        await loadProfile();
    };

    const handleUpdateAvatar = async (file: File) => {
        try {
            await studentService.uploadAvatar(file);
            await loadProfile();
        } catch (error) {
            console.error("Failed to upload avatar:", error);
        }
    };

    const handleUploadResume = async (file: File) => {
        await studentService.uploadResume(file);
        await loadProfile();
    };

    const handleDeleteResume = async () => {
        await studentService.deleteResume();
        await loadProfile();
    };

    // Calculate what's missing for the modal
    const getProfileCompletionData = () => {
        if (!profile) return {
            hasBasicInfo: false,
            hasEducation: false,
            hasSkills: false,
            hasExperience: false,
            hasProjects: false,
            hasBio: false,
            hasResume: false
        };

        const nameParts = profile.fullName.split(" ");
        const hasBasicInfo = !!(nameParts[0] && nameParts.length > 1 && (profile.city || profile.country));
        const hasEducation = profile.education.length > 0;
        const hasSkills = profile.skills.length >= 3;
        const hasExperience = profile.experience.length > 0;
        const hasProjects = profile.projects.length > 0;
        const hasBio = !!profile.about && profile.about.length > 0;
        const hasResume = !!profile.resumeUrl;

        return {
            hasBasicInfo,
            hasEducation,
            hasSkills,
            hasExperience,
            hasProjects,
            hasBio,
            hasResume
        };
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
                    <button onClick={loadProfile} className="mt-4 px-4 py-2 bg-[#4F46E5] text-white rounded-lg hover:bg-[#4338CA]">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const nameParts = profile.fullName.split(" ");
    const basicInfoData = {
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        headline: profile.headline,
        phone: "",
        city: profile.city,
        country: profile.country
    };

    return (
        <>
            <div className="min-h-screen bg-[#F8FAFC] py-8">
                <div className="max-w-[1200px] mx-auto px-8">
                    <ProfileCompletionBanner score={profile.profileCompletionScore} onWhatsMissing={() => setShowWhatsMissingModal(true)} />

                    <div className="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-6">
                        <div>
                            <ProfileSidebar
                                fullName={profile.fullName}
                                headline={profile.headline}
                                city={profile.city}
                                country={profile.country}
                                profilePicture={profile.profilePicture}
                                isAvailable={profile.isAvailable}
                                university={profile.university}
                                degree={profile.degree}
                                major={profile.major}
                                graduationYear={profile.graduationYear}
                                cgpa={profile.cgpa}
                                profileViews={0}
                                tasksApplied={0}
                                tasksCompleted={0}
                                socialLinks={profile.socialLinks}
                                studentId={profile.id}
                                onToggleAvailability={handleToggleAvailability}
                                onUpdateAvatar={handleUpdateAvatar}
                                onEditHeadline={() => setShowBasicInfoModal(true)}
                                onEditProfile={() => setShowBasicInfoModal(true)}
                                onEditSocialLinks={() => setShowSocialLinksModal(true)}
                            />
                        </div>

                        <div className="space-y-4">
                            <AboutSection about={profile.about} isEditMode={true} onEdit={() => setShowAboutModal(true)} />
                            <SkillsSection skills={profile.skills} isEditMode={true} onEdit={() => setShowSkillsModal(true)} />
                            <EducationSection
                                education={profile.education}
                                isEditMode={true}
                                onEdit={(edu) => { setEditingEducation(edu); setShowEducationModal(true); }}
                                onDelete={async (id) => { if (confirm("Delete this education?")) { await studentService.deleteEducation(id); await loadProfile(); } }}
                                onAdd={() => { setEditingEducation(null); setShowEducationModal(true); }}
                            />
                            <ExperienceSection
                                experience={profile.experience}
                                isEditMode={true}
                                onEdit={(exp) => { setEditingExperience(exp); setShowExperienceModal(true); }}
                                onDelete={async (id) => { if (confirm("Delete this experience?")) { await studentService.deleteExperience(id); await loadProfile(); } }}
                                onAdd={() => { setEditingExperience(null); setShowExperienceModal(true); }}
                            />
                            <ProjectsSection
                                projects={profile.projects}
                                isEditMode={true}
                                onEdit={(proj) => { setEditingProject(proj); setShowProjectModal(true); }}
                                onDelete={async (id) => { if (confirm("Delete this project?")) { await studentService.deleteProject(id); await loadProfile(); } }}
                                onAdd={() => { setEditingProject(null); setShowProjectModal(true); }}
                            />
                            <CertificatesSection
                                certificates={profile.certificates}
                                isEditMode={true}
                                onEdit={(cert) => { setEditingCertificate(cert); setShowCertificateModal(true); }}
                                onDelete={async (id) => { if (confirm("Delete this certificate?")) { await studentService.deleteCertificate(id); await loadProfile(); } }}
                                onAdd={() => { setEditingCertificate(null); setShowCertificateModal(true); }}
                                onDeleteImage={async (id) => { await studentService.deleteCertificateImage(id); await loadProfile(); }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <EditAboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} currentAbout={profile.about} onSave={handleSaveAbout} />
            <EditSkillsModal isOpen={showSkillsModal} onClose={() => setShowSkillsModal(false)} currentSkills={profile.skills} onSave={handleSaveSkills} />
            <EditEducationModal isOpen={showEducationModal} onClose={() => setShowEducationModal(false)} education={editingEducation} onSave={handleSaveEducation} />
            <EditExperienceModal isOpen={showExperienceModal} onClose={() => setShowExperienceModal(false)} experience={editingExperience} onSave={handleSaveExperience} />
            <EditProjectModal isOpen={showProjectModal} onClose={() => setShowProjectModal(false)} project={editingProject} onSave={handleSaveProject} />
            <EditCertificateModal isOpen={showCertificateModal} onClose={() => setShowCertificateModal(false)} certificate={editingCertificate} onSave={handleSaveCertificate} />
            <EditBasicInfoModal isOpen={showBasicInfoModal} onClose={() => setShowBasicInfoModal(false)} currentData={basicInfoData} resumeUrl={profile.resumeUrl} onSave={handleSaveBasicInfo} onUploadResume={handleUploadResume} onDeleteResume={handleDeleteResume} />
            <EditSocialLinksModal isOpen={showSocialLinksModal} onClose={() => setShowSocialLinksModal(false)} currentLinks={profile.socialLinks} onSave={handleSaveSocialLinks} />
            <WhatsMissingModal isOpen={showWhatsMissingModal} onClose={() => setShowWhatsMissingModal(false)} profileData={getProfileCompletionData()} completionScore={profile.profileCompletionScore} />
        </>
    );
}
