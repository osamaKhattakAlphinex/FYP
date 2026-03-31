"use client";

import { User, Star, Clock } from 'lucide-react';
import Link from 'next/link';

interface Application {
    id: string;
    candidateName: string;
    candidateAvatar: string;
    taskTitle: string;
    appliedDate: string;
    matchScore: number;
    status: 'new' | 'reviewing' | 'shortlisted' | 'rejected';
}

interface RecentApplicationsCardProps {
    applications: Application[];
}

export default function RecentApplicationsCard({ applications }: RecentApplicationsCardProps) {
    const getStatusColor = (status: string) => {
        const colors = {
            new: 'bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE]',
            reviewing: 'bg-[#FEF3C7] text-[#D97706] border-[#FCD34D]',
            shortlisted: 'bg-[#DCFCE7] text-[#16A34A] border-[#86EFAC]',
            rejected: 'bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]',
        };
        return colors[status as keyof typeof colors];
    };

    return (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#0F172A]">Recent Applications</h3>
                <Link href="/company/candidates" className="text-sm font-semibold text-[#4F46E5] hover:text-[#4338CA]">
                    View All
                </Link>
            </div>
            <div className="space-y-3">
                {applications.map((app) => (
                    <Link
                        key={app.id}
                        href={`/profile/${app.id}`}
                        className="block border border-[#E2E8F0] rounded-xl p-4 hover:border-[#4F46E5] hover:shadow-md transition-all duration-200"
                    >
                        <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#4F46E5] to-[#06B6D4] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                                {app.candidateAvatar}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-[#0F172A] mb-1">
                                    {app.candidateName}
                                </p>
                                <p className="text-xs text-[#64748B] truncate">
                                    Applied for: {app.taskTitle}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 px-2 py-1 bg-[#EEF2FF] text-[#4F46E5] rounded-lg">
                                <Star className="w-3 h-3 fill-current" />
                                <span className="text-xs font-bold">{app.matchScore}%</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-xs text-[#64748B]">
                                <Clock className="w-3.5 h-3.5" />
                                {app.appliedDate}
                            </div>
                            <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${getStatusColor(app.status)}`}>
                                {app.status}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
