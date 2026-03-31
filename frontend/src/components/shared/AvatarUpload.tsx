"use client";

import { UploadCloud, X } from "lucide-react";
import { useState, useRef, DragEvent } from "react";

interface AvatarUploadProps {
    currentImage?: string | null;
    currentAvatar?: string | null;
    initials?: string;
    onUpload?: (file: File) => void;
    onSave?: (url: any) => void;
    onClose: () => void;
    label?: string;
}

export default function AvatarUpload({
    currentImage,
    currentAvatar,
    initials = "?",
    onUpload,
    onSave,
    onClose,
    label,
}: AvatarUploadProps) {
    const [preview, setPreview] = useState<string | null>(currentImage || currentAvatar || null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = (file: File) => {
        if (file && file.type.startsWith("image/")) {
            if (file.size <= 5 * 1024 * 1024) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPreview(reader.result as string);
                };
                reader.readAsDataURL(file);
            } else {
                alert("File size must be less than 5MB");
            }
        }
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const handleSave = () => {
        if (fileInputRef.current?.files?.[0]) {
            if (onUpload) {
                onUpload(fileInputRef.current.files[0]);
            } else if (onSave) {
                onSave(preview);
            }
            onClose();
        }
    };

    const handleRemove = () => {
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative bg-white rounded-[20px] w-full max-w-[480px] shadow-[0_25px_60px_rgba(0,0,0,0.15)] animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-7 py-6 border-b border-[#E2E8F0]">
                    <h2 className="text-lg font-bold text-[#0F172A]">Upload Profile Photo</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center bg-[#F8FAFC] rounded-lg hover:bg-[#E2E8F0] transition-colors duration-200"
                    >
                        <X className="w-4 h-4 text-[#475569]" />
                    </button>
                </div>
                <div className="px-7 py-6">
                    {preview ? (
                        <div className="text-center">
                            <div className="inline-block relative">
                                <img
                                    src={preview}
                                    alt="Preview"
                                    className="w-24 h-24 rounded-full object-cover border-3 border-white shadow-md"
                                />
                            </div>
                            <div className="mt-4 flex gap-2 justify-center">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] text-sm font-medium rounded-lg hover:bg-[#EEF2FF] hover:border-[#4F46E5] hover:text-[#4F46E5] transition-all duration-200"
                                >
                                    Change
                                </button>
                                <button
                                    onClick={handleRemove}
                                    className="px-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] text-[#EF4444] text-sm font-medium rounded-lg hover:bg-[#FEF2F2] hover:border-[#EF4444] transition-all duration-200"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${isDragging
                                ? "border-[#4F46E5] bg-[#EEF2FF]"
                                : "border-[#C7D2FE] bg-[#F8FAFC] hover:bg-[#EEF2FF] hover:border-[#4F46E5]"
                                }`}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <UploadCloud className="w-8 h-8 text-[#4F46E5] mx-auto mb-3" />
                            <p className="text-sm font-medium text-[#0F172A] mb-1">
                                Drag & drop your photo here
                            </p>
                            <p className="text-sm text-[#475569] mb-1">or browse to upload</p>
                            <p className="text-xs text-[#94A3B8]">PNG, JPG up to 5MB</p>
                        </div>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </div>
                <div className="flex items-center justify-end gap-2.5 px-7 py-5 border-t border-[#E2E8F0]">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 bg-white border border-[#E2E8F0] text-[#475569] text-sm font-medium rounded-lg hover:bg-[#F8FAFC] transition-colors duration-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!preview}
                        className="px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-semibold rounded-lg hover:bg-[#4338CA] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Save Photo
                    </button>
                </div>
            </div>
        </div>
    );
}
