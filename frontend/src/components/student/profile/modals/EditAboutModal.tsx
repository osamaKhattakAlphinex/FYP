"use client";

import { useState } from "react";
import Modal from "@/components/shared/Modal";
import { Loader2 } from "lucide-react";

interface EditAboutModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentAbout: string;
    onSave: (about: string) => Promise<void>;
}

export default function EditAboutModal({ isOpen, onClose, currentAbout, onSave }: EditAboutModalProps) {
    const [about, setAbout] = useState(currentAbout);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(about);
            onClose();
        } catch (error) {
            console.error("Failed to update about:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit About" size="md">
            <form onSubmit={handleSubmit} className="p-6">
                <div>
                    <label htmlFor="about" className="block text-sm font-semibold text-[#0F172A] mb-2">
                        About You
                    </label>
                    <textarea
                        id="about"
                        value={about}
                        onChange={(e) => setAbout(e.target.value)}
                        rows={8}
                        maxLength={500}
                        className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent resize-none"
                        placeholder="Tell us about yourself, your interests, and career goals..."
                    />
                    <p className="mt-1 text-xs text-[#94A3B8] text-right">{about.length}/500</p>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 border border-[#E2E8F0] text-[#475569] font-medium rounded-lg hover:bg-[#F8FAFC] transition-colors duration-200"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 bg-[#4F46E5] text-white font-medium rounded-lg hover:bg-[#4338CA] transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Save Changes"
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
