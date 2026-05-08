'use client'

import { UserRole } from '@/types/auth.types'
import { Briefcase, GraduationCap, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RoleSelectorProps {
    selectedRole: UserRole | null
    onRoleSelect: (role: UserRole) => void
}

const roles = [
    {
        value: 'student' as UserRole,
        label: 'I\'m a student',
        description: 'Find tasks, build proof of work',
        icon: GraduationCap,
    },
    {
        value: 'company' as UserRole,
        label: 'I\'m a company',
        description: 'Post tasks, hire talent',
        icon: Briefcase,
    },
]

export default function RoleSelector({ selectedRole, onRoleSelect }: RoleSelectorProps) {
    return (
        <div className="grid grid-cols-2 gap-3">
            {roles.map((role) => {
                const Icon = role.icon
                const isSelected = selectedRole === role.value
                return (
                    <button
                        key={role.value}
                        type="button"
                        onClick={() => onRoleSelect(role.value)}
                        className={cn(
                            'relative rounded-md border p-4 text-left transition-all',
                            isSelected
                                ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-600/20'
                                : 'border-input bg-card hover:border-muted-foreground/40'
                        )}
                    >
                        <div
                            className={cn(
                                'grid h-9 w-9 place-items-center rounded-md',
                                isSelected
                                    ? 'bg-brand-600 text-white'
                                    : 'bg-muted text-muted-foreground'
                            )}
                        >
                            <Icon className="h-4 w-4" />
                        </div>
                        <div className="mt-3 text-sm font-semibold text-foreground">
                            {role.label}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                            {role.description}
                        </div>
                        {isSelected && (
                            <span className="absolute right-3 top-3 grid h-4 w-4 place-items-center rounded-full bg-brand-600 text-white">
                                <Check className="h-3 w-3" strokeWidth={3} />
                            </span>
                        )}
                    </button>
                )
            })}
        </div>
    )
}
