"use client";

import { useState, useEffect } from 'react';
import { Sparkles, Clock, DollarSign, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { taskService, Task } from '@/services/taskService';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';

export default function RecommendedTasksCard() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecommendedTasks();
    }, []);

    const fetchRecommendedTasks = async () => {
        try {
            setLoading(true);
            const tasksData = await taskService.getRecommendedTasks(3);
            setTasks(tasksData);
        } catch (error) {
            console.error('Error fetching recommended tasks:', error);
            // Fallback to regular tasks if recommendations fail
            try {
                const response = await taskService.getTasks(1, 3);
                setTasks(response.tasks);
            } catch (fallbackError) {
                toast.error('Failed to load tasks');
            }
        } finally {
            setLoading(false);
        }
    };

    const getExperienceLevelColor = (level: string) => {
        const colors = {
            entry: 'bg-[#DCFCE7] text-[#16A34A]',
            intermediate: 'bg-[#FEF3C7] text-[#D97706]',
            expert: 'bg-[#FEE2E2] text-[#DC2626]',
        };
        return colors[level as keyof typeof colors] || colors.entry;
    };

    const getCompanyInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    if (loading) {
        return (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
                <div className="flex items-center justify-center py-8">
                    <LoadingSpinner size="md" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#4F46E5]" />
                    <h3 className="text-lg font-bold text-[#0F172A]">Recommended for You</h3>
                </div>
                <Link
                    href="/tasks"
                    className="flex items-center gap-1 text-sm font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors"
                >
                    View All
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>

            {tasks.length === 0 ? (
                <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 mb-3">No recommendations available</p>
                    <Link
                        href="/tasks"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#4F46E5] text-white text-sm font-medium rounded-lg hover:bg-[#4338CA] transition-colors"
                    >
                        Browse All Tasks
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {tasks.map((task) => (
                        <Link
                            key={task._id}
                            href={`/tasks/${task._id}`}
                            className="block border border-[#E2E8F0] rounded-xl p-4 hover:border-[#4F46E5] hover:shadow-md transition-all duration-200"
                        >
                            <div className="flex items-start gap-3 mb-3">
                                <div className="w-12 h-12 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {task.companyId.logo ? (
                                        <img
                                            src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${task.companyId.logo}`}
                                            alt={task.companyId.companyName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-xs font-bold text-[#4F46E5]">
                                            {getCompanyInitials(task.companyId.companyName)}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-[#0F172A] mb-1 line-clamp-2">
                                        {task.title}
                                    </p>
                                    <p className="text-xs text-[#64748B]">{task.companyId.companyName}</p>
                                </div>
                                {task.isFeatured && (
                                    <div className="flex items-center gap-1 px-2.5 py-1 bg-[#FEF3C7] text-[#D97706] rounded-lg">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span className="text-xs font-bold">Featured</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {task.skillsRequired.slice(0, 3).map((skill, index) => (
                                    <span key={index} className="px-2 py-1 bg-[#F8FAFC] text-[#475569] text-xs font-medium rounded-md">
                                        {skill.name}
                                    </span>
                                ))}
                                {task.skillsRequired.length > 3 && (
                                    <span className="px-2 py-1 bg-[#F8FAFC] text-[#64748B] text-xs font-medium rounded-md">
                                        +{task.skillsRequired.length - 3}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-[#64748B] flex-wrap">
                                <div className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {taskService.formatDuration(task.duration)}
                                </div>
                                <div className="flex items-center gap-1">
                                    <DollarSign className="w-3.5 h-3.5" />
                                    {taskService.formatBudget(task.budget)}
                                </div>
                                <span className={`px-2 py-0.5 rounded-md font-semibold capitalize ${getExperienceLevelColor(task.experienceLevel)}`}>
                                    {task.experienceLevel}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
