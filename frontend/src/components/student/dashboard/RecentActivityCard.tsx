"use client";

import { RecentActivity } from '@/types/dashboard.types';
import { Clock, FileText, CheckCircle, Award, MessageSquare, Calendar, UserCheck, LucideIcon } from 'lucide-react';

interface RecentActivityCardProps {
    activities: RecentActivity[];
}

const activityIcons: Record<string, LucideIcon> = {
    application: FileText,
    task_completed: CheckCircle,
    certificate: Award,
    message: MessageSquare,
    interview: Calendar,
    hire: UserCheck,
};

export default function RecentActivityCard({ activities }: RecentActivityCardProps) {
    const getActivityColor = (type: string) => {
        const colors = {
            application: 'bg-[#EEF2FF] text-[#4F46E5]',
            task_completed: 'bg-[#DCFCE7] text-[#16A34A]',
            certificate: 'bg-[#FEF3C7] text-[#D97706]',
            message: 'bg-[#E0F2FE] text-[#0891B2]',
            interview: 'bg-[#FCE7F3] text-[#DB2777]',
            hire: 'bg-[#DCFCE7] text-[#16A34A]',
        };
        return colors[type as keyof typeof colors] || 'bg-[#F1F5F9] text-[#64748B]';
    };

    return (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
            <h3 className="text-lg font-bold text-[#0F172A] mb-4">Recent Activity</h3>
            <div className="space-y-4">
                {activities.map((activity) => {
                    const Icon = activityIcons[activity.type] || FileText;
                    return (
                        <div key={activity.id} className="flex gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[#0F172A] mb-1">
                                    {activity.title}
                                </p>
                                <p className="text-xs text-[#64748B] mb-1">
                                    {activity.description}
                                </p>
                                <div className="flex items-center gap-1 text-xs text-[#94A3B8]">
                                    <Clock className="w-3 h-3" />
                                    {activity.timestamp}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
