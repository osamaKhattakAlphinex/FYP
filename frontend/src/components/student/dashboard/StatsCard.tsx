"use client";

import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { DashboardStats } from '@/types/dashboard.types';

interface StatsCardProps {
    stat: DashboardStats;
    icon: LucideIcon;
}

export default function StatsCard({ stat, icon: Icon }: StatsCardProps) {
    return (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 hover:shadow-lg transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#EEF2FF] to-[#E0F2FE] rounded-xl flex items-center justify-center">
                    <Icon className="w-6 h-6 text-[#4F46E5]" />
                </div>
                {stat.change && (
                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${stat.trend === 'up'
                        ? 'bg-[#DCFCE7] text-[#16A34A]'
                        : 'bg-[#FEE2E2] text-[#DC2626]'
                        }`}>
                        {stat.trend === 'up' ? (
                            <TrendingUp className="w-3 h-3" />
                        ) : (
                            <TrendingDown className="w-3 h-3" />
                        )}
                        {stat.change}
                    </div>
                )}
            </div>
            <div>
                <p className="text-[#64748B] text-sm font-medium mb-1">{stat.label}</p>
                <p className="text-3xl font-extrabold text-[#0F172A]">{stat.value}</p>
            </div>
        </div>
    );
}
