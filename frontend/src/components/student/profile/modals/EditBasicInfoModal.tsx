"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/shared/Modal";
import { Loader2, Upload, FileText, X } from "lucide-react";

interface EditBasicInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentData: {
        firstName: string;
        lastName: string;
        headline: string;
        phone: string;
        city: string;
        country: string;
    };
    resumeUrl: string | null;
    onSave: (data: any) => Promise<void>;
    onUploadResume: (file: File) => Promise<void>;
    onDeleteResume: () => Promise<void>;
}

export default function EditBasicInfoModal({ isOpen, onClose, currentData, resumeUrl, onSave, onUploadResume, onDeleteResume }: EditBasicInfoModalProps) {
    const [formData, setFormData] = useState(currentData);
    const [loading, setLoading] = useState(false);
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [uploadingResume, setUploadingResume] = useState(false);

    useEffect(() => {
        setFormData(currentData);
        setResumeFile(null);
    }, [currentData, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave({
                firstName: formData.firstName,
                lastName: formData.lastName,
                headline: formData.headline,
                phone: formData.phone,
                location: {
                    city: formData.city,
                    country: formData.country
                }
            });

            // Upload resume if selected
            if (resumeFile) {
                setUploadingResume(true);
                await onUploadResume(resumeFile);
                setUploadingResume(false);
            }

            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setResumeFile(file);
        }
    };

    const handleDeleteResume = async () => {
        if (confirm("Are you sure you want to delete your resume?")) {
            setUploadingResume(true);
            try {
                await onDeleteResume();
            } finally {
                setUploadingResume(false);
            }
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile" size="md">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-[#0F172A] mb-2">First Name *</label>
                        <input type="text" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#0F172A] mb-2">Last Name *</label>
                        <input type="text" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-[#0F172A] mb-2">Headline</label>
                    <input type="text" value={formData.headline} onChange={(e) => setFormData({ ...formData, headline: e.target.value })} placeholder="e.g., Full Stack Developer | AI Enthusiast" maxLength={100} className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-[#0F172A] mb-2">Phone</label>
                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+1 (555) 123-4567" className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-[#0F172A] mb-2">City</label>
                        <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="San Francisco" className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#0F172A] mb-2">Country</label>
                        <input type="text" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} placeholder="USA" className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
                    </div>
                </div>

                {/* Resume Upload Section */}
                <div className="pt-4 border-t border-[#E2E8F0]">
                    <label className="block text-sm font-semibold text-[#0F172A] mb-2">Resume</label>

                    {resumeUrl ? (
                        <div className="flex items-center justify-between p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-[#10B981]" />
                                <div>
                                    <p className="text-sm font-medium text-[#0F172A]">Resume uploaded</p>
                                    <a href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${resumeUrl}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#4F46E5] hover:underline">
                                        View Resume
                                    </a>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleDeleteResume}
                                disabled={uploadingResume}
                                className="p-1.5 hover:bg-[#FEE2E2] rounded transition-colors"
                            >
                                <X className="w-4 h-4 text-[#EF4444]" />
                            </button>
                        </div>
                    ) : resumeFile ? (
                        <div className="flex items-center justify-between p-3 bg-[#EEF2FF] border border-[#C7D2FE] rounded-lg">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-[#4F46E5]" />
                                <div>
                                    <p className="text-sm font-medium text-[#0F172A]">{resumeFile.name}</p>
                                    <p className="text-xs text-[#64748B]">{(resumeFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setResumeFile(null)}
                                className="p-1.5 hover:bg-[#FEE2E2] rounded transition-colors"
                            >
                                <X className="w-4 h-4 text-[#EF4444]" />
                            </button>
                        </div>
                    ) : (
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-[#E2E8F0] rounded-lg cursor-pointer hover:border-[#4F46E5] hover:bg-[#F8FAFC] transition-colors">
                            <Upload className="w-6 h-6 text-[#94A3B8] mb-1" />
                            <span className="text-sm text-[#64748B]">Upload Resume</span>
                            <span className="text-xs text-[#94A3B8] mt-0.5">PDF, DOC, DOCX (max 10MB)</span>
                            <input type="file" accept=".pdf,.doc,.docx" onChange={handleResumeChange} className="hidden" />
                        </label>
                    )}
                </div>

                <div className="flex gap-3 mt-6">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-[#E2E8F0] text-[#475569] font-medium rounded-lg hover:bg-[#F8FAFC]">Cancel</button>
                    <button type="submit" disabled={loading || uploadingResume} className="flex-1 px-4 py-2.5 bg-[#4F46E5] text-white font-medium rounded-lg hover:bg-[#4338CA] disabled:opacity-50 flex items-center justify-center gap-2">
                        {(loading || uploadingResume) ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : "Save Changes"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
