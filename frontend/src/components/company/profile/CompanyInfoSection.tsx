"use client";

import { Info } from 'lucide-react';
import { useState } from 'react';
import SectionCard from '@/components/shared/SectionCard';
import EditModal from '@/components/shared/EditModal';
import type { CompanyProfile, CompanySize } from '@/types/company.types';

interface CompanyInfoSectionProps {
    profile: CompanyProfile;
    isEditMode?: boolean;
    onUpdate?: (data: Partial<CompanyProfile>) => void;
}

const INDUSTRIES = [
    'Technology',
    'Finance',
    'Healthcare',
    'Education',
    'E-Commerce',
    'Marketing',
    'Consulting',
    'Design',
    'Media',
    'Other'
];

const COMPANY_SIZES: { value: CompanySize; label: string }[] = [
    { value: '1-10', label: '1-10 employees' },
    { value: '11-50', label: '11-50 employees' },
    { value: '51-200', label: '51-200 employees' },
    { value: '201-500', label: '201-500 employees' },
    { value: '500+', label: '500+ employees' }
];

export default function CompanyInfoSection({ profile, isEditMode = false, onUpdate }: CompanyInfoSectionProps) {
    const [showEditModal, setShowEditModal] = useState(false);
    const [formData, setFormData] = useState({
        industry: profile.industry,
        companySize: profile.companySize,
        founded: profile.founded?.toString() || '',
        headquarters: profile.headquarters,
        website: profile.website || '',
        email: profile.email,
        phone: profile.phone || ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.industry.trim()) {
            newErrors.industry = 'Industry is required';
        }
        if (!formData.companySize) {
            newErrors.companySize = 'Company size is required';
        }
        if (!formData.headquarters.trim() || formData.headquarters.length < 3) {
            newErrors.headquarters = 'Headquarters must be at least 3 characters';
        }
        if (formData.website && !formData.website.match(/^https?:\/\/.+/)) {
            newErrors.website = 'Please enter a valid URL';
        }
        if (!formData.email.trim() || !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            newErrors.email = 'Please enter a valid email address';
        }
        if (formData.founded && (parseInt(formData.founded) < 1900 || parseInt(formData.founded) > new Date().getFullYear())) {
            newErrors.founded = `Year must be between 1900 and ${new Date().getFullYear()}`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validateForm()) return;

        onUpdate?.({
            industry: formData.industry,
            companySize: formData.companySize,
            founded: formData.founded ? parseInt(formData.founded) : null,
            headquarters: formData.headquarters,
            website: formData.website || null,
            email: formData.email,
            phone: formData.phone || null
        });
        setShowEditModal(false);
    };

    const getCompanySizeLabel = (size: CompanySize) => {
        return COMPANY_SIZES.find(s => s.value === size)?.label || size;
    };

    const getStatusBadge = (status: string) => {
        if (status === 'Active') {
            return (
                <span className="inline-flex items-center bg-[#DCFCE7] text-success text-sm font-medium px-3 py-1 rounded-full">
                    Active
                </span>
            );
        }
        return (
            <span className="inline-flex items-center bg-[#F1F5F9] text-muted-foreground text-sm font-medium px-3 py-1 rounded-full">
                {status}
            </span>
        );
    };

    const detailRows = [
        { label: 'Industry', value: profile.industry },
        { label: 'Company Size', value: getCompanySizeLabel(profile.companySize) },
        { label: 'Founded', value: profile.founded || '—' },
        { label: 'Headquarters', value: profile.headquarters },
        {
            label: 'Website',
            value: profile.website ? (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">
                    {profile.website}
                </a>
            ) : '—'
        },
        { label: 'Contact Email', value: profile.email },
        { label: 'Phone', value: profile.phone || '—' },
        { label: 'Status', value: getStatusBadge(profile.status) }
    ];

    return (
        <>
            <SectionCard
                icon={Info}
                title="Company Details"
                onEdit={isEditMode ? () => setShowEditModal(true) : undefined}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {detailRows.map((row, index) => (
                        <div key={index}>
                            <div className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                {row.label}
                            </div>
                            <div className="text-sm font-medium text-foreground">
                                {row.value}
                            </div>
                        </div>
                    ))}
                </div>
            </SectionCard>

            {showEditModal && (
                <EditModal
                    isOpen={showEditModal}
                    title="Edit Company Details"
                    onSave={handleSave}
                    onClose={() => {
                        setShowEditModal(false);
                        setErrors({});
                    }}
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                Industry <span className="text-destructive">*</span>
                            </label>
                            <select
                                value={formData.industry}
                                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                className="w-full px-4 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                            >
                                <option value="">Select industry</option>
                                {INDUSTRIES.map(industry => (
                                    <option key={industry} value={industry}>{industry}</option>
                                ))}
                            </select>
                            {errors.industry && (
                                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                    <span>⚠</span> {errors.industry}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                Company Size <span className="text-destructive">*</span>
                            </label>
                            <select
                                value={formData.companySize}
                                onChange={(e) => setFormData({ ...formData, companySize: e.target.value as CompanySize })}
                                className="w-full px-4 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                            >
                                <option value="">Select size</option>
                                {COMPANY_SIZES.map(size => (
                                    <option key={size.value} value={size.value}>{size.label}</option>
                                ))}
                            </select>
                            {errors.companySize && (
                                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                    <span>⚠</span> {errors.companySize}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                Founded Year
                            </label>
                            <input
                                type="number"
                                min="1900"
                                max={new Date().getFullYear()}
                                value={formData.founded}
                                onChange={(e) => setFormData({ ...formData, founded: e.target.value })}
                                placeholder="e.g. 2020"
                                className="w-full px-4 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                            />
                            {errors.founded && (
                                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                    <span>⚠</span> {errors.founded}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                Headquarters <span className="text-destructive">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.headquarters}
                                onChange={(e) => setFormData({ ...formData, headquarters: e.target.value })}
                                placeholder="City, Country"
                                className="w-full px-4 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                            />
                            {errors.headquarters && (
                                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                    <span>⚠</span> {errors.headquarters}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                Website
                            </label>
                            <input
                                type="url"
                                value={formData.website}
                                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                placeholder="https://example.com"
                                className="w-full px-4 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                            />
                            {errors.website && (
                                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                    <span>⚠</span> {errors.website}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                Contact Email <span className="text-destructive">*</span>
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="contact@company.com"
                                className="w-full px-4 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                            />
                            {errors.email && (
                                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                    <span>⚠</span> {errors.email}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                Phone
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+1 (555) 123-4567"
                                className="w-full px-4 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                            />
                        </div>
                    </div>
                </EditModal>
            )}
        </>
    );
}
