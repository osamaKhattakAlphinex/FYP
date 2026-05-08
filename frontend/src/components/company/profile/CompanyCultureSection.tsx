"use client";

import { Heart, Wifi, Clock, Users, Award, DollarSign, Globe, BookOpen, Github, Star } from 'lucide-react';
import { useState } from 'react';
import SectionCard from '@/components/shared/SectionCard';
import EditModal from '@/components/shared/EditModal';
import EmptyState from '@/components/shared/EmptyState';

interface CompanyCultureSectionProps {
    perks: string[];
    isEditMode?: boolean;
    onUpdate?: (perks: string[]) => void;
}

const PRESET_PERKS = [
    { label: 'Remote Friendly', icon: Wifi },
    { label: 'Flexible Hours', icon: Clock },
    { label: 'Mentorship Program', icon: Users },
    { label: 'Certificate Issued', icon: Award },
    { label: 'Paid Internship', icon: DollarSign },
    { label: 'International Team', icon: Globe },
    { label: 'Learning Budget', icon: BookOpen },
    { label: 'Open Source', icon: Github }
];

const getPerkIcon = (perk: string) => {
    const preset = PRESET_PERKS.find(p => p.label === perk);
    if (preset) return preset.icon;
    return Star;
};

export default function CompanyCultureSection({ perks, isEditMode = false, onUpdate }: CompanyCultureSectionProps) {
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedPerks, setSelectedPerks] = useState<string[]>(perks);
    const [customPerk, setCustomPerk] = useState('');

    const handleTogglePerk = (perk: string) => {
        if (selectedPerks.includes(perk)) {
            setSelectedPerks(selectedPerks.filter(p => p !== perk));
        } else {
            if (selectedPerks.length < 15) {
                setSelectedPerks([...selectedPerks, perk]);
            }
        }
    };

    const handleAddCustomPerk = () => {
        if (customPerk.trim() && !selectedPerks.includes(customPerk.trim()) && selectedPerks.length < 15) {
            setSelectedPerks([...selectedPerks, customPerk.trim()]);
            setCustomPerk('');
        }
    };

    const handleSave = () => {
        onUpdate?.(selectedPerks);
        setShowEditModal(false);
    };

    if (!isEditMode && perks.length === 0) {
        return (
            <SectionCard
                icon={Heart}
                title="Culture & Perks"
            >
                <div className="text-center py-8">
                    <Heart className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
                    <p className="text-[#64748B] text-sm">No culture or perks information available</p>
                </div>
            </SectionCard>
        );
    }

    return (
        <>
            <SectionCard
                icon={Heart}
                title="Culture & Perks"
                onEdit={isEditMode ? () => setShowEditModal(true) : undefined}
            >
                {perks.length === 0 ? (
                    <EmptyState
                        icon={Heart}
                        title="No perks added"
                        description="Highlight what makes your company a great place to intern"
                        ctaLabel="Add Perks"
                        onCtaClick={() => setShowEditModal(true)}
                    />
                ) : (
                    <div className="flex flex-wrap gap-2.5">
                        {perks.map((perk, index) => {
                            const Icon = getPerkIcon(perk);
                            return (
                                <div
                                    key={index}
                                    className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5"
                                >
                                    <Icon className="w-4 h-4 text-[#4F46E5]" />
                                    <span className="text-[13px] font-medium text-[#0F172A]">{perk}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </SectionCard>

            {showEditModal && (
                <EditModal
                    isOpen={showEditModal}
                    title="Edit Culture & Perks"
                    onSave={handleSave}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedPerks(perks);
                        setCustomPerk('');
                    }}
                >
                    <div className="space-y-4">
                        <p className="text-sm text-[#475569]">
                            Select up to 15 perks that describe your company culture ({selectedPerks.length}/15)
                        </p>

                        <div className="grid grid-cols-2 gap-2.5">
                            {PRESET_PERKS.map((perk) => {
                                const Icon = perk.icon;
                                const isSelected = selectedPerks.includes(perk.label);
                                return (
                                    <button
                                        key={perk.label}
                                        onClick={() => handleTogglePerk(perk.label)}
                                        className={`relative flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${isSelected
                                            ? 'border-[#4F46E5] bg-[#EEF2FF]'
                                            : 'border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#C7D2FE]'
                                            }`}
                                    >
                                        <Icon className={`w-4 h-4 ${isSelected ? 'text-[#4F46E5]' : 'text-[#64748B]'}`} />
                                        <span className={`text-sm font-medium ${isSelected ? 'text-[#4F46E5]' : 'text-[#0F172A]'}`}>
                                            {perk.label}
                                        </span>
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 w-4 h-4 bg-[#4F46E5] rounded-full flex items-center justify-center">
                                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Custom Perks */}
                        {selectedPerks.filter(p => !PRESET_PERKS.find(preset => preset.label === p)).length > 0 && (
                            <div>
                                <p className="text-sm font-medium text-[#0F172A] mb-2">Custom Perks:</p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedPerks
                                        .filter(p => !PRESET_PERKS.find(preset => preset.label === p))
                                        .map((perk, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-2 bg-[#EEF2FF] border border-[#4F46E5] rounded-lg px-3 py-1.5"
                                            >
                                                <span className="text-sm text-[#4F46E5]">{perk}</span>
                                                <button
                                                    onClick={() => setSelectedPerks(selectedPerks.filter(p => p !== perk))}
                                                    className="text-[#4F46E5] hover:text-[#4338CA]"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
                                Add Custom Perk
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={customPerk}
                                    onChange={(e) => setCustomPerk(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddCustomPerk()}
                                    placeholder="e.g. Free Lunch, Gym Membership..."
                                    className="flex-1 px-4 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                                    disabled={selectedPerks.length >= 15}
                                />
                                <button
                                    onClick={handleAddCustomPerk}
                                    disabled={!customPerk.trim() || selectedPerks.length >= 15}
                                    className="px-4 py-2.5 bg-[#4F46E5] text-white text-sm font-medium rounded-lg hover:bg-[#4338CA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>
                </EditModal>
            )}
        </>
    );
}
