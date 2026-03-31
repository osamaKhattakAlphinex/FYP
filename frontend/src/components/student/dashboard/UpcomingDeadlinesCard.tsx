"use client";

import { UpcomingDeadline } from '@/types/dashboard.types';
import { Calendar, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface UpcomingDeadlinesCardProps {
    deadlines: UpcomingDeadline[];
}

export default function UpcomingDeadlinesCard({ deadlines }: UpcomingDeadlinesCardProps) {
    const getPriorityColor = (priority: string) => {
        const colors = {
            high: 'bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5]',
            medium: 'bg-[#FEF3C7] text-[#D97706] border-[#FCD34D]',
            low: 'bg-[#DBEAFE] text-[#2563EB] border-[#93C5FD]',
        };
        return colors[priority as keyof typeof colors];
    };

    return (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#0F172A]">Upcoming Deadlines</h3>
                <Link href="/student/tasks" className="text-sm font-semibold text-[#4F46E5] hover:text-[#4338CA]">
                    View All
                </Link>
            </div>
            <div className="space-y-3">
                {deadlines.map((deadline) => (
                    <div key={deadline.id} className="border border-[#E2E8F0] rounded-xl p-4 hover:border-[#4F46E5] transition-colors duration-200">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-[#0F172A] mb-1">
                                    {deadline.taskTitle}
                                </p>
                                {deadline.companyName && (
                                    <p className="text-xs text-[#64748B]">{deadline.companyName}</p>
                                )}
                            </div>
                            <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${getPriorityColor(deadline.priority)}`}>
                                {deadline.priority}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#64748B] mb-3">
                            <Calendar className="w-3.5 h-3.5" />
                            Due: {deadline.dueDate}
                        </div>
                        <div>
                            <div className="flex items-center justify-between text-xs mb-1.5">
                                <span className="text-[#64748B]">Progress</span>
                                <span className="font-semibold text-[#0F172A]">{deadline.progress}%</span>
                            </div>
                            <div className="w-full bg-[#F1F5F9] rounded-full h-1.5">
                                <div
                                    className="bg-gradient-to-r from-[#4F46E5] to-[#06B6D4] h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${deadline.progress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
