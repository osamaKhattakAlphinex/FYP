'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProfileCompletionBanner from '@/components/student/profile/ProfileCompletionBanner'
import ProfileHeader from '@/components/student/profile/ProfileHeader'
import ProfileSidebar from '@/components/student/profile/ProfileSidebar'
import AboutSection from '@/components/student/profile/AboutSection'
import SkillsSection from '@/components/student/profile/SkillsSection'
import EducationSection from '@/components/student/profile/EducationSection'
import ExperienceSection from '@/components/student/profile/ExperienceSection'
import ProjectsSection from '@/components/student/profile/ProjectsSection'
import CertificatesSection from '@/components/student/profile/CertificatesSection'
import EditAboutModal from '@/components/student/profile/modals/EditAboutModal'
import EditSkillsModal from '@/components/student/profile/modals/EditSkillsModal'
import EditEducationModal from '@/components/student/profile/modals/EditEducationModal'
import EditExperienceModal from '@/components/student/profile/modals/EditExperienceModal'
import EditProjectModal from '@/components/student/profile/modals/EditProjectModal'
import EditCertificateModal from '@/components/student/profile/modals/EditCertificateModal'
import EditBasicInfoModal from '@/components/student/profile/modals/EditBasicInfoModal'
import EditSocialLinksModal from '@/components/student/profile/modals/EditSocialLinksModal'
import WhatsMissingModal from '@/components/student/profile/modals/WhatsMissingModal'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    StudentProfile,
    Education,
    Experience,
    Project,
    Certificate,
    Skill,
} from '@/types/student.types'
import { studentService } from '@/services/studentService'
import { useRoleProtection } from '@/hooks/useRoleProtection'

export default function StudentProfilePage() {
    useRoleProtection({ allowedRoles: ['student'] })

    const router = useRouter()
    const [profile, setProfile] = useState<StudentProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [showAbout, setShowAbout] = useState(false)
    const [showSkills, setShowSkills] = useState(false)
    const [showEducation, setShowEducation] = useState(false)
    const [showExperience, setShowExperience] = useState(false)
    const [showProject, setShowProject] = useState(false)
    const [showCertificate, setShowCertificate] = useState(false)
    const [showBasicInfo, setShowBasicInfo] = useState(false)
    const [showSocialLinks, setShowSocialLinks] = useState(false)
    const [showWhatsMissing, setShowWhatsMissing] = useState(false)

    const [editingEducation, setEditingEducation] = useState<Education | null>(null)
    const [editingExperience, setEditingExperience] = useState<Experience | null>(null)
    const [editingProject, setEditingProject] = useState<Project | null>(null)
    const [editingCertificate, setEditingCertificate] = useState<Certificate | null>(null)

    useEffect(() => {
        loadProfile()
    }, [])

    const loadProfile = async () => {
        try {
            setLoading(true)
            const data = await studentService.getProfile()
            const transformed: StudentProfile = {
                id: data._id,
                userId: data.userId,
                fullName: `${data.firstName} ${data.lastName}`,
                profilePicture: data.profilePicture || null,
                headline: data.headline || '',
                about: data.bio || '',
                university: data.education?.[0]?.institution || '',
                degree: data.education?.[0]?.degree || '',
                major: data.education?.[0]?.fieldOfStudy || '',
                graduationYear: data.education?.[0]?.endYear || new Date().getFullYear(),
                cgpa: data.education?.[0]?.grade ? parseFloat(data.education[0].grade) : null,
                city: data.location?.city || '',
                country: data.location?.country || '',
                profileCompletionScore: data.profileCompletion || 0,
                isAvailable: data.isProfilePublic,
                resumeUrl: data.resume?.url || null,
                skills:
                    data.skills?.map((s: any) => ({
                        id: s._id,
                        name: s.name,
                        level: s.level,
                    })) || [],
                education:
                    data.education?.map((e: any) => ({
                        id: e._id,
                        institution: e.institution,
                        degree: e.degree,
                        fieldOfStudy: e.fieldOfStudy || '',
                        startYear: e.startYear || 0,
                        endYear: e.endYear || null,
                        isCurrentlyStudying: e.isCurrentlyStudying || false,
                        grade: e.grade || null,
                        description: e.description || null,
                    })) || [],
                experience:
                    data.experience?.map((e: any) => ({
                        id: e._id,
                        title: e.title,
                        company: e.company || '',
                        employmentType: e.employmentType || 'Internship',
                        startDate: e.startDate || '',
                        endDate: e.endDate || null,
                        isCurrentlyWorking: e.isCurrentlyWorking || false,
                        description: e.description || '',
                        skills: e.skills || [],
                    })) || [],
                projects:
                    data.projects?.map((p: any) => ({
                        id: p._id,
                        title: p.title,
                        description: p.description || '',
                        techStack: p.techStack || [],
                        projectUrl: p.projectUrl || null,
                        githubUrl: p.githubUrl || null,
                        thumbnailUrl: p.thumbnailUrl || null,
                        startDate: p.startDate || '',
                        endDate: p.endDate || null,
                    })) || [],
                certificates:
                    data.certificates?.map((c: any) => ({
                        id: c._id,
                        title: c.title,
                        issuer: c.issuer || '',
                        issueDate: c.issueDate || '',
                        expiryDate: c.expiryDate || null,
                        credentialId: c.credentialId || null,
                        credentialUrl: c.credentialUrl || null,
                        certificateImage: c.certificateImage || null,
                        isNexInternCertificate: c.isNexInternCertificate || false,
                    })) || [],
                socialLinks:
                    data.socialLinks || {
                        linkedin: null,
                        github: null,
                        portfolio: null,
                        twitter: null,
                    },
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
            }
            setProfile(transformed)
        } catch (err: any) {
            setError(err.message || 'Failed to load profile')
            if (err.response?.status === 401) router.push('/login')
        } finally {
            setLoading(false)
        }
    }

    const handleToggleAvailability = async () => {
        if (!profile) return
        try {
            await studentService.updateProfileVisibility(!profile.isAvailable)
            setProfile({ ...profile, isAvailable: !profile.isAvailable })
        } catch (err) {
            // ignore
        }
    }

    const handleSaveAbout = async (about: string) => {
        await studentService.updateBasicInfo({ bio: about })
        await loadProfile()
    }
    const handleSaveSkills = async (skills: Omit<Skill, 'id'>[]) => {
        if (!profile) return
        for (const s of profile.skills) await studentService.deleteSkill(s.id)
        for (const s of skills) await studentService.addSkill(s)
        await loadProfile()
    }
    const handleSaveEducation = async (data: Omit<Education, 'id'>) => {
        if (editingEducation)
            await studentService.updateEducation(editingEducation.id, data)
        else await studentService.addEducation(data)
        await loadProfile()
    }
    const handleSaveExperience = async (data: Omit<Experience, 'id'>) => {
        if (editingExperience)
            await studentService.updateExperience(editingExperience.id, data)
        else await studentService.addExperience(data)
        await loadProfile()
    }
    const handleSaveProject = async (data: Omit<Project, 'id'>) => {
        if (editingProject)
            await studentService.updateProject(editingProject.id, data)
        else await studentService.addProject(data)
        await loadProfile()
    }
    const handleSaveCertificate = async (data: Omit<Certificate, 'id'>, file?: File) => {
        if (editingCertificate)
            await studentService.updateCertificate(editingCertificate.id, data, file)
        else await studentService.addCertificate(data, file)
        await loadProfile()
    }
    const handleSaveBasicInfo = async (data: any) => {
        await studentService.updateBasicInfo(data)
        await loadProfile()
    }
    const handleSaveSocialLinks = async (links: any) => {
        await studentService.updateSocialLinks(links)
        await loadProfile()
    }
    const handleUpdateAvatar = async (file: File) => {
        try {
            await studentService.uploadAvatar(file)
            await loadProfile()
        } catch {}
    }
    const handleUploadResume = async (file: File) => {
        await studentService.uploadResume(file)
        await loadProfile()
    }
    const handleDeleteResume = async () => {
        await studentService.deleteResume()
        await loadProfile()
    }

    const completionData = profile
        ? {
              hasBasicInfo:
                  !!(profile.fullName.split(' ')[0] && (profile.city || profile.country)),
              hasEducation: profile.education.length > 0,
              hasSkills: profile.skills.length >= 3,
              hasExperience: profile.experience.length > 0,
              hasProjects: profile.projects.length > 0,
              hasBio: !!profile.about,
              hasResume: !!profile.resumeUrl,
          }
        : {
              hasBasicInfo: false,
              hasEducation: false,
              hasSkills: false,
              hasExperience: false,
              hasProjects: false,
              hasBio: false,
              hasResume: false,
          }

    if (loading) {
        return (
            <div className="surface-canvas min-h-[calc(100vh-3.5rem)]">
                <div className="mx-auto max-w-[1128px] space-y-3 px-4 py-6 lg:px-6">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        )
    }

    if (error || !profile) {
        return (
            <div className="surface-canvas min-h-[calc(100vh-3.5rem)] grid place-items-center px-4">
                <Card className="w-full max-w-md p-8 text-center">
                    <p className="text-sm text-destructive">{error || 'Profile not found'}</p>
                    <Button onClick={loadProfile} className="mt-4">
                        Retry
                    </Button>
                </Card>
            </div>
        )
    }

    const nameParts = profile.fullName.split(' ')
    const basicInfoData = {
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        headline: profile.headline,
        phone: '',
        city: profile.city,
        country: profile.country,
    }

    return (
        <>
            <div className="surface-canvas min-h-[calc(100vh-3.5rem)]">
                <div className="mx-auto max-w-[1128px] px-4 py-6 lg:px-6">
                    <ProfileCompletionBanner
                        score={profile.profileCompletionScore}
                        onWhatsMissing={() => setShowWhatsMissing(true)}
                    />

                    <div className="mt-3">
                        <ProfileHeader
                            fullName={profile.fullName}
                            headline={profile.headline}
                            city={profile.city}
                            country={profile.country}
                            profilePicture={profile.profilePicture}
                            isAvailable={profile.isAvailable}
                            onToggleAvailability={handleToggleAvailability}
                            onUpdateAvatar={handleUpdateAvatar}
                            onEditHeadline={() => setShowBasicInfo(true)}
                            onEditProfile={() => setShowBasicInfo(true)}
                            studentId={profile.id}
                        />
                    </div>

                    <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                        <main className="space-y-3">
                            <AboutSection
                                about={profile.about}
                                isEditMode
                                onEdit={() => setShowAbout(true)}
                            />
                            <SkillsSection
                                skills={profile.skills}
                                isEditMode
                                onEdit={() => setShowSkills(true)}
                            />
                            <ExperienceSection
                                experience={profile.experience}
                                isEditMode
                                onEdit={(exp) => {
                                    setEditingExperience(exp)
                                    setShowExperience(true)
                                }}
                                onDelete={async (id) => {
                                    if (confirm('Delete this experience?')) {
                                        await studentService.deleteExperience(id)
                                        await loadProfile()
                                    }
                                }}
                                onAdd={() => {
                                    setEditingExperience(null)
                                    setShowExperience(true)
                                }}
                            />
                            <EducationSection
                                education={profile.education}
                                isEditMode
                                onEdit={(edu) => {
                                    setEditingEducation(edu)
                                    setShowEducation(true)
                                }}
                                onDelete={async (id) => {
                                    if (confirm('Delete this education?')) {
                                        await studentService.deleteEducation(id)
                                        await loadProfile()
                                    }
                                }}
                                onAdd={() => {
                                    setEditingEducation(null)
                                    setShowEducation(true)
                                }}
                            />
                            <ProjectsSection
                                projects={profile.projects}
                                isEditMode
                                onEdit={(proj) => {
                                    setEditingProject(proj)
                                    setShowProject(true)
                                }}
                                onDelete={async (id) => {
                                    if (confirm('Delete this project?')) {
                                        await studentService.deleteProject(id)
                                        await loadProfile()
                                    }
                                }}
                                onAdd={() => {
                                    setEditingProject(null)
                                    setShowProject(true)
                                }}
                            />
                            <CertificatesSection
                                certificates={profile.certificates}
                                isEditMode
                                onEdit={(cert) => {
                                    setEditingCertificate(cert)
                                    setShowCertificate(true)
                                }}
                                onDelete={async (id) => {
                                    if (confirm('Delete this certificate?')) {
                                        await studentService.deleteCertificate(id)
                                        await loadProfile()
                                    }
                                }}
                                onAdd={() => {
                                    setEditingCertificate(null)
                                    setShowCertificate(true)
                                }}
                                onDeleteImage={async (id) => {
                                    await studentService.deleteCertificateImage(id)
                                    await loadProfile()
                                }}
                            />
                        </main>

                        <aside className="hidden lg:block">
                            <div className="sticky top-[4.5rem]">
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
                                    onEditHeadline={() => setShowBasicInfo(true)}
                                    onEditProfile={() => setShowBasicInfo(true)}
                                    onEditSocialLinks={() => setShowSocialLinks(true)}
                                />
                            </div>
                        </aside>
                    </div>
                </div>
            </div>

            <EditAboutModal
                isOpen={showAbout}
                onClose={() => setShowAbout(false)}
                currentAbout={profile.about}
                onSave={handleSaveAbout}
            />
            <EditSkillsModal
                isOpen={showSkills}
                onClose={() => setShowSkills(false)}
                currentSkills={profile.skills}
                onSave={handleSaveSkills}
            />
            <EditEducationModal
                isOpen={showEducation}
                onClose={() => setShowEducation(false)}
                education={editingEducation}
                onSave={handleSaveEducation}
            />
            <EditExperienceModal
                isOpen={showExperience}
                onClose={() => setShowExperience(false)}
                experience={editingExperience}
                onSave={handleSaveExperience}
            />
            <EditProjectModal
                isOpen={showProject}
                onClose={() => setShowProject(false)}
                project={editingProject}
                onSave={handleSaveProject}
            />
            <EditCertificateModal
                isOpen={showCertificate}
                onClose={() => setShowCertificate(false)}
                certificate={editingCertificate}
                onSave={handleSaveCertificate}
            />
            <EditBasicInfoModal
                isOpen={showBasicInfo}
                onClose={() => setShowBasicInfo(false)}
                currentData={basicInfoData}
                resumeUrl={profile.resumeUrl}
                onSave={handleSaveBasicInfo}
                onUploadResume={handleUploadResume}
                onDeleteResume={handleDeleteResume}
            />
            <EditSocialLinksModal
                isOpen={showSocialLinks}
                onClose={() => setShowSocialLinks(false)}
                currentLinks={profile.socialLinks}
                onSave={handleSaveSocialLinks}
            />
            <WhatsMissingModal
                isOpen={showWhatsMissing}
                onClose={() => setShowWhatsMissing(false)}
                profileData={completionData}
                completionScore={profile.profileCompletionScore}
            />
        </>
    )
}
