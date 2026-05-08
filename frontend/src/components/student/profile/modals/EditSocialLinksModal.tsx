"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/shared/Modal";
import { Loader2, Linkedin, Github, Globe, Twitter } from "lucide-react";
import { SocialLinks } from "@/types/student.types";

interface EditSocialLinksModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentLinks: SocialLinks;
    onSave: (links: Partial<SocialLinks>) => Promise<void>;
}

export default function EditSocialLinksModal({ isOpen, onClose, currentLinks, onSave }: EditSocialLinksModalProps) {
    const [formData, setFormData] = useState(currentLinks);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setFormData(currentLinks);
    }, [currentLinks, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData);
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Social Links" size="md">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-[#0F172A] mb-2">
                        <Linkedin className="w-4 h-4" /> LinkedIn
                    </label>
                    <input type="url" value={formData.linkedin || ""} onChange={(e) => setFormData({ ...formData, linkedin: e.target.value || null })} placeholder="https://linkedin.com/in/yourprofile" className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
                </div>

                <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-[#0F172A] mb-2">
                        <Github className="w-4 h-4" /> GitHub
                    </label>
                    <input type="url" value={formData.github || ""} onChange={(e) => setFormData({ ...formData, github: e.target.value || null })} placeholder="https://github.com/yourusername" className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
                </div>

                <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-[#0F172A] mb-2">
                        <Globe className="w-4 h-4" /> Portfolio
                    </label>
                    <input type="url" value={formData.portfolio || ""} onChange={(e) => setFormData({ ...formData, portfolio: e.target.value || null })} placeholder="https://yourportfolio.com" className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
                </div>

                <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-[#0F172A] mb-2">
                        <Twitter className="w-4 h-4" /> Twitter
                    </label>
                    <input type="url" value={formData.twitter || ""} onChange={(e) => setFormData({ ...formData, twitter: e.target.value || null })} placeholder="https://twitter.com/yourusername" className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
                </div>

                <div className="flex gap-3 mt-6">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-[#E2E8F0] text-[#475569] font-medium rounded-lg hover:bg-[#F8FAFC]">Cancel</button>
                    <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-[#4F46E5] text-white font-medium rounded-lg hover:bg-[#4338CA] disabled:opacity-50 flex items-center justify-center gap-2">
                        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : "Save Changes"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
