"use client";

import { Briefcase, Clock, Users, Calendar, DollarSign } from 'lucide-react';
import Link from 'next/link';
import type { Task } from '@/types/task.types';

interface TaskCardProps {
    task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'Beginner':
                return 'bg-[#DCFCE7] text-[#16A34A]';
            case 'Intermediate':
                return 'bg-[#FEF3C7] text-[#D97706]';
            case 'Advanced':
                return 'bg-[#FEE2E2] text-[#DC2626]';
            default:
                return 'bg-[#F1F5F9] text-[#64748B]';
        }
    };

    const getDaysLeft = () => {
        const days = Math.ceil((new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return days;
    };

    const daysLeft = getDaysLeft();
    const isUrgent = daysLeft <= 7;

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <Link href={`/tasks/${task.id}`}>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 hover:border-[#4F46E5] hover:shadow-lg transition-all duration-200 cursor-pointer">
                {/* Company Info */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-[#EEF2FF] flex items-center justify-center overflow-hidden">
                        {task.companyLogo ? (
                            <img src={task.companyLogo} alt={task.companyName} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-sm font-bold text-[#4F46E5]">{getInitials(task.companyName)}</span>
                        )}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-semibold text-[#0F172A]">{task.companyName}</h3>
                        <p className="text-xs text-[#94A3B8]">Posted {new Date(task.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${getDifficultyColor(task.difficulty)}`}>
                        {task.difficulty}
                    </span>
                </div>

                {/* Task Title */}
                <h2 className="text-lg font-bold text-[#0F172A] mb-2 line-clamp-2">
                    {task.title}
                </h2>

                {/* Task Description */}
                <p className="text-sm text-[#475569] mb-4 line-clamp-2">
                    {task.description}
                </p>

                {/* Skills */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {task.requiredSkills.slice(0, 3).map((skill, index) => (
                        <span
                            key={index}
                            className="inline-flex items-center bg-[#0F172A] text-white text-xs font-medium px-3 py-1 rounded-full"
                        >
                            {skill}
                        </span>
                    ))}
                    {task.requiredSkills.length > 3 && (
                        <span className="inline-flex items-center bg-[#F1F5F9] text-[#64748B] text-xs font-medium px-3 py-1 rounded-full">
                            +{task.requiredSkills.length - 3} more
                        </span>
                    )}
                </div>

                {/* Task Meta Info */}
                <div className="flex items-center gap-4 text-xs text-[#64748B] pt-4 border-t border-[#E2E8F0]">
                    <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{task.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{task.applicants} applicants</span>
                    </div>
                    <div className={`flex items-center gap-1 ${isUrgent ? 'text-[#EF4444]' : ''}`}>
                        <Calendar className="w-4 h-4" />
                        <span>{daysLeft} days left</span>
                    </div>
                    {task.isPaid && task.compensation && (
                        <div className="flex items-center gap-1 text-[#10B981]">
                            <DollarSign className="w-4 h-4" />
                            <span>PKR {task.compensation.toLocaleString()}</span>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}
