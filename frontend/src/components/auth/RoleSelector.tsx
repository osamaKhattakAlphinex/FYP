"use client";

import { UserRole } from '@/types/auth.types';
import { Briefcase, GraduationCap, Users, Shield } from 'lucide-react';

interface RoleSelectorProps {
    selectedRole: UserRole | null;
    onRoleSelect: (role: UserRole) => void;
}

const roles = [
    {
        value: 'student' as UserRole,
        label: 'Student',
        description: 'Find micro-internships and build your portfolio',
        icon: GraduationCap,
        color: 'from-[#4F46E5] to-[#6366F1]'
    },
    {
        value: 'company' as UserRole,
        label: 'Company',
        description: 'Post tasks and find talented students',
        icon: Briefcase,
        color: 'from-[#06B6D4] to-[#0891B2]'
    },

];

export default function RoleSelector({ selectedRole, onRoleSelect }: RoleSelectorProps) {
    return (
        <div className="grid grid-cols-2 gap-3">
            {roles.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.value;

                return (
                    <button
                        key={role.value}
                        type="button"
                        onClick={() => onRoleSelect(role.value)}
                        className={`
                            relative p-4 rounded-xl border-2 text-left transition-all duration-200
                            ${isSelected
                                ? 'border-[#4F46E5] bg-[#EEF2FF] shadow-sm'
                                : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
                            }
                        `}
                    >
                        <div className={`
                            w-10 h-10 rounded-lg bg-gradient-to-br ${role.color} 
                            flex items-center justify-center mb-3
                            ${isSelected ? 'scale-110' : ''}
                            transition-transform duration-200
                        `}>
                            <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="font-semibold text-[#0F172A] text-sm mb-1">
                            {role.label}
                        </div>
                        <div className="text-xs text-[#64748B] leading-snug">
                            {role.description}
                        </div>
                        {isSelected && (
                            <div className="absolute top-3 right-3 w-5 h-5 bg-[#4F46E5] rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
