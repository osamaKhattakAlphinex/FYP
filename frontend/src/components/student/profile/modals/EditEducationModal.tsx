"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/shared/Modal";
import { Loader2 } from "lucide-react";
import { Education } from "@/types/student.types";

interface EditEducationModalProps {
    isOpen: boolean;
    onClose: () => void;
    education: Education | null;
    onSave: (data: Omit<Education, "id">) => Promise<void>;
}

export default function EditEducationModal({ isOpen, onClose, education, onSave }: EditEducationModalProps) {
    const [formData, setFormData] = useState({
        institution: "",
        degree: "",
        fieldOfStudy: "",
        startYear: new Date().getFullYear(),
        endYear: null as number | null,
        isCurrentlyStudying: false,
        grade: "",
        description: ""
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (education) {
            setFormData({
                institution: education.institution,
                degree: education.degree,
                fieldOfStudy: education.fieldOfStudy,
                startYear: education.startYear,
                endYear: education.endYear,
                isCurrentlyStudying: education.isCurrentlyStudying,
                grade: education.grade || "",
                description: education.description || ""
            });
        }
    }, [education, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error("Failed to save education:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={education ? "Edit Education" : "Add Education"} size="md">
            <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-[#0F172A] mb-2">Institution *</label>
                        <input
                            type="text"
                            required
                            value={formData.institution}
                            onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                            className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                            placeholder="Stanford University"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#0F172A] mb-2">Degree *</label>
                            <input
                                type="text"
                                required
                                value={formData.degree}
                                onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                                className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                                placeholder="Bachelor of Science"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#0F172A] mb-2">Field of Study *</label>
                            <input
                                type="text"
                                required
                                value={formData.fieldOfStudy}
                                onChange={(e) => setFormData({ ...formData, fieldOfStudy: e.target.value })}
                                className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                                placeholder="Computer Science"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#0F172A] mb-2">Start Year *</label>
                            <input
                                type="number"
                                required
                                value={formData.startYear}
                                onChange={(e) => setFormData({ ...formData, startYear: parseInt(e.target.value) })}
                                className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                                min="1950"
                                max={new Date().getFullYear() + 10}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#0F172A] mb-2">End Year</label>
                            <input
                                type="number"
                                value={formData.endYear || ""}
                                onChange={(e) => setFormData({ ...formData, endYear: e.target.value ? parseInt(e.target.value) : null })}
                                disabled={formData.isCurrentlyStudying}
                                className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] disabled:opacity-50"
                                min={formData.startYear}
                                max={new Date().getFullYear() + 10}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isCurrentlyStudying}
                                onChange={(e) => setFormData({ ...formData, isCurrentlyStudying: e.target.checked, endYear: e.target.checked ? null : formData.endYear })}
                                className="w-4 h-4 text-[#4F46E5] border-[#E2E8F0] rounded focus:ring-2 focus:ring-[#4F46E5]"
                            />
                            <span className="text-sm text-[#475569]">I am currently studying here</span>
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-[#0F172A] mb-2">Grade/CGPA</label>
                        <input
                            type="text"
                            value={formData.grade}
                            onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                            className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                            placeholder="3.8"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-[#0F172A] mb-2">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] resize-none"
                            placeholder="Focus areas, achievements, etc."
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 border border-[#E2E8F0] text-[#475569] font-medium rounded-lg hover:bg-[#F8FAFC]"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 bg-[#4F46E5] text-white font-medium rounded-lg hover:bg-[#4338CA] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : education ? "Update" : "Add"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
