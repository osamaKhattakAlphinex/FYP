"use client";

import { useState } from 'react';
import { Briefcase, Calendar, Clock, DollarSign, FileText, Target, Users, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import TagInput from '@/components/shared/TagInput';

const DIFFICULTY_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const DURATION_OPTIONS = ['1-2 weeks', '2-4 weeks', '1-2 months', '2-3 months'];

export default function PostTaskPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        requiredSkills: [] as string[],
        difficulty: 'Intermediate',
        duration: '2-4 weeks',
        deadline: '',
        deliverables: [''],
        isPaid: false,
        compensation: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.title.trim() || formData.title.length < 10) {
            newErrors.title = 'Title must be at least 10 characters';
        }
        if (!formData.description.trim() || formData.description.length < 100) {
            newErrors.description = 'Description must be at least 100 characters';
        }
        if (formData.requiredSkills.length === 0) {
            newErrors.requiredSkills = 'At least one skill is required';
        }
        if (!formData.deadline) {
            newErrors.deadline = 'Deadline is required';
        }
        const validDeliverables = formData.deliverables.filter(d => d.trim());
        if (validDeliverables.length === 0) {
            newErrors.deliverables = 'At least one deliverable is required';
        }
        if (formData.isPaid && (!formData.compensation || parseFloat(formData.compensation) <= 0)) {
            newErrors.compensation = 'Compensation amount is required for paid tasks';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        // TODO: API call to save task
        console.log('Task data:', formData);
        setShowSuccessModal(true);
    };

    const handleAddDeliverable = () => {
        setFormData({ ...formData, deliverables: [...formData.deliverables, ''] });
    };

    const handleRemoveDeliverable = (index: number) => {
        const newDeliverables = formData.deliverables.filter((_, i) => i !== index);
        setFormData({ ...formData, deliverables: newDeliverables });
    };

    const handleDeliverableChange = (index: number, value: string) => {
        const newDeliverables = [...formData.deliverables];
        newDeliverables[index] = value;
        setFormData({ ...formData, deliverables: newDeliverables });
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] py-8">
            <div className="max-w-[900px] mx-auto px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-[#0F172A] mb-2">Post a Micro-Internship Task</h1>
                    <p className="text-[#475569]">Create a new task opportunity for students to apply and gain practical experience</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Task Title */}
                    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-[#EEF2FF] rounded-full flex items-center justify-center">
                                <Briefcase className="w-5 h-5 text-[#4F46E5]" />
                            </div>
                            <h2 className="text-lg font-semibold text-[#0F172A]">Task Title</h2>
                        </div>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. Build a React Dashboard Component"
                            className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                        />
                        {errors.title && (
                            <p className="text-xs text-[#EF4444] mt-2 flex items-center gap-1">
                                <span>⚠</span> {errors.title}
                            </p>
                        )}
                    </div>

                    {/* Task Description */}
                    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-[#EEF2FF] rounded-full flex items-center justify-center">
                                <FileText className="w-5 h-5 text-[#4F46E5]" />
                            </div>
                            <h2 className="text-lg font-semibold text-[#0F172A]">Task Description</h2>
                        </div>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe the task in detail. Include objectives, requirements, and what students will learn..."
                            rows={6}
                            maxLength={2000}
                            className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent resize-none"
                        />
                        <div className="flex items-center justify-between mt-2">
                            {errors.description ? (
                                <p className="text-xs text-[#EF4444] flex items-center gap-1">
                                    <span>⚠</span> {errors.description}
                                </p>
                            ) : (
                                <span />
                            )}
                            <span className="text-xs text-[#94A3B8]">{formData.description.length}/2000</span>
                        </div>
                    </div>

                    {/* Required Skills */}
                    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-[#EEF2FF] rounded-full flex items-center justify-center">
                                <Target className="w-5 h-5 text-[#4F46E5]" />
                            </div>
                            <h2 className="text-lg font-semibold text-[#0F172A]">Required Skills</h2>
                        </div>
                        <TagInput
                            tags={formData.requiredSkills}
                            onChange={(skills) => setFormData({ ...formData, requiredSkills: skills })}
                            placeholder="e.g. React, TypeScript, Node.js..."
                            maxTags={10}
                            suggestions={[
                                'React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Express',
                                'Python', 'Django', 'FastAPI', 'PostgreSQL', 'MongoDB',
                                'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Tailwind CSS'
                            ]}
                        />
                        {errors.requiredSkills && (
                            <p className="text-xs text-[#EF4444] mt-2 flex items-center gap-1">
                                <span>⚠</span> {errors.requiredSkills}
                            </p>
                        )}
                    </div>

                    {/* Task Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Difficulty Level */}
                        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-[#EEF2FF] rounded-full flex items-center justify-center">
                                    <Users className="w-5 h-5 text-[#4F46E5]" />
                                </div>
                                <h2 className="text-lg font-semibold text-[#0F172A]">Difficulty Level</h2>
                            </div>
                            <div className="space-y-2">
                                {DIFFICULTY_LEVELS.map((level) => (
                                    <label
                                        key={level}
                                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all duration-200 ${formData.difficulty === level
                                                ? 'border-[#4F46E5] bg-[#EEF2FF]'
                                                : 'border-[#E2E8F0] hover:border-[#C7D2FE]'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="difficulty"
                                            value={level}
                                            checked={formData.difficulty === level}
                                            onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                                            className="w-4 h-4 text-[#4F46E5]"
                                        />
                                        <span className="text-sm font-medium text-[#0F172A]">{level}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Duration */}
                        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-[#EEF2FF] rounded-full flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-[#4F46E5]" />
                                </div>
                                <h2 className="text-lg font-semibold text-[#0F172A]">Duration</h2>
                            </div>
                            <select
                                value={formData.duration}
                                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                            >
                                {DURATION_OPTIONS.map((duration) => (
                                    <option key={duration} value={duration}>{duration}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Deadline */}
                    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-[#EEF2FF] rounded-full flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-[#4F46E5]" />
                            </div>
                            <h2 className="text-lg font-semibold text-[#0F172A]">Application Deadline</h2>
                        </div>
                        <input
                            type="date"
                            value={formData.deadline}
                            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                        />
                        {errors.deadline && (
                            <p className="text-xs text-[#EF4444] mt-2 flex items-center gap-1">
                                <span>⚠</span> {errors.deadline}
                            </p>
                        )}
                    </div>

                    {/* Deliverables */}
                    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#EEF2FF] rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-5 h-5 text-[#4F46E5]" />
                                </div>
                                <h2 className="text-lg font-semibold text-[#0F172A]">Expected Deliverables</h2>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddDeliverable}
                                className="text-sm font-medium text-[#4F46E5] hover:text-[#4338CA] transition-colors duration-200"
                            >
                                + Add More
                            </button>
                        </div>
                        <div className="space-y-3">
                            {formData.deliverables.map((deliverable, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={deliverable}
                                        onChange={(e) => handleDeliverableChange(index, e.target.value)}
                                        placeholder={`Deliverable ${index + 1}`}
                                        className="flex-1 px-4 py-3 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                                    />
                                    {formData.deliverables.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveDeliverable(index)}
                                            className="px-4 py-3 text-[#EF4444] hover:bg-[#FEF2F2] rounded-lg transition-colors duration-200"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        {errors.deliverables && (
                            <p className="text-xs text-[#EF4444] mt-2 flex items-center gap-1">
                                <span>⚠</span> {errors.deliverables}
                            </p>
                        )}
                    </div>

                    {/* Compensation */}
                    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-[#EEF2FF] rounded-full flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-[#4F46E5]" />
                            </div>
                            <h2 className="text-lg font-semibold text-[#0F172A]">Compensation</h2>
                        </div>
                        <label className="flex items-center gap-3 mb-4">
                            <input
                                type="checkbox"
                                checked={formData.isPaid}
                                onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                                className="w-4 h-4 text-[#4F46E5] rounded"
                            />
                            <span className="text-sm text-[#475569]">This is a paid internship</span>
                        </label>
                        {formData.isPaid && (
                            <div>
                                <input
                                    type="number"
                                    value={formData.compensation}
                                    onChange={(e) => setFormData({ ...formData, compensation: e.target.value })}
                                    placeholder="Enter amount in PKR"
                                    className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                                />
                                {errors.compensation && (
                                    <p className="text-xs text-[#EF4444] mt-2 flex items-center gap-1">
                                        <span>⚠</span> {errors.compensation}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="flex-1 px-6 py-3 border border-[#E2E8F0] text-[#475569] font-medium rounded-lg hover:bg-[#F8FAFC] transition-colors duration-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-6 py-3 bg-[#4F46E5] text-white font-semibold rounded-lg hover:bg-[#4338CA] transition-colors duration-200"
                        >
                            Post Task
                        </button>
                    </div>
                </form>
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
                        <div className="w-16 h-16 bg-[#DCFCE7] rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-[#10B981]" />
                        </div>
                        <h3 className="text-2xl font-bold text-[#0F172A] mb-2">Task Posted Successfully!</h3>
                        <p className="text-[#475569] mb-6">
                            Your micro-internship task is now live and students can start applying.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => router.push('/company/tasks')}
                                className="flex-1 px-6 py-3 border border-[#E2E8F0] text-[#475569] font-medium rounded-lg hover:bg-[#F8FAFC] transition-colors duration-200"
                            >
                                View All Tasks
                            </button>
                            <button
                                onClick={() => router.push('/company/profile')}
                                className="flex-1 px-6 py-3 bg-[#4F46E5] text-white font-semibold rounded-lg hover:bg-[#4338CA] transition-colors duration-200"
                            >
                                Go to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
