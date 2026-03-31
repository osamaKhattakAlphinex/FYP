"use client";

import { RecommendedTask } from '@/types/dashboard.types';
import { Sparkles, Clock, DollarSign } from 'lucide-react';
import Link from 'next/link';

interface RecommendedTasksCardProps {
    tasks: RecommendedTask[];
}

export default function RecommendedTasksCard({ tasks }: RecommendedTasksCardProps) {
    const getDifficultyColor = (difficulty: string) => {
        const colors = {
            beginner: 'bg-[#DCFCE7] text-[#16A34A]',
            intermediate: 'bg-[#FEF3C7] text-[#D97706]',
            advanced: 'bg-[#FEE2E2] text-[#DC2626]',
        };
        return colors[difficulty as keyof typeof colors];
    };

    return (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#4F46E5]" />
                    <h3 className="text-lg font-bold text-[#0F172A]">Recommended for You</h3>
                </div>
                <Link href="/student/tasks" className="text-sm font-semibold text-[#4F46E5] hover:text-[#4338CA]">
                    View All
                </Link>
            </div>
            <div className="space-y-4">
                {tasks.map((task) => (
                    <Link
                        key={task.id}
                        href={`/tasks/${task.id}`}
                        className="block border border-[#E2E8F0] rounded-xl p-4 hover:border-[#4F46E5] hover:shadow-md transition-all duration-200"
                    >
                        <div className="flex items-start gap-3 mb-3">
                            <div className="w-12 h-12 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-center flex-shrink-0">
                                <span className="text-xl">{task.companyLogo}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-[#0F172A] mb-1">
                                    {task.title}
                                </p>
                                <p className="text-xs text-[#64748B]">{task.company}</p>
                            </div>
                            <div className="flex items-center gap-1 px-2.5 py-1 bg-[#EEF2FF] text-[#4F46E5] rounded-lg">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span className="text-xs font-bold">{task.matchScore}%</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {task.skills.slice(0, 3).map((skill, index) => (
                                <span key={index} className="px-2 py-1 bg-[#F8FAFC] text-[#475569] text-xs font-medium rounded-md">
                                    {skill}
                                </span>
                            ))}
                            {task.skills.length > 3 && (
                                <span className="px-2 py-1 bg-[#F8FAFC] text-[#64748B] text-xs font-medium rounded-md">
                                    +{task.skills.length - 3}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-[#64748B]">
                            <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {task.duration}
                            </div>
                            <div className="flex items-center gap-1">
                                <DollarSign className="w-3.5 h-3.5" />
                                {task.compensation}
                            </div>
                            <span className={`px-2 py-0.5 rounded-md font-semibold ${getDifficultyColor(task.difficulty)}`}>
                                {task.difficulty}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
