"use client";

import { Briefcase, Users, Clock, Plus } from 'lucide-react';
import Link from 'next/link';
import EmptyState from '@/components/shared/EmptyState';
import type { CompanyTask } from '@/types/company.types';

interface ActiveTasksPreviewProps {
    tasks: CompanyTask[];
    activeTasks: number;
    isEditMode?: boolean;
}

export default function ActiveTasksPreview({ tasks, activeTasks, isEditMode = false }: ActiveTasksPreviewProps) {
    const getSkillBadge = (skill: string) => {
        return (
            <span className="inline-flex items-center bg-[#0F172A] text-white text-xs font-medium px-2.5 py-0.5 rounded-full">
                {skill}
            </span>
        );
    };

    const getDaysLeft = (deadline: string) => {
        const days = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return days;
    };

    const displayTasks = tasks.slice(0, isEditMode ? 3 : 5);

    return (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-[13px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                    Active Tasks
                </h3>
                <span className="inline-flex items-center bg-[#EEF2FF] text-[#4F46E5] text-xs font-semibold px-2 py-0.5 rounded-full">
                    {activeTasks}
                </span>
            </div>

            {displayTasks.length === 0 ? (
                <EmptyState
                    icon={Briefcase}
                    title="No active tasks"
                    description="Post your first task to start receiving applications from talented students"
                    ctaLabel="Post Your First Task"
                    onCtaClick={() => window.location.href = '/company/post-task'}
                />
            ) : (
                <>
                    <div className="space-y-3">
                        {displayTasks.map((task) => {
                            const daysLeft = getDaysLeft(task.deadline);
                            const isUrgent = daysLeft <= 3;

                            return (
                                <Link
                                    key={task.id}
                                    href={`/tasks/${task.id}`}
                                    className="block py-3 border-b border-dashed border-[#E2E8F0] last:border-0 hover:bg-[#F8FAFC] -mx-3 px-3 rounded-lg transition-colors duration-200"
                                >
                                    <h4 className="text-sm font-semibold text-[#0F172A] truncate mb-2">
                                        {task.title}
                                    </h4>
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        {task.skills[0] && getSkillBadge(task.skills[0])}
                                        <div className="flex items-center gap-1 text-xs text-[#94A3B8]">
                                            <Users className="w-3 h-3" />
                                            <span>{task.applicants} applicants</span>
                                        </div>
                                        <div className={`flex items-center gap-1 text-xs ${isUrgent ? 'text-[#EF4444]' : 'text-[#F59E0B]'}`}>
                                            <Clock className="w-3 h-3" />
                                            <span>{daysLeft} days left</span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    <Link
                        href="/company/post-task"
                        className="flex items-center justify-center gap-2 w-full mt-5 bg-[#4F46E5] text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-[#4338CA] transition-colors duration-200"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Post New Task</span>
                    </Link>

                    <Link
                        href="/company/tasks"
                        className="block text-center text-[13px] text-[#4F46E5] hover:underline mt-3"
                    >
                        View All Tasks
                    </Link>
                </>
            )}
        </div>
    );
}
