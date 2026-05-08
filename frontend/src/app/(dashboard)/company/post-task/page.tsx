"use client";

import { useState } from 'react';
import { Briefcase, Calendar, Clock, DollarSign, FileText, Target, Users, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import TagInput from '@/components/shared/TagInput';
import RichTextEditor from '@/components/shared/RichTextEditor';
import { taskService, CreateTaskData } from '@/services/taskService';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { useRoleProtection } from '@/hooks/useRoleProtection';

const DIFFICULTY_LEVELS = ['entry', 'intermediate', 'expert'];
const DURATION_OPTIONS = [
    { label: '1-2 weeks', value: 2, unit: 'weeks' },
    { label: '2-4 weeks', value: 4, unit: 'weeks' },
    { label: '1-2 months', value: 2, unit: 'months' },
    { label: '2-3 months', value: 3, unit: 'months' },
];
const CATEGORIES = [
    'Web Development',
    'Mobile Development',
    'UI/UX Design',
    'Data Science',
    'Machine Learning',
    'Digital Marketing',
    'Content Writing',
    'Graphic Design',
    'Video Editing',
    'Business Analysis',
    'Quality Assurance',
    'DevOps',
    'Cybersecurity',
    'Other'
];
const WORK_TYPES = ['remote', 'onsite', 'hybrid'];
const TASK_TYPES = ['internship', 'project', 'freelance'];

export default function PostTaskPage() {
    useRoleProtection({ allowedRoles: ['company'] });

    const router = useRouter();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'Web Development',
        type: 'internship' as 'internship' | 'project' | 'freelance',
        workType: 'remote' as 'remote' | 'onsite' | 'hybrid',
        requiredSkills: [] as string[],
        difficulty: 'intermediate' as 'entry' | 'intermediate' | 'expert',
        duration: { value: 4, unit: 'weeks' as 'days' | 'weeks' | 'months' },
        deadline: '',
        startDate: '',
        deliverables: [''],
        requirements: [''],
        benefits: [''],
        isPaid: false,
        compensation: '',
        maxApplications: 50
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.title.trim() || formData.title.length < 10) {
            newErrors.title = 'Title must be at least 10 characters';
        }

        // Validate description (strip HTML tags for length check)
        const plainDescription = formData.description.replace(/<[^>]*>/g, '').trim();
        if (!plainDescription || plainDescription.length < 100) {
            newErrors.description = 'Description must be at least 100 characters';
        }

        if (formData.requiredSkills.length === 0) {
            newErrors.requiredSkills = 'At least one skill is required';
        }

        // Validate deadline
        if (!formData.deadline) {
            newErrors.deadline = 'Application deadline is required';
        } else {
            const deadlineDate = new Date(formData.deadline);
            const minDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

            if (deadlineDate <= minDeadline) {
                newErrors.deadline = 'Application deadline must be at least 24 hours from now';
            }
        }

        // Validate start date
        if (!formData.startDate) {
            newErrors.startDate = 'Start date is required';
        } else if (formData.deadline) {
            const startDate = new Date(formData.startDate);
            const deadlineDate = new Date(formData.deadline);

            if (startDate <= deadlineDate) {
                newErrors.startDate = 'Start date must be after application deadline';
            }
        }

        const validDeliverables = formData.deliverables.filter(d => d.trim());
        if (validDeliverables.length === 0) {
            newErrors.deliverables = 'At least one deliverable is required';
        }
        const validRequirements = formData.requirements.filter(r => r.trim());
        if (validRequirements.length === 0) {
            newErrors.requirements = 'At least one requirement is required';
        }
        if (formData.isPaid && (!formData.compensation || parseFloat(formData.compensation) <= 0)) {
            newErrors.compensation = 'Compensation amount is required for paid tasks';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) {
            toast.error('Please fix the errors in the form');
            return;
        }

        try {
            setSubmitting(true);

            // Prepare task data according to backend schema
            const taskData: CreateTaskData = {
                title: formData.title.trim(),
                description: formData.description.trim(),
                category: formData.category,
                type: formData.type,
                workType: formData.workType,
                experienceLevel: formData.difficulty,
                duration: formData.duration,
                skillsRequired: formData.requiredSkills.map(skill => ({
                    name: skill,
                    level: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
                    required: true
                })),
                requirements: formData.requirements.filter(r => r.trim()),
                deliverables: formData.deliverables.filter(d => d.trim()),
                benefits: formData.benefits.filter(b => b.trim()),
                budget: formData.isPaid ? {
                    type: 'fixed' as 'fixed' | 'hourly' | 'unpaid',
                    amount: {
                        min: parseFloat(formData.compensation),
                        max: parseFloat(formData.compensation)
                    },
                    currency: 'PKR'
                } : {
                    type: 'unpaid' as 'fixed' | 'hourly' | 'unpaid',
                    currency: 'PKR'
                },
                // Convert date strings to ISO 8601 format
                applicationDeadline: new Date(formData.deadline).toISOString(),
                startDate: new Date(formData.startDate).toISOString(),
                maxApplications: formData.maxApplications,
                tags: formData.requiredSkills,
                status: 'active'
            };

            const createdTask = await taskService.createTask(taskData);
            console.log('Task created:', createdTask);
            toast.success('Task posted successfully!');
            setShowSuccessModal(true);
        } catch (error: any) {
            console.error('Error creating task:', error);
            toast.error(error.response?.data?.message || 'Failed to post task');
        } finally {
            setSubmitting(false);
        }
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

    const handleAddRequirement = () => {
        setFormData({ ...formData, requirements: [...formData.requirements, ''] });
    };

    const handleRemoveRequirement = (index: number) => {
        const newRequirements = formData.requirements.filter((_, i) => i !== index);
        setFormData({ ...formData, requirements: newRequirements });
    };

    const handleRequirementChange = (index: number, value: string) => {
        const newRequirements = [...formData.requirements];
        newRequirements[index] = value;
        setFormData({ ...formData, requirements: newRequirements });
    };

    const handleAddBenefit = () => {
        setFormData({ ...formData, benefits: [...formData.benefits, ''] });
    };

    const handleRemoveBenefit = (index: number) => {
        const newBenefits = formData.benefits.filter((_, i) => i !== index);
        setFormData({ ...formData, benefits: newBenefits });
    };

    const handleBenefitChange = (index: number, value: string) => {
        const newBenefits = [...formData.benefits];
        newBenefits[index] = value;
        setFormData({ ...formData, benefits: newBenefits });
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
                    {/* Category & Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
                            <h2 className="text-lg font-semibold text-[#0F172A] mb-4">Category</h2>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                            >
                                {CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
                            <h2 className="text-lg font-semibold text-[#0F172A] mb-4">Task Type</h2>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent capitalize"
                            >
                                {TASK_TYPES.map((type) => (
                                    <option key={type} value={type} className="capitalize">{type}</option>
                                ))}
                            </select>
                        </div>
                    </div>

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
                        <RichTextEditor
                            value={formData.description}
                            onChange={(value) => setFormData({ ...formData, description: value })}
                            placeholder="Describe the task in detail. Include objectives, requirements, and what students will learn..."
                            maxLength={5000}
                            error={errors.description}
                        />
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Work Type */}
                        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
                            <h2 className="text-lg font-semibold text-[#0F172A] mb-4">Work Type</h2>
                            <select
                                value={formData.workType}
                                onChange={(e) => setFormData({ ...formData, workType: e.target.value as any })}
                                className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent capitalize"
                            >
                                {WORK_TYPES.map((type) => (
                                    <option key={type} value={type} className="capitalize">{type}</option>
                                ))}
                            </select>
                        </div>

                        {/* Experience Level */}
                        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
                            <h2 className="text-lg font-semibold text-[#0F172A] mb-4">Experience Level</h2>
                            <select
                                value={formData.difficulty}
                                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                                className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent capitalize"
                            >
                                {DIFFICULTY_LEVELS.map((level) => (
                                    <option key={level} value={level} className="capitalize">{level}</option>
                                ))}
                            </select>
                        </div>

                        {/* Duration */}
                        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
                            <h2 className="text-lg font-semibold text-[#0F172A] mb-4">Duration</h2>
                            <select
                                value={`${formData.duration.value}-${formData.duration.unit}`}
                                onChange={(e) => {
                                    const selected = DURATION_OPTIONS.find(d => `${d.value}-${d.unit}` === e.target.value);
                                    if (selected) {
                                        setFormData({ ...formData, duration: { value: selected.value, unit: selected.unit as any } });
                                    }
                                }}
                                className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                            >
                                {DURATION_OPTIONS.map((duration) => (
                                    <option key={`${duration.value}-${duration.unit}`} value={`${duration.value}-${duration.unit}`}>
                                        {duration.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Start Date */}
                        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-[#EEF2FF] rounded-full flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-[#4F46E5]" />
                                </div>
                                <h2 className="text-lg font-semibold text-[#0F172A]">Start Date</h2>
                            </div>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                min={formData.deadline || new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                            />
                            {errors.startDate && (
                                <p className="text-xs text-[#EF4444] mt-2 flex items-center gap-1">
                                    <span>⚠</span> {errors.startDate}
                                </p>
                            )}
                            <p className="text-xs text-[#64748B] mt-2">Must be after application deadline</p>
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
                                min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                                className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                            />
                            {errors.deadline && (
                                <p className="text-xs text-[#EF4444] mt-2 flex items-center gap-1">
                                    <span>⚠</span> {errors.deadline}
                                </p>
                            )}
                            <p className="text-xs text-[#64748B] mt-2">Must be at least 24 hours from now</p>
                        </div>
                    </div>

                    {/* Requirements */}
                    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#EEF2FF] rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-5 h-5 text-[#4F46E5]" />
                                </div>
                                <h2 className="text-lg font-semibold text-[#0F172A]">Requirements</h2>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddRequirement}
                                className="text-sm font-medium text-[#4F46E5] hover:text-[#4338CA] transition-colors duration-200"
                            >
                                + Add More
                            </button>
                        </div>
                        <div className="space-y-3">
                            {formData.requirements.map((requirement, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={requirement}
                                        onChange={(e) => handleRequirementChange(index, e.target.value)}
                                        placeholder={`Requirement ${index + 1}`}
                                        className="flex-1 px-4 py-3 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                                    />
                                    {formData.requirements.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveRequirement(index)}
                                            className="px-4 py-3 text-[#EF4444] hover:bg-[#FEF2F2] rounded-lg transition-colors duration-200"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        {errors.requirements && (
                            <p className="text-xs text-[#EF4444] mt-2 flex items-center gap-1">
                                <span>⚠</span> {errors.requirements}
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

                    {/* Benefits (Optional) */}
                    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#EEF2FF] rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-5 h-5 text-[#4F46E5]" />
                                </div>
                                <h2 className="text-lg font-semibold text-[#0F172A]">Benefits <span className="text-sm text-gray-500">(Optional)</span></h2>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddBenefit}
                                className="text-sm font-medium text-[#4F46E5] hover:text-[#4338CA] transition-colors duration-200"
                            >
                                + Add More
                            </button>
                        </div>
                        <div className="space-y-3">
                            {formData.benefits.map((benefit, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={benefit}
                                        onChange={(e) => handleBenefitChange(index, e.target.value)}
                                        placeholder={`Benefit ${index + 1} (e.g., Certificate, Mentorship)`}
                                        className="flex-1 px-4 py-3 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                                    />
                                    {formData.benefits.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveBenefit(index)}
                                            className="px-4 py-3 text-[#EF4444] hover:bg-[#FEF2F2] rounded-lg transition-colors duration-200"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
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
                            disabled={submitting}
                            className="flex-1 px-6 py-3 bg-[#4F46E5] text-white font-semibold rounded-lg hover:bg-[#4338CA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <LoadingSpinner size="sm" />
                                    Posting...
                                </>
                            ) : (
                                'Post Task'
                            )}
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
