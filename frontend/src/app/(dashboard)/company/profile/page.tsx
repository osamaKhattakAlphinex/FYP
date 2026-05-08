"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import CompanyProfileCompletionBanner from '@/components/company/profile/CompanyProfileCompletionBanner';
import CompanyProfileHeader from '@/components/company/profile/CompanyProfileHeader';
import AboutSection from '@/components/company/profile/AboutSection';
import CompanyInfoSection from '@/components/company/profile/CompanyInfoSection';
import CompanyCultureSection from '@/components/company/profile/CompanyCultureSection';
import CompanyTeamSection from '@/components/company/profile/CompanyTeamSection';
import CompanySidebar from '@/components/company/profile/CompanySidebar';
import type { CompanyProfile, CompanySocialLinks, TeamMember, CompanyTask } from '@/types/company.types';
import { companyService } from '@/services/companyService';
import { useRoleProtection } from '@/hooks/useRoleProtection';

// Mock tasks - will be replaced with actual API later
const mockTasks: CompanyTask[] = [
    {
        id: '1',
        title: 'Build a React Dashboard Component',
        skills: ['React', 'TypeScript'],
        applicants: 12,
        deadline: '2026-04-15T00:00:00Z',
        status: 'Active'
    },
    {
        id: '2',
        title: 'API Integration for Mobile App',
        skills: ['Node.js', 'Express'],
        applicants: 8,
        deadline: '2026-04-10T00:00:00Z',
        status: 'Active'
    },
    {
        id: '3',
        title: 'Database Schema Design',
        skills: ['PostgreSQL', 'SQL'],
        applicants: 5,
        deadline: '2026-04-02T00:00:00Z',
        status: 'Active'
    }
];

export default function CompanyProfilePage() {
    // Protect this route - only companies can access
    useRoleProtection({ allowedRoles: ['company'] });

    const router = useRouter();
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const data = await companyService.getProfile();

            // Transform backend data to frontend format
            const transformedProfile: CompanyProfile = {
                id: data._id,
                userId: data.userId,
                companyName: data.companyName,
                logo: data.logo || null,
                coverImage: data.coverImage || null,
                tagline: data.description?.substring(0, 100) || '',
                about: data.description || '',
                industry: data.industry,
                companySize: data.companySize,
                founded: data.foundedYear || null,
                headquarters: data.location?.city && data.location?.country
                    ? `${data.location.city}, ${data.location.country}`
                    : '',
                website: data.website || null,
                email: data.contactInfo?.email || '',
                phone: data.contactInfo?.phone || null,
                isVerified: data.verification?.isVerified || false,
                verificationDate: data.verification?.verifiedAt || null,
                profileCompletionScore: data.profileCompletion || 0,
                status: 'Active',
                techStack: data.culture?.values || [],
                perks: data.culture?.benefits || [],
                socialLinks: {
                    linkedin: data.socialLinks?.linkedin || null,
                    twitter: data.socialLinks?.twitter || null,
                    github: null,
                    facebook: data.socialLinks?.facebook || null
                },
                teamMembers: data.team?.map((member: any) => ({
                    id: member._id,
                    name: member.name,
                    role: member.designation,
                    avatar: member.avatar || null,
                    linkedinUrl: member.linkedIn || null
                })) || [],
                activeTasks: data.stats?.activeTasks || 0,
                totalTasksPosted: data.stats?.completedTasks || 0,
                totalInterns: data.stats?.hiredCandidates || 0,
                avgRating: data.stats?.averageRating || 0,
                totalReviews: data.stats?.totalRatings || 0,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt
            };

            setProfile(transformedProfile);
        } catch (err: any) {
            console.error('Failed to load company profile:', err);
            setError(err.response?.data?.message || 'Failed to load profile');

            if (err.response?.status === 401) {
                router.push('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const showSuccessToast = (message: string) => {
        setToastMessage(message);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const handleUpdateProfile = async (updates: Partial<CompanyProfile>) => {
        try {
            // Map frontend fields to backend fields
            const backendData: any = {};

            if (updates.companyName) backendData.companyName = updates.companyName;
            if (updates.companySize) backendData.companySize = updates.companySize;
            if (updates.industry) backendData.industry = updates.industry;
            if (updates.founded) backendData.foundedYear = updates.founded;
            if (updates.website) backendData.website = updates.website;
            if (updates.about) backendData.description = updates.about;

            if (updates.headquarters) {
                const [city, country] = updates.headquarters.split(', ');
                backendData.location = { city, country };
            }

            await companyService.updateBasicInfo(backendData);
            await loadProfile();
            showSuccessToast('Company info updated successfully');
        } catch (error) {
            console.error('Failed to update profile:', error);
            showSuccessToast('Failed to update profile');
        }
    };

    const handleUpdateAbout = async (data: { about: string; tagline: string }) => {
        try {
            await companyService.updateBasicInfo({ description: data.about });
            await loadProfile();
            showSuccessToast('Company info updated successfully');
        } catch (error) {
            console.error('Failed to update about:', error);
            showSuccessToast('Failed to update about');
        }
    };

    const handleUpdateTechStack = async (techStack: string[]) => {
        try {
            await companyService.updateCulture({ values: techStack });
            await loadProfile();
            showSuccessToast('Tech stack updated successfully');
        } catch (error) {
            console.error('Failed to update tech stack:', error);
            showSuccessToast('Failed to update tech stack');
        }
    };

    const handleUpdatePerks = async (perks: string[]) => {
        try {
            await companyService.updateCulture({ benefits: perks });
            await loadProfile();
            showSuccessToast('Company info updated successfully');
        } catch (error) {
            console.error('Failed to update perks:', error);
            showSuccessToast('Failed to update perks');
        }
    };

    const handleUpdateTeam = async (teamMembers: TeamMember[], avatarFile?: File | null) => {
        if (!profile) return;

        try {
            // Upload avatar if provided
            let avatarUrl: string | null = null;
            if (avatarFile) {
                const uploadResult = await companyService.uploadTeamMemberAvatar(avatarFile);
                avatarUrl = uploadResult.data.avatar;
            }

            // Update team members with the uploaded avatar URL
            const updatedMembers = teamMembers.map(m => {
                if (m.avatar === 'uploading' && avatarUrl) {
                    return { ...m, avatar: avatarUrl };
                }
                return m;
            });

            // Determine what changed
            const currentIds = profile.teamMembers.map(m => m.id);
            const newIds = updatedMembers.map(m => m.id);

            // Find added members (new IDs or IDs that look like timestamps)
            const addedMembers = updatedMembers.filter(m =>
                !currentIds.includes(m.id) || m.id.length > 20 // timestamp IDs are long
            );

            // Find deleted members
            const deletedIds = currentIds.filter(id => !newIds.includes(id));

            // Find updated members
            const updatedMembersList = updatedMembers.filter(m => {
                const original = profile.teamMembers.find(om => om.id === m.id);
                return original && (
                    original.name !== m.name ||
                    original.role !== m.role ||
                    original.avatar !== m.avatar ||
                    original.linkedinUrl !== m.linkedinUrl
                );
            });

            // Process deletions
            for (const id of deletedIds) {
                await companyService.deleteTeamMember(id);
            }

            // Process additions
            for (const member of addedMembers) {
                await companyService.addTeamMember({
                    name: member.name,
                    role: member.role,
                    avatar: member.avatar,
                    linkedinUrl: member.linkedinUrl
                });
            }

            // Process updates
            for (const member of updatedMembersList) {
                await companyService.updateTeamMember(member.id, {
                    name: member.name,
                    role: member.role,
                    avatar: member.avatar,
                    linkedinUrl: member.linkedinUrl
                });
            }

            await loadProfile();
            showSuccessToast(
                addedMembers.length > 0 ? 'Team member added' :
                    deletedIds.length > 0 ? 'Team member removed' :
                        'Team member updated'
            );
        } catch (error) {
            console.error('Failed to update team:', error);
            showSuccessToast('Failed to update team');
        }
    };

    const handleUpdateSocial = async (socialLinks: CompanySocialLinks) => {
        try {
            await companyService.updateSocialLinks(socialLinks);
            await loadProfile();
            showSuccessToast('Social links updated successfully');
        } catch (error) {
            console.error('Failed to update social links:', error);
            showSuccessToast('Failed to update social links');
        }
    };

    const handleUpdateLogo = async (file: File) => {
        try {
            await companyService.uploadLogo(file);
            await loadProfile();
            showSuccessToast('Logo updated');
        } catch (error) {
            console.error('Failed to upload logo:', error);
            showSuccessToast('Failed to upload logo');
        }
    };

    const handleUpdateCover = async (file: File) => {
        try {
            await companyService.uploadCoverImage(file);
            await loadProfile();
            showSuccessToast('Cover image updated');
        } catch (error) {
            console.error('Failed to upload cover:', error);
            showSuccessToast('Failed to upload cover');
        }
    };

    const handleRequestVerification = () => {
        showSuccessToast('Verification request submitted — we\'ll review within 2-3 business days');
    };

    const handleCompleteProfile = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
                    <p className="text-[#EF4444]">{error || 'Profile not found'}</p>
                    <button onClick={loadProfile} className="mt-4 px-4 py-2 bg-[#4F46E5] text-white rounded-lg hover:bg-[#4338CA]">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Profile Completion Banner */}
            <CompanyProfileCompletionBanner
                score={profile.profileCompletionScore}
                onComplete={handleCompleteProfile}
            />

            {/* Profile Header */}
            <CompanyProfileHeader
                profile={profile}
                isEditMode={true}
                onEditCover={handleUpdateCover}
                onEditLogo={handleUpdateLogo}
                onEditInfo={() => { }}
            />

            {/* Main Content */}
            <div className="max-w-[1200px] mx-auto px-8 py-8">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Column - Main Content */}
                    <div className="flex-1 space-y-4">
                        <AboutSection
                            about={profile.about}
                            tagline={profile.tagline}
                            techStack={profile.techStack}
                            isEditMode={true}
                            onUpdateAbout={handleUpdateAbout}
                            onUpdateTechStack={handleUpdateTechStack}
                        />

                        <CompanyInfoSection
                            profile={profile}
                            isEditMode={true}
                            onUpdate={handleUpdateProfile}
                        />

                        <CompanyCultureSection
                            perks={profile.perks}
                            isEditMode={true}
                            onUpdate={handleUpdatePerks}
                        />

                        <CompanyTeamSection
                            teamMembers={profile.teamMembers}
                            isEditMode={true}
                            onUpdate={handleUpdateTeam}
                        />
                    </div>

                    {/* Right Column - Sidebar */}
                    <div className="lg:w-[380px]">
                        <div className="lg:sticky lg:top-[88px] space-y-4">
                            <CompanySidebar
                                profile={profile}
                                tasks={mockTasks}
                                isEditMode={true}
                                onUpdateSocial={handleUpdateSocial}
                                onRequestVerification={handleRequestVerification}
                            />

                            {/* View Public Profile Link */}
                            <Link
                                href={`/company/${profile.id}`}
                                target="_blank"
                                className="flex items-center justify-center gap-2 w-full bg-white border border-[#E2E8F0] text-[#475569] text-sm font-medium py-3 rounded-xl hover:border-[#4F46E5] hover:text-[#4F46E5] transition-all duration-200"
                            >
                                <ExternalLink className="w-4 h-4" />
                                <span>View Public Profile</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toast Notification */}
            {showToast && (
                <div className="fixed bottom-6 right-6 bg-[#0F172A] text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up z-50">
                    <div className="w-5 h-5 bg-[#10B981] rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <span className="text-sm font-medium">{toastMessage}</span>
                </div>
            )}
        </div>
    );
}
