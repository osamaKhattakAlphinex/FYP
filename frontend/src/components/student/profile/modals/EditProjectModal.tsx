"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/shared/Modal";
import { Loader2, Plus, X } from "lucide-react";
import { Project } from "@/types/student.types";

interface EditProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project | null;
    onSave: (data: Omit<Project, "id">) => Promise<void>;
}

export default function EditProjectModal({ isOpen, onClose, project, onSave }: EditProjectModalProps) {
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        techStack: [] as string[],
        projectUrl: null as string | null,
        githubUrl: null as string | null,
        thumbnailUrl: null as string | null,
        startDate: "",
        endDate: null as string | null
    });
    const [newTech, setNewTech] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (project) setFormData(project);
    }, [project, isOpen]);

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
        <Modal isOpen={isOpen} onClose={onClose} title={project ? "Edit Project" : "Add Project"} size="md">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Project Title" className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />

                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} placeholder="Project description..." className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] resize-none" />

                <div>
                    <label className="block text-sm font-semibold text-[#0F172A] mb-2">Tech Stack</label>
                    <div className="flex gap-2 mb-2">
                        <input type="text" value={newTech} onChange={(e) => setNewTech(e.target.value)} placeholder="Add technology" className="flex-1 px-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
                        <button type="button" onClick={() => { if (newTech.trim()) { setFormData({ ...formData, techStack: [...formData.techStack, newTech.trim()] }); setNewTech(""); } }} className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg hover:bg-[#4338CA]">
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {formData.techStack.map((tech, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-[#EEF2FF] text-[#4F46E5] rounded-full text-sm">
                                {tech}
                                <button type="button" onClick={() => setFormData({ ...formData, techStack: formData.techStack.filter((_, i) => i !== idx) })} className="hover:bg-[#DDD6FE] rounded-full p-0.5">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <input type="url" value={formData.projectUrl || ""} onChange={(e) => setFormData({ ...formData, projectUrl: e.target.value || null })} placeholder="Project URL" className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
                    <input type="url" value={formData.githubUrl || ""} onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value || null })} placeholder="GitHub URL" className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <input type="month" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} placeholder="Start Date" className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
                    <input type="month" value={formData.endDate || ""} onChange={(e) => setFormData({ ...formData, endDate: e.target.value || null })} placeholder="End Date (optional)" className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
                </div>

                <div className="flex gap-3 mt-6">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-[#E2E8F0] text-[#475569] font-medium rounded-lg hover:bg-[#F8FAFC]">Cancel</button>
                    <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-[#4F46E5] text-white font-medium rounded-lg hover:bg-[#4338CA] disabled:opacity-50 flex items-center justify-center gap-2">
                        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : project ? "Update" : "Add"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
