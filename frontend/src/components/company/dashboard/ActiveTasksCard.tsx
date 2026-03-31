"use client";

import { Users, Eye, Clock } from 'lucide-react';
import Link from 'next/link';

interface ActiveTask {
    id: string;
    title: string;
    applicants: number;
    views: number;
    deadline: string;
    status: 'active' | 'closed' | 'draft';
}

interface ActiveTasksCardProps {
    tasks: ActiveTask[];
}

export default function ActiveTasksCard({ tasks }: ActiveTasksCardProps) {
    const getStatusColor = (status: string) => {
        const colors = {
            active: 'bg-[#DCFCE7] text-[#16A34A] border-[#86EFAC]',
            closed: 'bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]',
            draft: 'bg-[#FEF3C7] text-[#D97706] border-[#FCD34D]',
        };
        return colors[status as keyof typeof colors];
    };

    return (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#0F172A]">Active Tasks</h3>
                <Link href="/company/post-task" className="text-sm font-semibold text-[#4F46E5] hover:text-[#4338CA]">
                    Post New
                </Link>
            </div>
            <div className="space-y-3">
                {tasks.map((task) => (
                    <Link
                        key={task.id}
                        href={`/tasks/${task.id}`}
                        className="block border border-[#E2E8F0] rounded-xl p-4 hover:border-[#4F46E5] hover:shadow-md transition-all duration-200"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <p className="text-sm font-bold text-[#0F172A] flex-1">
                                {task.title}
                            </p>
                            <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${getStatusColor(task.status)}`}>
                                {task.status}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-[#64748B]">
                            <div className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                {task.applicants} applicants
                            </div>
                            <div className="flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5" />
                                {task.views} views
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {task.deadline}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
