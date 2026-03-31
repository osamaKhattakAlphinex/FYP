"use client";

import { useState } from "react";
import ProfileCompletionBanner from "@/components/student/profile/ProfileCompletionBanner";
import ProfileSidebar from "@/components/student/profile/ProfileSidebar";
import AboutSection from "@/components/student/profile/AboutSection";
import SkillsSection from "@/components/student/profile/SkillsSection";
import EducationSection from "@/components/student/profile/EducationSection";
import ExperienceSection from "@/components/student/profile/ExperienceSection";
import ProjectsSection from "@/components/student/profile/ProjectsSection";
import CertificatesSection from "@/components/student/profile/CertificatesSection";
import { StudentProfile } from "@/types/student.types";

// Mock data - replace with actual API calls
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

export default function StudentProfilePage() {
    const [profile, setProfile] = useState<StudentProfile>(mockProfile);

    const handleToggleAvailability = () => {
        setProfile({ ...profile, isAvailable: !profile.isAvailable });
    };

    const handleUpdateAvatar = (file: File) => {
        console.log("Upload avatar:", file);
        // Implement avatar upload logic
    };

    const handleEditHeadline = () => {
        console.log("Edit headline");
        // Open edit modal
    };

    const handleEditProfile = () => {
        console.log("Edit profile");
        // Open edit modal
    };

    const handleEditSocialLinks = () => {
        console.log("Edit social links");
        // Open edit modal
    };

    const handleWhatsMissing = () => {
        console.log("Show what's missing");
        // Show modal with missing profile sections
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] py-8">
            <div className="max-w-[1200px] mx-auto px-8">
                <ProfileCompletionBanner
                    score={profile.profileCompletionScore}
                    onWhatsMissing={handleWhatsMissing}
                />

                <div className="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-6">
                    {/* Left Sidebar */}
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
                            profileViews={245}
                            tasksApplied={12}
                            tasksCompleted={3}
                            socialLinks={profile.socialLinks}
                            studentId={profile.id}
                            onToggleAvailability={handleToggleAvailability}
                            onUpdateAvatar={handleUpdateAvatar}
                            onEditHeadline={handleEditHeadline}
                            onEditProfile={handleEditProfile}
                            onEditSocialLinks={handleEditSocialLinks}
                        />
                    </div>

                    {/* Right Content */}
                    <div className="space-y-4">
                        <AboutSection about={profile.about} onEdit={() => console.log("Edit about")} />

                        <SkillsSection skills={profile.skills} onEdit={() => console.log("Edit skills")} />

                        <EducationSection
                            education={profile.education}
                            onEdit={(edu) => console.log("Edit education", edu)}
                            onDelete={(id) => console.log("Delete education", id)}
                            onAdd={() => console.log("Add education")}
                        />

                        <ExperienceSection
                            experience={profile.experience}
                            onEdit={(exp) => console.log("Edit experience", exp)}
                            onDelete={(id) => console.log("Delete experience", id)}
                            onAdd={() => console.log("Add experience")}
                        />

                        <ProjectsSection
                            projects={profile.projects}
                            onEdit={(proj) => console.log("Edit project", proj)}
                            onDelete={(id) => console.log("Delete project", id)}
                            onAdd={() => console.log("Add project")}
                        />

                        <CertificatesSection
                            certificates={profile.certificates}
                            onEdit={(cert) => console.log("Edit certificate", cert)}
                            onDelete={(id) => console.log("Delete certificate", id)}
                            onAdd={() => console.log("Add certificate")}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
