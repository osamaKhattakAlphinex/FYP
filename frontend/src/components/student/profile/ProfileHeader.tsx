"use client";

import { Camera, MapPin, Pencil } from "lucide-react";
import { useState } from "react";
import AvatarUpload from "@/components/shared/AvatarUpload";

interface ProfileHeaderProps {
    fullName: string;
    headline: string;
    city: string;
    country: string;
    profilePicture: string | null;
    isAvailable: boolean;
    onToggleAvailability: () => void;
    onUpdateAvatar: (file: File) => void;
    onEditHeadline: () => void;
}

export default function ProfileHeader({
    fullName,
    headline,
    city,
    country,
    profilePicture,
    isAvailable,
    onToggleAvailability,
    onUpdateAvatar,
    onEditHeadline,
}: ProfileHeaderProps) {
    const [showAvatarUpload, setShowAvatarUpload] = useState(false);
    const [showToast, setShowToast] = useState(false);

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const handleToggleAvailability = () => {
        onToggleAvailability();
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    return (
        <>
            <div className="relative">
                <div className="h-20 bg-gradient-to-r from-[#4F46E5] to-[#06B6D4] rounded-t-2xl" />
                <div className="px-6 pb-6">
                    <div className="relative inline-block -mt-11 mb-4">
                        <div className="w-[88px] h-[88px] rounded-full border-3 border-white bg-[#EEF2FF] flex items-center justify-center overflow-hidden">
                            {profilePicture ? (
                                <img
                                    src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${profilePicture}`}
                                    alt={fullName}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-[28px] font-bold text-[#4F46E5]">
                                    {getInitials(fullName)}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => setShowAvatarUpload(true)}
                            className="absolute bottom-0 right-0 w-7 h-7 bg-[#4F46E5] rounded-full flex items-center justify-center border-2 border-white hover:bg-[#4338CA] transition-colors duration-200"
                            aria-label="Change profile picture"
                        >
                            <Camera className="w-3.5 h-3.5 text-white" />
                        </button>
                    </div>
                    <div className="group relative">
                        <h1 className="text-lg font-bold text-[#0F172A]">{fullName}</h1>
                        <p className="text-[13px] text-[#475569] leading-relaxed mt-1">
                            {headline}
                        </p>
                        <button
                            onClick={onEditHeadline}
                            className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1.5 bg-[#F8FAFC] rounded-lg hover:bg-[#EEF2FF] transition-all duration-200"
                            aria-label="Edit headline"
                        >
                            <Pencil className="w-3.5 h-3.5 text-[#475569]" />
                        </button>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[13px] text-[#94A3B8]">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>
                            {city}, {country}
                        </span>
                    </div>
                    <button
                        onClick={handleToggleAvailability}
                        className={`mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${isAvailable
                            ? "bg-[#DCFCE7] text-[#16A34A]"
                            : "bg-[#F1F5F9] text-[#64748B]"
                            }`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {isAvailable ? "Open to Opportunities" : "Not Available"}
                    </button>
                </div>
            </div>

            {showAvatarUpload && (
                <AvatarUpload
                    currentImage={profilePicture}
                    initials={getInitials(fullName)}
                    onUpload={onUpdateAvatar}
                    onClose={() => setShowAvatarUpload(false)}
                />
            )}

            {showToast && (
                <div className="fixed top-4 right-4 z-50 bg-white border-l-4 border-[#10B981] rounded-lg shadow-lg p-3 flex items-center gap-3 animate-in slide-in-from-right duration-300">
                    <div className="w-5 h-5 bg-[#10B981] rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                    </div>
                    <p className="text-sm text-[#0F172A]">Availability updated successfully</p>
                </div>
            )}
        </>
    );
}
