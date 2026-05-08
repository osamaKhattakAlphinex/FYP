"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/shared/Modal";
import { Loader2, Plus, X } from "lucide-react";
import { Experience } from "@/types/student.types";

interface EditExperienceModalProps {
    isOpen: boolean;
    onClose: () => void;
    experience: Experience | null;
    onSave: (data: Omit<Experience, "id">) => Promise<void>;
}

export default function EditExperienceModal({ isOpen, onClose, experience, onSave }: EditExperienceModalProps) {
    const [formData, setFormData] = useState({
        title: "",
        company: "",
        employmentType: "Internship" as Experience["employmentType"],
        startDate: "",
        endDate: null as string | null,
        isCurrentlyWorking: false,
        description: "",
        skills: [] as string[]
    });
    const [newSkill, setNewSkill] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (experience) {
            setFormData(experience);
        }
    }, [experience, isOpen]);

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
        <Modal isOpen={isOpen} onClose={onClose} title={experience ? "Edit Experience" : "Add Experience"} size="md">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Job Title" className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />

                <div className="grid grid-cols-2 gap-4">
                    <input type="text" required value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} placeholder="Company" className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
                    <select value={formData.employmentType} onChange={(e) => setFormData({ ...formData, employmentType: e.target.value as Experience["employmentType"] })} className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]">
                        <option value="Internship">Internship</option>
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Freelance">Freelance</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <input type="month" required value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
                    <input type="month" value={formData.endDate || ""} onChange={(e) => setFormData({ ...formData, endDate: e.target.value || null })} disabled={formData.isCurrentlyWorking} className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] disabled:opacity-50" />
                </div>

                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.isCurrentlyWorking} onChange={(e) => setFormData({ ...formData, isCurrentlyWorking: e.target.checked, endDate: e.target.checked ? null : formData.endDate })} className="w-4 h-4 text-[#4F46E5] rounded" />
                    <span className="text-sm text-[#475569]">Currently working here</span>
                </label>

                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} placeholder="Describe your responsibilities and achievements..." className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] resize-none" />

                <div>
                    <label className="block text-sm font-semibold text-[#0F172A] mb-2">Skills Used</label>
                    <div className="flex gap-2 mb-2">
                        <input type="text" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="Add skill" className="flex-1 px-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
                        <button type="button" onClick={() => { if (newSkill.trim()) { setFormData({ ...formData, skills: [...formData.skills, newSkill.trim()] }); setNewSkill(""); } }} className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg hover:bg-[#4338CA]">
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {formData.skills.map((skill, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-[#EEF2FF] text-[#4F46E5] rounded-full text-sm">
                                {skill}
                                <button type="button" onClick={() => setFormData({ ...formData, skills: formData.skills.filter((_, i) => i !== idx) })} className="hover:bg-[#DDD6FE] rounded-full p-0.5">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-[#E2E8F0] text-[#475569] font-medium rounded-lg hover:bg-[#F8FAFC]">Cancel</button>
                    <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-[#4F46E5] text-white font-medium rounded-lg hover:bg-[#4338CA] disabled:opacity-50 flex items-center justify-center gap-2">
                        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : experience ? "Update" : "Add"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
