"use client";

import { Briefcase, Users, CheckCircle, Star, BarChart2 } from 'lucide-react';
import Link from 'next/link';

interface CompanyStatsPanelProps {
    totalTasksPosted: number;
    totalInterns: number;
    activeTasks: number;
    avgRating: number;
    isEditMode?: boolean;
}

export default function CompanyStatsPanel({
    totalTasksPosted,
    totalInterns,
    activeTasks,
    avgRating,
    isEditMode = false
}: CompanyStatsPanelProps) {
    const stats = [
        { icon: Briefcase, label: 'Tasks Posted', value: totalTasksPosted },
        { icon: Users, label: 'Total Interns', value: totalInterns },
        { icon: CheckCircle, label: 'Active Tasks', value: activeTasks },
        { icon: Star, label: 'Avg Rating', value: `${avgRating.toFixed(1)}/5` }
    ];

    return (
        <div className="bg-white border border-input rounded-2xl p-6">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-5">
                Company Stats
            </h3>

            <div className="space-y-4">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-brand-50 rounded-full flex items-center justify-center">
                                    <Icon className="w-4 h-4 text-brand-700" />
                                </div>
                                <span className="text-sm text-foreground/85">{stat.label}</span>
                            </div>
                            <span className="text-lg font-bold text-foreground">{stat.value}</span>
                        </div>
                    );
                })}
            </div>

            <div className="mt-5 pt-5 border-t border-input">
                {isEditMode && (
                    <Link
                        href="/company/analytics"
                        className="flex items-center justify-center gap-2 text-[13px] font-medium text-brand-700 hover:text-[#4338CA] transition-colors duration-200"
                    >
                        <BarChart2 className="w-4 h-4" />
                        <span>View Full Analytics</span>
                    </Link>
                )}
            </div>
        </div>
    );
}
