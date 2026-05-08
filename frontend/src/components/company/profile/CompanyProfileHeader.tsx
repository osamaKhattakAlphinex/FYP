"use client";

import { Camera, MapPin, Building2, Users, Calendar, Globe, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import VerificationBadge from './VerificationBadge';
import AvatarUpload from '@/components/shared/AvatarUpload';
import type { CompanyProfile } from '@/types/company.types';

interface CompanyProfileHeaderProps {
    profile: CompanyProfile;
    isEditMode?: boolean;
    onEditCover?: (file: File) => void;
    onEditLogo?: (file: File) => void;
    onEditInfo?: () => void;
}

export default function CompanyProfileHeader({
    profile,
    isEditMode = false,
    onEditCover,
    onEditLogo,
    onEditInfo
}: CompanyProfileHeaderProps) {
    const [showLogoUpload, setShowLogoUpload] = useState(false);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && onEditCover) {
            onEditCover(file);
        }
    };

    return (
        <div className="w-full">
            {/* Cover Image */}
            <div className="relative w-full h-[220px] md:h-[220px] sm:h-[140px]">
                {profile.coverImage ? (
                    <img
                        src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${profile.coverImage}`}
                        alt={`${profile.companyName} cover image`}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-[#4F46E5] to-[#06B6D4]" />
                )}
                {isEditMode && onEditCover && (
                    <>
                        <input
                            type="file"
                            id="cover-upload"
                            accept="image/*"
                            onChange={handleCoverChange}
                            className="hidden"
                        />
                        <label
                            htmlFor="cover-upload"
                            className="absolute top-4 right-4 flex items-center gap-2 bg-[rgba(15,23,42,0.5)] backdrop-blur-sm text-white text-[13px] font-medium px-3.5 py-2 rounded-lg hover:bg-[rgba(15,23,42,0.7)] transition-all duration-200 cursor-pointer"
                        >
                            <Camera className="w-4 h-4" />
                            <span>Edit Cover</span>
                        </label>
                    </>
                )}
            </div>

            {/* Company Identity Block */}
            <div className="bg-white border-b border-[#E2E8F0] pb-6">
                <div className="max-w-[1200px] mx-auto px-8">
                    {/* Logo */}
                    <div className="relative w-24 h-24 -mt-12">
                        <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg overflow-hidden">
                            {profile.logo ? (
                                <img
                                    src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${profile.logo}`}
                                    alt={`${profile.companyName} logo`}
                                    className="w-full h-full object-contain bg-white"
                                />
                            ) : (
                                <div className="w-full h-full bg-[#EEF2FF] flex items-center justify-center">
                                    <span className="text-4xl font-extrabold text-[#4F46E5]">
                                        {getInitials(profile.companyName)}
                                    </span>
                                </div>
                            )}
                        </div>
                        {isEditMode && onEditLogo && (
                            <button
                                onClick={() => setShowLogoUpload(true)}
                                className="absolute bottom-0 right-0 w-8 h-8 bg-[#4F46E5] rounded-full flex items-center justify-center shadow-md hover:bg-[#4338CA] transition-colors duration-200"
                                aria-label="Edit company logo"
                            >
                                <Camera className="w-4 h-4 text-white" />
                            </button>
                        )}
                    </div>

                    {/* Company Info */}
                    <div className="mt-4">
                        {/* Row 1: Name + Verified Badge */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-[26px] font-extrabold text-[#0F172A]">{profile.companyName}</h1>
                            <VerificationBadge isVerified={profile.isVerified} size="md" />
                        </div>

                        {/* Row 2: Tagline */}
                        <p className="text-base text-[#475569] mt-1">{profile.tagline}</p>

                        {/* Row 3: Meta Info */}
                        <div className="flex items-center gap-4 mt-3 flex-wrap text-[13px] text-[#64748B]">
                            <div className="flex items-center gap-1.5">
                                <MapPin className="w-4 h-4" />
                                <span>{profile.headquarters}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Building2 className="w-4 h-4" />
                                <span>{profile.industry}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Users className="w-4 h-4" />
                                <span>{profile.companySize} employees</span>
                            </div>
                            {profile.founded && (
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4" />
                                    <span>Founded {profile.founded}</span>
                                </div>
                            )}
                            {profile.website && (
                                <a
                                    href={profile.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-[#4F46E5] hover:underline"
                                >
                                    <Globe className="w-4 h-4" />
                                    <span>{new URL(profile.website).hostname}</span>
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                        </div>

                        {/* Row 4: Edit Button (Edit Mode Only) */}
                        {isEditMode && onEditInfo && (
                            <button
                                onClick={onEditInfo}
                                className="mt-4 flex items-center gap-2 bg-white border border-[#E2E8F0] text-[#475569] text-sm font-medium px-4.5 py-2.5 rounded-lg hover:border-[#4F46E5] hover:text-[#4F46E5] transition-all duration-200"
                            >
                                <Camera className="w-4 h-4" />
                                <span>Edit Info</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Avatar Upload Modal */}
            {showLogoUpload && onEditLogo && (
                <AvatarUpload
                    currentAvatar={profile.logo}
                    onUpload={(file) => {
                        onEditLogo(file);
                        setShowLogoUpload(false);
                    }}
                    onClose={() => setShowLogoUpload(false)}
                    label="Company Logo"
                />
            )}
        </div>
    );
}
