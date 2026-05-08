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
            <span className="inline-flex items-center bg-foreground text-white text-xs font-medium px-2.5 py-0.5 rounded-full">
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
        <div className="bg-white border border-input rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Active Tasks
                </h3>
                <span className="inline-flex items-center bg-brand-50 text-brand-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {activeTasks}
                </span>
            </div>

            {displayTasks.length === 0 ? (
                isEditMode ? (
                    <EmptyState
                        icon={Briefcase}
                        title="No active tasks"
                        description="Post your first task to start receiving applications from talented students"
                        ctaLabel="Post Your First Task"
                        onCtaClick={() => window.location.href = '/company/post-task'}
                    />
                ) : (
                    <div className="text-center py-8">
                        <Briefcase className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm">No active tasks available</p>
                    </div>
                )
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
                                    className="block py-3 border-b border-dashed border-input last:border-0 hover:bg-muted/40 -mx-3 px-3 rounded-lg transition-colors duration-200"
                                >
                                    <h4 className="text-sm font-semibold text-foreground truncate mb-2">
                                        {task.title}
                                    </h4>
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        {task.skills[0] && getSkillBadge(task.skills[0])}
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Users className="w-3 h-3" />
                                            <span>{task.applicants} applicants</span>
                                        </div>
                                        <div className={`flex items-center gap-1 text-xs ${isUrgent ? 'text-destructive' : 'text-[#F59E0B]'}`}>
                                            <Clock className="w-3 h-3" />
                                            <span>{daysLeft} days left</span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    {isEditMode && (
                        <>
                            <Link
                                href="/company/post-task"
                                className="flex items-center justify-center gap-2 w-full mt-5 bg-brand-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-brand-700 transition-colors duration-200"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Post New Task</span>
                            </Link>

                            <Link
                                href="/company/tasks"
                                className="block text-center text-[13px] text-brand-700 hover:underline mt-3"
                            >
                                View All Tasks
                            </Link>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
