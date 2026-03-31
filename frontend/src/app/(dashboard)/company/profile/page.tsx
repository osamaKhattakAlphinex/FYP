"use client";

import { useState } from 'react';
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

// Mock data - replace with actual API call
const mockProfile: CompanyProfile = {
    id: '1',
    userId: 'user1',
    companyName: 'TechVenture Pakistan',
    logo: null,
    coverImage: null,
    tagline: 'Building Pakistan\'s Digital Future',
    about: 'TechVenture Pakistan is a leading technology company focused on creating innovative solutions for local and international markets. We believe in empowering young talent and providing them with real-world experience through our micro-internship program.\n\nOur mission is to bridge the gap between education and industry by offering students hands-on projects that matter. We work with cutting-edge technologies and foster a culture of continuous learning and innovation.',
    industry: 'Technology',
    companySize: '51-200',
    founded: 2018,
    headquarters: 'Karachi, Pakistan',
    website: 'https://techventure.pk',
    email: 'contact@techventure.pk',
    phone: '+92 300 1234567',
    isVerified: true,
    verificationDate: '2024-01-15T00:00:00Z',
    profileCompletionScore: 85,
    status: 'Active',
    techStack: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'AWS', 'Docker'],
    perks: ['Remote Friendly', 'Flexible Hours', 'Mentorship Program', 'Certificate Issued'],
    socialLinks: {
        linkedin: 'https://linkedin.com/company/techventure',
        twitter: 'https://twitter.com/techventure',
        github: 'https://github.com/techventure',
        facebook: null
    },
    teamMembers: [
        {
            id: '1',
            name: 'Ahmed Khan',
            role: 'CTO',
            avatar: null,
            linkedinUrl: 'https://linkedin.com/in/ahmedkhan'
        },
        {
            id: '2',
            name: 'Sara Ali',
            role: 'HR Manager',
            avatar: null,
            linkedinUrl: 'https://linkedin.com/in/saraali'
        }
    ],
    activeTasks: 5,
    totalTasksPosted: 24,
    totalInterns: 48,
    avgRating: 4.7,
    totalReviews: 32,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-03-15T00:00:00Z'
};

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
    const [profile, setProfile] = useState<CompanyProfile>(mockProfile);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const showSuccessToast = (message: string) => {
        setToastMessage(message);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const handleUpdateProfile = (updates: Partial<CompanyProfile>) => {
        setProfile({ ...profile, ...updates });
        showSuccessToast('Company info updated successfully');
    };

    const handleUpdateAbout = (data: { about: string; tagline: string }) => {
        setProfile({ ...profile, ...data });
        showSuccessToast('Company info updated successfully');
    };

    const handleUpdateTechStack = (techStack: string[]) => {
        setProfile({ ...profile, techStack });
        showSuccessToast('Tech stack updated successfully');
    };

    const handleUpdatePerks = (perks: string[]) => {
        setProfile({ ...profile, perks });
        showSuccessToast('Company info updated successfully');
    };

    const handleUpdateTeam = (teamMembers: TeamMember[]) => {
        setProfile({ ...profile, teamMembers });
        showSuccessToast(teamMembers.length > profile.teamMembers.length ? 'Team member added' : 'Team member removed');
    };

    const handleUpdateSocial = (socialLinks: CompanySocialLinks) => {
        setProfile({ ...profile, socialLinks });
        showSuccessToast('Social links updated successfully');
    };

    const handleUpdateLogo = (logo: string) => {
        setProfile({ ...profile, logo });
        showSuccessToast('Logo updated');
    };

    const handleUpdateCover = () => {
        // In real app, open file picker
        showSuccessToast('Cover image updated');
    };

    const handleRequestVerification = () => {
        showSuccessToast('Verification request submitted — we\'ll review within 2-3 business days');
    };

    const handleCompleteProfile = () => {
        // Scroll to first incomplete section or show modal
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

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
