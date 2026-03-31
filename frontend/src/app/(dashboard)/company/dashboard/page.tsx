"use client";

import { Inbox, ClipboardList, UserCheck, Eye } from 'lucide-react';
import CompanyWelcomeBanner from '@/components/company/dashboard/CompanyWelcomeBanner';
import CompanyStatsCard from '@/components/company/dashboard/CompanyStatsCard';
import ActiveTasksCard from '@/components/company/dashboard/ActiveTasksCard';
import RecentApplicationsCard from '@/components/company/dashboard/RecentApplicationsCard';
import TopCandidatesCard from '@/components/company/dashboard/TopCandidatesCard';
import RecentActivityCard from '@/components/student/dashboard/RecentActivityCard';
import DashboardHeader from '@/components/shared/DashboardHeader';

export default function CompanyDashboard() {
    // Mock data - will be replaced with API calls
    const stats = [
        { label: 'Total Applications', value: '48', change: '+12', trend: 'up' as const, icon: Inbox },
        { label: 'Active Tasks', value: '5', change: '+2', trend: 'up' as const, icon: ClipboardList },
        { label: 'Successful Hires', value: '23', change: '+5', trend: 'up' as const, icon: UserCheck },
        { label: 'Profile Views', value: '892', change: '+45', trend: 'up' as const, icon: Eye },
    ];

    const activeTasks = [
        {
            id: '1',
            title: 'Frontend Developer for E-commerce Platform',
            applicants: 24,
            views: 156,
            deadline: 'Jan 15, 2025',
            status: 'active' as const,
        },
        {
            id: '2',
            title: 'UI/UX Designer for Mobile App',
            applicants: 18,
            views: 203,
            deadline: 'Jan 20, 2025',
            status: 'active' as const,
        },
        {
            id: '3',
            title: 'Content Writer for Blog Posts',
            applicants: 12,
            views: 89,
            deadline: 'Jan 10, 2025',
            status: 'active' as const,
        },
        {
            id: '4',
            title: 'Social Media Marketing Strategy',
            applicants: 0,
            views: 45,
            deadline: 'Jan 25, 2025',
            status: 'draft' as const,
        },
    ];

    const recentApplications = [
        {
            id: '1',
            candidateName: 'Sarah Ahmed',
            candidateAvatar: 'SA',
            taskTitle: 'Frontend Developer for E-commerce Platform',
            appliedDate: '2 hours ago',
            matchScore: 94,
            status: 'new' as const,
        },
        {
            id: '2',
            candidateName: 'Muhammad Khan',
            candidateAvatar: 'MK',
            taskTitle: 'UI/UX Designer for Mobile App',
            appliedDate: '5 hours ago',
            matchScore: 89,
            status: 'reviewing' as const,
        },
        {
            id: '3',
            candidateName: 'Fatima Hassan',
            candidateAvatar: 'FH',
            taskTitle: 'Content Writer for Blog Posts',
            appliedDate: '1 day ago',
            matchScore: 92,
            status: 'shortlisted' as const,
        },
        {
            id: '4',
            candidateName: 'Ali Raza',
            candidateAvatar: 'AR',
            taskTitle: 'Frontend Developer for E-commerce Platform',
            appliedDate: '2 days ago',
            matchScore: 87,
            status: 'reviewing' as const,
        },
    ];

    const topCandidates = [
        {
            id: '1',
            name: 'Zainab Ali',
            avatar: 'ZA',
            title: 'Full Stack Developer',
            location: 'Islamabad, Pakistan',
            experience: '3 years',
            skills: ['React', 'Node.js', 'MongoDB', 'TypeScript', 'AWS'],
            matchScore: 96,
        },
        {
            id: '2',
            name: 'Hassan Malik',
            avatar: 'HM',
            title: 'UI/UX Designer',
            location: 'Lahore, Pakistan',
            experience: '2 years',
            skills: ['Figma', 'Adobe XD', 'Prototyping', 'User Research'],
            matchScore: 93,
        },
        {
            id: '3',
            name: 'Ayesha Siddiqui',
            avatar: 'AS',
            title: 'Content Strategist',
            location: 'Karachi, Pakistan',
            experience: '4 years',
            skills: ['SEO', 'Content Writing', 'Social Media', 'Analytics'],
            matchScore: 91,
        },
    ];

    const recentActivities = [
        {
            id: '1',
            type: 'application' as const,
            title: 'New Application',
            description: 'Sarah Ahmed applied for Frontend Developer position',
            timestamp: '2 hours ago',
            icon: '',
        },
        {
            id: '2',
            type: 'hire' as const,
            title: 'Candidate Hired',
            description: 'Successfully hired Ali Raza for Backend Development task',
            timestamp: '1 day ago',
            icon: '',
        },
        {
            id: '3',
            type: 'task_completed' as const,
            title: 'Task Completed',
            description: 'Fatima Hassan completed "Logo Design" task',
            timestamp: '2 days ago',
            icon: '',
        },
        {
            id: '4',
            type: 'interview' as const,
            title: 'Interview Scheduled',
            description: 'Interview with Muhammad Khan scheduled for tomorrow',
            timestamp: '3 days ago',
            icon: '',
        },
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <DashboardHeader />
            <div className="p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Welcome Banner */}
                    <CompanyWelcomeBanner companyName="TechCorp" activeTasks={5} />

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {stats.map((stat, index) => (
                            <CompanyStatsCard key={index} stat={stat} icon={stat.icon} />
                        ))}
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - 2/3 width */}
                        <div className="lg:col-span-2 space-y-6">
                            <ActiveTasksCard tasks={activeTasks} />
                            <RecentApplicationsCard applications={recentApplications} />
                        </div>

                        {/* Right Column - 1/3 width */}
                        <div className="lg:col-span-1 space-y-6">
                            <TopCandidatesCard candidates={topCandidates} />
                            <RecentActivityCard activities={recentActivities} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
