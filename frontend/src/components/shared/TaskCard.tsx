"use client";

import { Briefcase, Clock, Users, Calendar, DollarSign } from 'lucide-react';
import Link from 'next/link';
import type { Task } from '@/types/task.types';
import { getTextPreview } from '@/utils/textUtils';

interface TaskCardProps {
    task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'Beginner':
                return 'bg-[#DCFCE7] text-success';
            case 'Intermediate':
                return 'bg-accent-50 text-accent-700';
            case 'Advanced':
                return 'bg-destructive/10 text-[#DC2626]';
            default:
                return 'bg-[#F1F5F9] text-muted-foreground';
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
            <div className="bg-white border border-input rounded-2xl p-6 hover:border-[#4F46E5] hover:shadow-lg transition-all duration-200 cursor-pointer">
                {/* Company Info */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center overflow-hidden">
                        {task.companyLogo ? (
                            <img src={task.companyLogo} alt={task.companyName} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-sm font-bold text-brand-700">{getInitials(task.companyName)}</span>
                        )}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-semibold text-foreground">{task.companyName}</h3>
                        <p className="text-xs text-muted-foreground">Posted {new Date(task.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${getDifficultyColor(task.difficulty)}`}>
                        {task.difficulty}
                    </span>
                </div>

                {/* Task Title */}
                <h2 className="text-lg font-bold text-foreground mb-2 line-clamp-2">
                    {task.title}
                </h2>

                {/* Task Description */}
                <p className="text-sm text-foreground/85 mb-4 line-clamp-2">
                    {getTextPreview(task.description, 120)}
                </p>

                {/* Skills */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {task.requiredSkills.slice(0, 3).map((skill, index) => (
                        <span
                            key={index}
                            className="inline-flex items-center bg-foreground text-white text-xs font-medium px-3 py-1 rounded-full"
                        >
                            {skill}
                        </span>
                    ))}
                    {task.requiredSkills.length > 3 && (
                        <span className="inline-flex items-center bg-[#F1F5F9] text-muted-foreground text-xs font-medium px-3 py-1 rounded-full">
                            +{task.requiredSkills.length - 3} more
                        </span>
                    )}
                </div>

                {/* Task Meta Info */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-4 border-t border-input">
                    <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{task.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{task.applicants} applicants</span>
                    </div>
                    <div className={`flex items-center gap-1 ${isUrgent ? 'text-destructive' : ''}`}>
                        <Calendar className="w-4 h-4" />
                        <span>{daysLeft} days left</span>
                    </div>
                    {task.isPaid && task.compensation && (
                        <div className="flex items-center gap-1 text-success">
                            <DollarSign className="w-4 h-4" />
                            <span>PKR {task.compensation.toLocaleString()}</span>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}
