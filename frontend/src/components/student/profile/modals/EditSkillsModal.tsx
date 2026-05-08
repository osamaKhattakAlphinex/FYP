"use client";

import { useState } from "react";
import Modal from "@/components/shared/Modal";
import { Loader2, Plus, X } from "lucide-react";
import { Skill } from "@/types/student.types";

interface EditSkillsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentSkills: Skill[];
    onSave: (skills: Omit<Skill, "id">[]) => Promise<void>;
}

export default function EditSkillsModal({ isOpen, onClose, currentSkills, onSave }: EditSkillsModalProps) {
    const [skills, setSkills] = useState<Array<{ name: string; level: Skill["level"] }>>(
        currentSkills.map(s => ({ name: s.name, level: s.level }))
    );
    const [newSkill, setNewSkill] = useState({ name: "", level: "Intermediate" as Skill["level"] });
    const [loading, setLoading] = useState(false);

    const handleAddSkill = () => {
        if (newSkill.name.trim()) {
            setSkills([...skills, newSkill]);
            setNewSkill({ name: "", level: "Intermediate" });
        }
    };

    const handleRemoveSkill = (index: number) => {
        setSkills(skills.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(skills);
            onClose();
        } catch (error) {
            console.error("Failed to update skills:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Skills" size="md">
            <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newSkill.name}
                            onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                            placeholder="Skill name (e.g., React)"
                            className="flex-1 px-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                        />
                        <select
                            value={newSkill.level}
                            onChange={(e) => setNewSkill({ ...newSkill, level: e.target.value as Skill["level"] })}
                            className="px-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                        >
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                            <option value="Expert">Expert</option>
                        </select>
                        <button
                            type="button"
                            onClick={handleAddSkill}
                            className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg hover:bg-[#4338CA] transition-colors duration-200"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {skills.map((skill, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg">
                                <div>
                                    <span className="font-medium text-[#0F172A]">{skill.name}</span>
                                    <span className="ml-2 text-sm text-[#64748B]">• {skill.level}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveSkill(index)}
                                    className="p-1 hover:bg-[#FEE2E2] rounded transition-colors duration-200"
                                >
                                    <X className="w-4 h-4 text-[#EF4444]" />
                                </button>
                            </div>
                        ))}
                    </div>
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
