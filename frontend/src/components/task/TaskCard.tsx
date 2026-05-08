"use client";

import { Task, taskService } from "@/services/taskService";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
    ClockIcon,
    MapPinIcon,
    CurrencyDollarIcon,
    BookmarkIcon,
    EyeIcon,
    CalendarIcon,
    BuildingOfficeIcon,
    CheckBadgeIcon
} from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkSolidIcon } from "@heroicons/react/24/solid";
import { getTextPreview } from "@/utils/textUtils";

interface TaskCardProps {
    task: Task;
    showCompany?: boolean;
    className?: string;
}

export default function TaskCard({ task, showCompany = true, className = "" }: TaskCardProps) {
    const [isSaved, setIsSaved] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);

    const timeRemaining = taskService.getTimeRemaining(task.applicationDeadline);
    const budgetDisplay = taskService.formatBudget(task.budget);
    const durationDisplay = taskService.formatDuration(task.duration);

    const handleSave = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setSaveLoading(true);
        try {
            // TODO: Implement save/unsave functionality
            setIsSaved(!isSaved);
        } catch (error) {
            console.error('Error saving task:', error);
        } finally {
            setSaveLoading(false);
        }
    };

    const getUrgencyColor = () => {
        if (timeRemaining.expired) return "text-red-600";
        if (timeRemaining.days <= 2) return "text-orange-600";
        if (timeRemaining.days <= 7) return "text-yellow-600";
        return "text-green-600";
    };

    const getUrgencyText = () => {
        if (timeRemaining.expired) return "Expired";
        if (timeRemaining.days === 0) return `${timeRemaining.hours}h left`;
        if (timeRemaining.days <= 7) return `${timeRemaining.days}d left`;
        return `${timeRemaining.days} days left`;
    };

    return (
        <Link href={`/tasks/${task._id}`}>
            <div className={`bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 cursor-pointer ${className}`}>
                {/* Header */}
                <div className="p-6 pb-4">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                            {/* Task Type & Featured Badge */}
                            <div className="flex items-center space-x-2 mb-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${task.type === 'internship'
                                    ? 'bg-blue-100 text-blue-800'
                                    : task.type === 'project'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-purple-100 text-purple-800'
                                    }`}>
                                    {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                                </span>

                                {task.isFeatured && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                        ⭐ Featured
                                    </span>
                                )}
                            </div>

                            {/* Title */}
                            <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
                                {task.title}
                            </h3>

                            {/* Company Info */}
                            {showCompany && task.companyId && (
                                <div className="flex items-center space-x-2 mb-3">
                                    <div className="flex items-center space-x-2">
                                        {task.companyId.logo ? (
                                            <Image
                                                src={task.companyId.logo}
                                                alt={task.companyId.companyName}
                                                width={20}
                                                height={20}
                                                className="rounded"
                                            />
                                        ) : (
                                            <BuildingOfficeIcon className="w-5 h-5 text-gray-400" />
                                        )}
                                        <span className="text-sm font-medium text-gray-700">
                                            {task.companyId.companyName}
                                        </span>
                                        {task.companyId.isVerified && (
                                            <CheckBadgeIcon className="w-4 h-4 text-blue-500" />
                                        )}
                                    </div>
                                    {task.companyId.location && (
                                        <span className="text-sm text-gray-500">
                                            • {task.companyId.location.city}, {task.companyId.location.country}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            disabled={saveLoading}
                            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            {isSaved ? (
                                <BookmarkSolidIcon className="w-5 h-5 text-blue-600" />
                            ) : (
                                <BookmarkIcon className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                            )}
                        </button>
                    </div>

                    {/* Description */}
                    <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                        {getTextPreview(task.description, 120)}
                    </p>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-1 mb-4">
                        {task.skillsRequired.slice(0, 4).map((skill, index) => (
                            <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
                            >
                                {skill.name}
                            </span>
                        ))}
                        {task.skillsRequired.length > 4 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-500">
                                +{task.skillsRequired.length - 4} more
                            </span>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                            {/* Budget */}
                            <div className="flex items-center space-x-1 text-gray-600">
                                <CurrencyDollarIcon className="w-4 h-4" />
                                <span className="font-medium">{budgetDisplay}</span>
                            </div>

                            {/* Duration */}
                            <div className="flex items-center space-x-1 text-gray-600">
                                <ClockIcon className="w-4 h-4" />
                                <span>{durationDisplay}</span>
                            </div>

                            {/* Work Type */}
                            <div className="flex items-center space-x-1 text-gray-600">
                                <MapPinIcon className="w-4 h-4" />
                                <span className="capitalize">{task.workType}</span>
                            </div>
                        </div>

                        {/* Time Remaining */}
                        <div className="flex items-center space-x-1">
                            <CalendarIcon className="w-4 h-4 text-gray-400" />
                            <span className={`font-medium ${getUrgencyColor()}`}>
                                {getUrgencyText()}
                            </span>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <div className="flex items-center space-x-1">
                                <EyeIcon className="w-4 h-4" />
                                <span>{task.views} views</span>
                            </div>
                            <div>
                                {task.applicationCount}/{task.maxApplications} applications
                            </div>
                        </div>

                        {/* Experience Level */}
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${taskService.getExperienceLevelColor(task.experienceLevel)}`}>
                            {task.experienceLevel.charAt(0).toUpperCase() + task.experienceLevel.slice(1)} level
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}