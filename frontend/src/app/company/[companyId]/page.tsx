"use client";

import { useState } from 'react';
import { Heart, Briefcase, Star } from 'lucide-react';
import { useParams } from 'next/navigation';
import CompanyProfileHeader from '@/components/company/profile/CompanyProfileHeader';
import AboutSection from '@/components/company/profile/AboutSection';
import CompanyInfoSection from '@/components/company/profile/CompanyInfoSection';
import CompanyCultureSection from '@/components/company/profile/CompanyCultureSection';
import CompanyTeamSection from '@/components/company/profile/CompanyTeamSection';
import CompanyStatsPanel from '@/components/company/profile/CompanyStatsPanel';
import ActiveTasksPreview from '@/components/company/profile/ActiveTasksPreview';
import SectionCard from '@/components/shared/SectionCard';
import type { CompanyProfile, CompanyReview, CompanyTask } from '@/types/company.types';

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
    const profile = mockProfile;

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
        // Mock rating breakdown
        return [
            { stars: 5, count: 20, percentage: 62.5 },
            { stars: 4, count: 8, percentage: 25 },
            { stars: 3, count: 3, percentage: 9.4 },
            { stars: 2, count: 1, percentage: 3.1 },
            { stars: 1, count: 0, percentage: 0 }
        ];
    };

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
                        {profile.about && (
                            <AboutSection
                                about={profile.about}
                                tagline={profile.tagline}
                                techStack={profile.techStack}
                                isEditMode={false}
                            />
                        )}

                        <CompanyInfoSection profile={profile} isEditMode={false} />

                        {profile.perks.length > 0 && (
                            <CompanyCultureSection perks={profile.perks} isEditMode={false} />
                        )}

                        {profile.teamMembers.length > 0 && (
                            <CompanyTeamSection teamMembers={profile.teamMembers} isEditMode={false} />
                        )}

                        {/* Student Reviews Section */}
                        {profile.totalReviews > 0 && (
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
