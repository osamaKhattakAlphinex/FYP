"use client";

import { Users, Linkedin, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import SectionCard from '@/components/shared/SectionCard';
import EditModal from '@/components/shared/EditModal';
import EmptyState from '@/components/shared/EmptyState';
import type { TeamMember } from '@/types/company.types';

interface CompanyTeamSectionProps {
    teamMembers: TeamMember[];
    isEditMode?: boolean;
    onUpdate?: (members: TeamMember[]) => void;
}

export default function CompanyTeamSection({ teamMembers, isEditMode = false, onUpdate }: CompanyTeamSectionProps) {
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [showMenu, setShowMenu] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        role: '',
        avatar: '',
        linkedinUrl: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleAddMember = () => {
        setEditingMember(null);
        setFormData({ name: '', role: '', avatar: '', linkedinUrl: '' });
        setErrors({});
        setShowEditModal(true);
    };

    const handleEditMember = (member: TeamMember) => {
        setEditingMember(member);
        setFormData({
            name: member.name,
            role: member.role,
            avatar: member.avatar || '',
            linkedinUrl: member.linkedinUrl || ''
        });
        setErrors({});
        setShowEditModal(true);
        setShowMenu(null);
    };

    const handleDeleteMember = (memberId: string) => {
        onUpdate?.(teamMembers.filter(m => m.id !== memberId));
        setShowMenu(null);
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim() || formData.name.length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }
        if (!formData.role.trim() || formData.role.length < 2) {
            newErrors.role = 'Role must be at least 2 characters';
        }
        if (formData.linkedinUrl && !formData.linkedinUrl.match(/^https?:\/\/.+/)) {
            newErrors.linkedinUrl = 'Please enter a valid URL';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validateForm()) return;

        const newMember: TeamMember = {
            id: editingMember?.id || Date.now().toString(),
            name: formData.name,
            role: formData.role,
            avatar: formData.avatar || null,
            linkedinUrl: formData.linkedinUrl || null
        };

        if (editingMember) {
            onUpdate?.(teamMembers.map(m => m.id === editingMember.id ? newMember : m));
        } else {
            onUpdate?.([...teamMembers, newMember]);
        }

        setShowEditModal(false);
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    if (!isEditMode && teamMembers.length === 0) {
        return null;
    }

    return (
        <>
            <SectionCard
                icon={Users}
                title="Meet the Team"
                action={
                    isEditMode ? (
                        <button
                            onClick={handleAddMember}
                            className="text-sm font-medium text-[#4F46E5] hover:text-[#4338CA] transition-colors duration-200"
                        >
                            Add Member
                        </button>
                    ) : undefined
                }
            >
                {teamMembers.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="No team members yet"
                        description="Introduce your team to students"
                        ctaLabel="Add Team Member"
                        onCtaClick={handleAddMember}
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {teamMembers.map((member) => (
                            <div
                                key={member.id}
                                className="relative bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-5 text-center"
                            >
                                {isEditMode && (
                                    <div className="absolute top-3 right-3">
                                        <button
                                            onClick={() => setShowMenu(showMenu === member.id ? null : member.id)}
                                            className="p-1 hover:bg-[#E2E8F0] rounded-lg transition-colors duration-200"
                                        >
                                            <MoreVertical className="w-4 h-4 text-[#64748B]" />
                                        </button>
                                        {showMenu === member.id && (
                                            <div className="absolute top-8 right-0 bg-white border border-[#E2E8F0] rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                                                <button
                                                    onClick={() => handleEditMember(member)}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#475569] hover:bg-[#F8FAFC] transition-colors duration-200"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteMember(member.id)}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#EF4444] hover:bg-[#FEF2F2] transition-colors duration-200"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Remove
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="w-16 h-16 mx-auto mb-3 rounded-full border-2 border-white shadow-md overflow-hidden">
                                    {member.avatar ? (
                                        <img
                                            src={member.avatar}
                                            alt={`${member.name}, ${member.role}`}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-[#EEF2FF] flex items-center justify-center">
                                            <span className="text-lg font-bold text-[#4F46E5]">
                                                {getInitials(member.name)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <h4 className="text-[15px] font-semibold text-[#0F172A]">{member.name}</h4>
                                <p className="text-[13px] text-[#475569] mt-0.5">{member.role}</p>

                                {member.linkedinUrl && (
                                    <a
                                        href={member.linkedinUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center w-8 h-8 mt-3 bg-[#EEF2FF] rounded-full hover:bg-[#DBE4FE] transition-colors duration-200"
                                        aria-label={`${member.name}'s LinkedIn profile`}
                                    >
                                        <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </SectionCard>

            {showEditModal && (
                <EditModal
                    isOpen={showEditModal}
                    title={editingMember ? 'Edit Team Member' : 'Add Team Member'}
                    onSave={handleSave}
                    onClose={() => {
                        setShowEditModal(false);
                        setErrors({});
                    }}
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
                                Full Name <span className="text-[#EF4444]">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. John Doe"
                                className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                            />
                            {errors.name && (
                                <p className="text-xs text-[#EF4444] mt-1 flex items-center gap-1">
                                    <span>⚠</span> {errors.name}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
                                Role/Position <span className="text-[#EF4444]">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                placeholder="e.g. CTO, HR Lead"
                                className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                            />
                            {errors.role && (
                                <p className="text-xs text-[#EF4444] mt-1 flex items-center gap-1">
                                    <span>⚠</span> {errors.role}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
                                Avatar URL
                            </label>
                            <input
                                type="url"
                                value={formData.avatar}
                                onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                                placeholder="https://example.com/avatar.jpg"
                                className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
                                LinkedIn URL
                            </label>
                            <input
                                type="url"
                                value={formData.linkedinUrl}
                                onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                                placeholder="https://linkedin.com/in/username"
                                className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                            />
                            {errors.linkedinUrl && (
                                <p className="text-xs text-[#EF4444] mt-1 flex items-center gap-1">
                                    <span>⚠</span> {errors.linkedinUrl}
                                </p>
                            )}
                        </div>
                    </div>
                </EditModal>
            )}
        </>
    );
}
