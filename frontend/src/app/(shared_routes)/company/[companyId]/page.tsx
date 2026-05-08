"use client";

import { useState, useEffect } from 'react';
import { Heart, Briefcase, Star, Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { companyService } from '@/services/companyService';
import CompanyProfileHeader from '@/components/company/profile/CompanyProfileHeader';
import AboutSection from '@/components/company/profile/AboutSection';
import CompanyInfoSection from '@/components/company/profile/CompanyInfoSection';
import CompanyCultureSection from '@/components/company/profile/CompanyCultureSection';
import CompanyTeamSection from '@/components/company/profile/CompanyTeamSection';
import CompanyStatsPanel from '@/components/company/profile/CompanyStatsPanel';
import ActiveTasksPreview from '@/components/company/profile/ActiveTasksPreview';
import SectionCard from '@/components/shared/SectionCard';
import type { CompanyProfile, CompanyReview, CompanyTask } from '@/types/company.types';

// Transform backend company data to frontend format
const transformCompanyData = (backendData: any): CompanyProfile => {
    return {
        id: backendData._id,
        userId: backendData.userId,
        companyName: backendData.companyName,
        logo: backendData.logo,
        coverImage: backendData.coverImage,
        tagline: backendData.culture?.workEnvironment || backendData.companyName || '',
        about: backendData.description || '',
        industry: backendData.industry,
        companySize: backendData.companySize,
        founded: backendData.foundedYear,
        headquarters: backendData.location ?
            `${backendData.location.city || ''}${backendData.location.city && backendData.location.country ? ', ' : ''}${backendData.location.country || ''}`.trim() || 'Not specified' : 'Not specified',
        website: backendData.website,
        email: backendData.contactInfo?.email || '',
        phone: backendData.contactInfo?.phone || '',
        isVerified: backendData.verification?.isVerified || false,
        verificationDate: backendData.verification?.verifiedAt || null,
        profileCompletionScore: backendData.profileCompletion || 0,
        status: 'Active' as const,
        techStack: backendData.culture?.values || [], // Using values as tech stack for now
        perks: backendData.culture?.benefits || [],
        socialLinks: {
            linkedin: backendData.socialLinks?.linkedin || null,
            twitter: backendData.socialLinks?.twitter || null,
            github: null, // Not available in backend model
            facebook: backendData.socialLinks?.facebook || null
        },
        teamMembers: (backendData.team || []).map((member: any, index: number) => ({
            id: member._id || index.toString(),
            name: member.name || 'Team Member',
            role: member.designation || 'Team Member',
            avatar: member.avatar,
            linkedinUrl: member.linkedIn
        })),
        activeTasks: backendData.stats?.activeTasks || 0,
        totalTasksPosted: (backendData.stats?.completedTasks || 0) + (backendData.stats?.activeTasks || 0),
        totalInterns: backendData.stats?.hiredCandidates || 0,
        avgRating: backendData.stats?.averageRating || 0,
        totalReviews: backendData.stats?.totalRatings || 0,
        createdAt: backendData.createdAt,
        updatedAt: backendData.updatedAt
    };
};

// Mock data for tasks and reviews (until backend endpoints are available)
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
    },
    {
        id: '4',
        title: 'UI/UX Design for Landing Page',
        skills: ['Figma', 'Design'],
        applicants: 15,
        deadline: '2026-04-20T00:00:00Z',
        status: 'Active'
    },
    {
        id: '5',
        title: 'Write Technical Documentation',
        skills: ['Technical Writing'],
        applicants: 6,
        deadline: '2026-04-18T00:00:00Z',
        status: 'Active'
    }
];

const mockReviews: CompanyReview[] = [
    {
        id: '1',
        studentName: 'Ali Hassan',
        studentAvatar: null,
        taskTitle: 'React Dashboard Component',
        rating: 5,
        comment: 'Excellent mentorship and clear requirements. The team was very supportive throughout the project. I learned a lot about React best practices and component architecture.',
        createdAt: '2024-03-10T00:00:00Z'
    },
    {
        id: '2',
        studentName: 'Fatima Ahmed',
        studentAvatar: null,
        taskTitle: 'API Integration',
        rating: 4,
        comment: 'Great experience working with TechVenture. The project was challenging but rewarding. Would definitely recommend to other students.',
        createdAt: '2024-03-05T00:00:00Z'
    },
    {
        id: '3',
        studentName: 'Usman Khan',
        studentAvatar: null,
        taskTitle: 'Database Design',
        rating: 5,
        comment: 'Professional environment and real-world project experience. The feedback was constructive and helped me improve my skills significantly.',
        createdAt: '2024-02-28T00:00:00Z'
    }
];

export default function PublicCompanyProfilePage() {
    const params = useParams();
    const [isFollowing, setIsFollowing] = useState(false);
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCompanyProfile = async () => {
            try {
                setLoading(true);
                setError(null);

                const companyId = params.companyId as string;
                const backendData = await companyService.getPublicProfile(companyId);
                const transformedProfile = transformCompanyData(backendData);

                setProfile(transformedProfile);
            } catch (err: any) {
                console.error('Error fetching company profile:', err);
                setError(err.response?.data?.message || 'Failed to load company profile');
            } finally {
                setLoading(false);
            }
        };

        if (params.companyId) {
            fetchCompanyProfile();
        }
    }, [params.companyId]);

    const handleFollowToggle = () => {
        setIsFollowing(!isFollowing);
    };

    const handleViewTasks = () => {
        document.getElementById('active-tasks')?.scrollIntoView({ behavior: 'smooth' });
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getRatingBreakdown = () => {
        if (!profile || profile.totalReviews === 0) {
            return [
                { stars: 5, count: 0, percentage: 0 },
                { stars: 4, count: 0, percentage: 0 },
                { stars: 3, count: 0, percentage: 0 },
                { stars: 2, count: 0, percentage: 0 },
                { stars: 1, count: 0, percentage: 0 }
            ];
        }

        // Mock rating breakdown based on average rating
        const avgRating = profile.avgRating;
        const totalReviews = profile.totalReviews;

        // Simple distribution based on average rating
        const fiveStars = Math.round(totalReviews * (avgRating >= 4.5 ? 0.7 : avgRating >= 4 ? 0.5 : 0.3));
        const fourStars = Math.round(totalReviews * (avgRating >= 4 ? 0.3 : 0.4));
        const threeStars = Math.round(totalReviews * 0.15);
        const twoStars = Math.round(totalReviews * 0.05);
        const oneStars = totalReviews - fiveStars - fourStars - threeStars - twoStars;

        return [
            { stars: 5, count: fiveStars, percentage: (fiveStars / totalReviews) * 100 },
            { stars: 4, count: fourStars, percentage: (fourStars / totalReviews) * 100 },
            { stars: 3, count: threeStars, percentage: (threeStars / totalReviews) * 100 },
            { stars: 2, count: twoStars, percentage: (twoStars / totalReviews) * 100 },
            { stars: 1, count: oneStars, percentage: (oneStars / totalReviews) * 100 }
        ];
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
                <div className="flex items-center gap-3 text-[#64748B]">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Loading company profile...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">😞</div>
                    <h1 className="text-2xl font-bold text-[#0F172A] mb-2">Company Not Found</h1>
                    <p className="text-[#64748B] mb-6">{error}</p>
                    <button
                        onClick={() => window.history.back()}
                        className="bg-[#4F46E5] text-white px-6 py-2 rounded-lg hover:bg-[#4338CA] transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (!profile) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Profile Header with Action Buttons */}
            <div className="relative">
                <CompanyProfileHeader profile={profile} isEditMode={false} />

                {/* Action Buttons */}
                <div className="absolute bottom-6 right-8 flex items-center gap-3">
                    <button
                        onClick={handleFollowToggle}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isFollowing
                            ? 'bg-[#FEF2F2] border border-[#FECACA] text-[#EF4444]'
                            : 'bg-white border border-[#E2E8F0] text-[#475569] hover:border-[#EF4444] hover:text-[#EF4444]'
                            }`}
                    >
                        <Heart className={`w-4 h-4 ${isFollowing ? 'fill-current' : ''}`} />
                        <span>{isFollowing ? 'Following' : 'Follow Company'}</span>
                    </button>
                    <button
                        onClick={handleViewTasks}
                        className="flex items-center gap-2 bg-[#4F46E5] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#4338CA] transition-colors duration-200"
                    >
                        <Briefcase className="w-4 h-4" />
                        <span>View Open Tasks</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-[1200px] mx-auto px-8 py-8">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Column - Main Content */}
                    <div className="flex-1 space-y-4">
                        <AboutSection
                            about={profile.about || ''}
                            tagline={profile.tagline}
                            techStack={profile.techStack}
                            isEditMode={false}
                        />

                        <CompanyInfoSection profile={profile} isEditMode={false} />

                        <CompanyCultureSection perks={profile.perks || []} isEditMode={false} />

                        <CompanyTeamSection teamMembers={profile.teamMembers || []} isEditMode={false} />

                        {/* Student Reviews Section */}
                        {profile.totalReviews && profile.totalReviews > 0 && (
                            <SectionCard icon={Star} title="What Students Say">
                                <div className="space-y-6">
                                    {/* Rating Summary */}
                                    <div className="flex flex-col md:flex-row gap-6 pb-6 border-b border-[#E2E8F0]">
                                        {/* Overall Rating */}
                                        <div className="text-center md:text-left">
                                            <div className="text-5xl font-extrabold text-[#0F172A]">
                                                {profile.avgRating.toFixed(1)}
                                            </div>
                                            <div className="flex items-center justify-center md:justify-start gap-1 mt-2">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star
                                                        key={star}
                                                        className={`w-5 h-5 ${star <= Math.round(profile.avgRating)
                                                            ? 'fill-[#F59E0B] text-[#F59E0B]'
                                                            : 'text-[#E2E8F0]'
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                            <p className="text-[13px] text-[#94A3B8] mt-1">
                                                Based on {profile.totalReviews} reviews
                                            </p>
                                        </div>

                                        {/* Rating Breakdown */}
                                        <div className="flex-1 space-y-2">
                                            {getRatingBreakdown().map((item) => (
                                                <div key={item.stars} className="flex items-center gap-3">
                                                    <span className="text-[13px] text-[#475569] w-6">
                                                        {item.stars} ★
                                                    </span>
                                                    <div className="flex-1 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-[#F59E0B] rounded-full"
                                                            style={{ width: `${item.percentage}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-[#94A3B8] w-8 text-right">
                                                        {item.count}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Reviews List */}
                                    <div className="space-y-3">
                                        {mockReviews.map((review) => (
                                            <div
                                                key={review.id}
                                                className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-5"
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                                                            <span className="text-sm font-semibold text-[#4F46E5]">
                                                                {getInitials(review.studentName)}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-[#0F172A]">
                                                                {review.studentName}
                                                            </h4>
                                                            <p className="text-xs text-[#94A3B8]">
                                                                for {review.taskTitle}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-[#CBD5E1]">
                                                        {new Date(review.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 mb-2">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star
                                                            key={star}
                                                            className={`w-3.5 h-3.5 ${star <= review.rating
                                                                ? 'fill-[#F59E0B] text-[#F59E0B]'
                                                                : 'text-[#E2E8F0]'
                                                                }`}
                                                        />
                                                    ))}
                                                </div>
                                                <p className="text-sm text-[#475569] leading-relaxed">
                                                    {review.comment}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    <button className="flex items-center gap-2 text-sm font-medium text-[#4F46E5] hover:underline mx-auto">
                                        <span>See All Reviews</span>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            </SectionCard>
                        )}
                    </div>

                    {/* Right Column - Sidebar */}
                    <div className="lg:w-[380px]">
                        <div className="lg:sticky lg:top-[88px] space-y-4">
                            {/* About Summary Card */}
                            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
                                        {profile.logo ? (
                                            <img src={profile.logo} alt={profile.companyName} className="w-full h-full object-contain" />
                                        ) : (
                                            <span className="text-sm font-bold text-[#4F46E5]">
                                                {getInitials(profile.companyName)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-semibold text-[#0F172A]">{profile.companyName}</h3>
                                        <p className="text-xs text-[#64748B]">{profile.industry}</p>
                                    </div>
                                </div>
                                <div className="space-y-2 text-xs text-[#475569] mb-4">
                                    <div className="flex justify-between">
                                        <span className="text-[#94A3B8]">Size:</span>
                                        <span className="font-medium">{profile.companySize} employees</span>
                                    </div>
                                    {profile.website && (
                                        <div className="flex justify-between">
                                            <span className="text-[#94A3B8]">Website:</span>
                                            <a
                                                href={profile.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-medium text-[#4F46E5] hover:underline"
                                            >
                                                Visit
                                            </a>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleViewTasks}
                                    className="w-full bg-[#4F46E5] text-white text-sm font-medium py-2.5 rounded-lg hover:bg-[#4338CA] transition-colors duration-200"
                                >
                                    View Open Tasks
                                </button>
                            </div>

                            {/* Stats Panel */}
                            <CompanyStatsPanel
                                totalTasksPosted={profile.totalTasksPosted}
                                totalInterns={profile.totalInterns}
                                activeTasks={profile.activeTasks}
                                avgRating={profile.avgRating}
                                isEditMode={false}
                            />

                            {/* Active Tasks Preview */}
                            <div id="active-tasks">
                                <ActiveTasksPreview tasks={mockTasks} activeTasks={profile.activeTasks} isEditMode={false} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
