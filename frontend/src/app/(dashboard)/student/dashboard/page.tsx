"use client";

import { ClipboardList, CheckCircle2, Award, Eye } from 'lucide-react';
import WelcomeBanner from '@/components/student/dashboard/WelcomeBanner';
import StatsCard from '@/components/student/dashboard/StatsCard';
import UpcomingDeadlinesCard from '@/components/student/dashboard/UpcomingDeadlinesCard';
import RecentActivityCard from '@/components/student/dashboard/RecentActivityCard';
import RecommendedTasksCard from '@/components/student/dashboard/RecommendedTasksCard';
import DashboardHeader from '@/components/shared/DashboardHeader';
import { useRoleProtection } from '@/hooks/useRoleProtection';

export default function StudentDashboard() {
    // Protect this route - only students can access
    useRoleProtection({ allowedRoles: ['student'] });

    // Mock data - will be replaced with API calls
    const stats = [
        { label: 'Active Tasks', value: '3', change: '+2', trend: 'up' as const, icon: ClipboardList },
        { label: 'Completed Tasks', value: '12', change: '+3', trend: 'up' as const, icon: CheckCircle2 },
        { label: 'Certificates Earned', value: '8', change: '+1', trend: 'up' as const, icon: Award },
        { label: 'Profile Views', value: '156', change: '+12', trend: 'up' as const, icon: Eye },
    ];

    const upcomingDeadlines = [
        {
            id: '1',
            taskTitle: 'UI/UX Design for Mobile App',
            companyName: 'TechCorp Inc.',
            dueDate: 'Dec 28, 2024',
            priority: 'high' as const,
            progress: 65,
        },
        {
            id: '2',
            taskTitle: 'API Integration Documentation',
            companyName: 'StartupXYZ',
            dueDate: 'Jan 5, 2025',
            priority: 'medium' as const,
            progress: 40,
        },
        {
            id: '3',
            taskTitle: 'Social Media Content Strategy',
            companyName: 'Marketing Pro',
            dueDate: 'Jan 10, 2025',
            priority: 'low' as const,
            progress: 20,
        },
    ];

    const recentActivities = [
        {
            id: '1',
            type: 'application' as const,
            title: 'Application Submitted',
            description: 'You applied for "Frontend Developer Task" at WebDev Co.',
            timestamp: '2 hours ago',
            icon: '',
        },
        {
            id: '2',
            type: 'task_completed' as const,
            title: 'Task Completed',
            description: 'Successfully completed "Logo Design" for Creative Studio',
            timestamp: '1 day ago',
            icon: '',
        },
        {
            id: '3',
            type: 'certificate' as const,
            title: 'Certificate Earned',
            description: 'Received certificate for "React Development Basics"',
            timestamp: '2 days ago',
            icon: '',
        },
        {
            id: '4',
            type: 'message' as const,
            title: 'New Message',
            description: 'TechCorp sent you a message about your application',
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
                    <WelcomeBanner userName="Ahmed" profileCompletion={75} />

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {stats.map((stat, index) => (
                            <StatsCard key={index} stat={stat} icon={stat.icon} />
                        ))}
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - 2/3 width */}
                        <div className="lg:col-span-2 space-y-6">
                            <RecommendedTasksCard />
                            <UpcomingDeadlinesCard deadlines={upcomingDeadlines} />
                        </div>

                        {/* Right Column - 1/3 width */}
                        <div className="lg:col-span-1">
                            <RecentActivityCard activities={recentActivities} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
