"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Briefcase, Calendar, Clock, DollarSign, FileText, Target, Users, CheckCircle, MapPin, Loader2 } from 'lucide-react';
import { taskService, CreateTaskData } from '@/services/taskService';
import TagInput from '@/components/shared/TagInput';
import RichTextEditor from '@/components/shared/RichTextEditor';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { useRoleProtection } from '@/hooks/useRoleProtection';

const EXPERIENCE_LEVELS = ['entry', 'intermediate', 'expert'];
const WORK_TYPES = ['remote', 'onsite', 'hybrid'];
const TASK_TYPES = ['internship', 'project', 'freelance'];
const BUDGET_TYPES = ['unpaid', 'fixed', 'hourly'];
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

export default function EditTaskPage() {
    useRoleProtection({ allowedRoles: ['company'] });

    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState<any>({
        title: '',
        description: '',
        category: 'Web Development',
        type: 'internship',
        duration: { value: 2, unit: 'weeks' },
        workType: 'remote',
        experienceLevel: 'intermediate',
        skillsRequired: [],
        requirements: [''],
        budget: { type: 'unpaid', amount: { min: 0, max: 0 }, currency: 'USD' },
        applicationDeadline: '',
        startDate: '',
        deliverables: [''],
        benefits: [''],
        location: { city: '', country: '' },
        tags: [],
        maxApplications: 50,
        status: 'draft'
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    useEffect(() => {
        fetchTask();
    }, [params.taskId]);

    const fetchTask = async () => {
        try {
            setLoading(true);
            const task = await taskService.getTask(params.taskId as string);

            // Transform task data to form format
            setFormData({
                title: task.title,
                description: task.description,
                category: task.category,
                type: task.type,
                duration: task.duration,
                workType: task.workType,
                experienceLevel: task.experienceLevel,
                skillsRequired: task.skillsRequired.map(s => ({ name: s.name, level: s.level, required: s.required })),
                requirements: task.requirements.length > 0 ? task.requirements : [''],
                budget: task.budget,
                applicationDeadline: new Date(task.applicationDeadline).toISOString().split('T')[0],
                startDate: new Date(task.startDate).toISOString().split('T')[0],
                deliverables: task.deliverables.length > 0 ? task.deliverables : [''],
                benefits: task.benefits.length > 0 ? task.benefits : [''],
                location: task.location || { city: '', country: '' },
                tags: task.tags || [],
                maxApplications: task.maxApplications,
                status: task.status
            });
        } catch (error: any) {
            console.error('Error fetching task:', error);
            toast.error('Failed to load task');
            router.push('/company/tasks');
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.title.trim() || formData.title.length < 10) {
            newErrors.title = 'Title must be at least 10 characters';
        }
        if (!formData.description.trim() || formData.description.length < 50) {
            newErrors.description = 'Description must be at least 50 characters';
        }
        if (formData.skillsRequired.length === 0) {
            newErrors.skillsRequired = 'At least one skill is required';
        }
        if (!formData.applicationDeadline) {
            newErrors.applicationDeadline = 'Application deadline is required';
        }
        if (!formData.startDate) {
            newErrors.startDate = 'Start date is required';
        }
        const validDeliverables = formData.deliverables.filter((d: string) => d.trim());
        if (validDeliverables.length === 0) {
            newErrors.deliverables = 'At least one deliverable is required';
        }
        if (formData.budget.type !== 'unpaid' && (!formData.budget.amount.min || formData.budget.amount.min <= 0)) {
            newErrors.budget = 'Budget amount is required for paid tasks';
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

            // Prepare task data
            const taskData: Partial<CreateTaskData> = {
                title: formData.title,
                description: formData.description,
                category: formData.category,
                type: formData.type,
                duration: formData.duration,
                workType: formData.workType,
                experienceLevel: formData.experienceLevel,
                skillsRequired: formData.skillsRequired,
                requirements: formData.requirements.filter((r: string) => r.trim()),
                budget: formData.budget,
                applicationDeadline: formData.applicationDeadline,
                startDate: formData.startDate,
                deliverables: formData.deliverables.filter((d: string) => d.trim()),
                benefits: formData.benefits.filter((b: string) => b.trim()),
                tags: formData.tags,
                maxApplications: formData.maxApplications,
                status: formData.status
            };

            // Add location only if workType is not remote
            if (formData.workType !== 'remote' && (formData.location.city || formData.location.country)) {
                taskData.location = formData.location;
            }

            await taskService.updateTask(params.taskId as string, taskData);
            toast.success('Task updated successfully!');
            setShowSuccessModal(true);
        } catch (error: any) {
            console.error('Error updating task:', error);
            toast.error(error.response?.data?.message || 'Failed to update task');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddItem = (field: string) => {
        setFormData({ ...formData, [field]: [...formData[field], ''] });
    };

    const handleRemoveItem = (field: string, index: number) => {
        const newItems = formData[field].filter((_: any, i: number) => i !== index);
        setFormData({ ...formData, [field]: newItems });
    };

    const handleItemChange = (field: string, index: number, value: string) => {
        const newItems = [...formData[field]];
        newItems[index] = value;
        setFormData({ ...formData, [field]: newItems });
    };

    if (loading) {
        return (
            <div className="min-h-screen surface-canvas flex items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen surface-canvas py-8">
            <div className="max-w-[900px] mx-auto px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2">Edit Task</h1>
                    <p className="text-foreground/85">Update your task details and requirements</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Task Title */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-brand-50 rounded-full flex items-center justify-center">
                                <Briefcase className="w-5 h-5 text-brand-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-foreground">Task Title</h2>
                        </div>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. Build a React Dashboard Component"
                            className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
                        />
                        {errors.title && (
                            <p className="text-xs text-destructive mt-2">⚠ {errors.title}</p>
                        )}
                    </div>

                    {/* Category & Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-card border border-border rounded-lg p-6">
                            <h3 className="text-sm font-semibold text-foreground mb-3">Category</h3>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div className="bg-card border border-border rounded-lg p-6">
                            <h3 className="text-sm font-semibold text-foreground mb-3">Task Type</h3>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 capitalize"
                            >
                                {TASK_TYPES.map(type => (
                                    <option key={type} value={type} className="capitalize">{type}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Task Description */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-brand-50 rounded-full flex items-center justify-center">
                                <FileText className="w-5 h-5 text-brand-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-foreground">Task Description</h2>
                        </div>
                        <RichTextEditor
                            value={formData.description}
                            onChange={(value) => setFormData({ ...formData, description: value })}
                            placeholder="Describe the task in detail..."
                            maxLength={5000}
                            error={errors.description}
                        />
                    </div>

                    {/* Required Skills */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-brand-50 rounded-full flex items-center justify-center">
                                <Target className="w-5 h-5 text-brand-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-foreground">Required Skills</h2>
                        </div>
                        <TagInput
                            tags={formData.skillsRequired.map((s: any) => s.name)}
                            onChange={(skills) => setFormData({
                                ...formData,
                                skillsRequired: skills.map(name => ({ name, level: 'intermediate', required: true }))
                            })}
                            placeholder="e.g. React, TypeScript, Node.js..."
                            maxTags={15}
                        />
                        {errors.skillsRequired && (
                            <p className="text-xs text-destructive mt-2">⚠ {errors.skillsRequired}</p>
                        )}
                    </div>

                    {/* Work Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-card border border-border rounded-lg p-6">
                            <h3 className="text-sm font-semibold text-foreground mb-3">Experience Level</h3>
                            <select
                                value={formData.experienceLevel}
                                onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
                                className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 capitalize"
                            >
                                {EXPERIENCE_LEVELS.map(level => (
                                    <option key={level} value={level} className="capitalize">{level}</option>
                                ))}
                            </select>
                        </div>

                        <div className="bg-card border border-border rounded-lg p-6">
                            <h3 className="text-sm font-semibold text-foreground mb-3">Work Type</h3>
                            <select
                                value={formData.workType}
                                onChange={(e) => setFormData({ ...formData, workType: e.target.value })}
                                className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 capitalize"
                            >
                                {WORK_TYPES.map(type => (
                                    <option key={type} value={type} className="capitalize">{type}</option>
                                ))}
                            </select>
                        </div>

                        <div className="bg-card border border-border rounded-lg p-6">
                            <h3 className="text-sm font-semibold text-foreground mb-3">Duration</h3>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={formData.duration.value}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        duration: { ...formData.duration, value: parseInt(e.target.value) || 1 }
                                    })}
                                    min="1"
                                    className="w-20 px-3 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                                />
                                <select
                                    value={formData.duration.unit}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        duration: { ...formData.duration, unit: e.target.value }
                                    })}
                                    className="flex-1 px-3 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                                >
                                    <option value="days">Days</option>
                                    <option value="weeks">Weeks</option>
                                    <option value="months">Months</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-card border border-border rounded-lg p-6">
                            <h3 className="text-sm font-semibold text-foreground mb-3">Application Deadline</h3>
                            <input
                                type="date"
                                value={formData.applicationDeadline}
                                onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                            />
                            {errors.applicationDeadline && (
                                <p className="text-xs text-destructive mt-2">⚠ {errors.applicationDeadline}</p>
                            )}
                        </div>

                        <div className="bg-card border border-border rounded-lg p-6">
                            <h3 className="text-sm font-semibold text-foreground mb-3">Start Date</h3>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                            />
                            {errors.startDate && (
                                <p className="text-xs text-destructive mt-2">⚠ {errors.startDate}</p>
                            )}
                        </div>
                    </div>

                    {/* Budget */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-brand-50 rounded-full flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-brand-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-foreground">Budget</h2>
                        </div>
                        <div className="space-y-4">
                            <select
                                value={formData.budget.type}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    budget: { ...formData.budget, type: e.target.value }
                                })}
                                className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 capitalize"
                            >
                                {BUDGET_TYPES.map(type => (
                                    <option key={type} value={type} className="capitalize">{type}</option>
                                ))}
                            </select>

                            {formData.budget.type !== 'unpaid' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-2">Min Amount</label>
                                        <input
                                            type="number"
                                            value={formData.budget.amount.min}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                budget: {
                                                    ...formData.budget,
                                                    amount: { ...formData.budget.amount, min: parseInt(e.target.value) || 0 }
                                                }
                                            })}
                                            placeholder="Min"
                                            className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-2">Max Amount</label>
                                        <input
                                            type="number"
                                            value={formData.budget.amount.max}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                budget: {
                                                    ...formData.budget,
                                                    amount: { ...formData.budget.amount, max: parseInt(e.target.value) || 0 }
                                                }
                                            })}
                                            placeholder="Max"
                                            className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                                        />
                                    </div>
                                </div>
                            )}
                            {errors.budget && (
                                <p className="text-xs text-destructive">⚠ {errors.budget}</p>
                            )}
                        </div>
                    </div>

                    {/* Deliverables */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-foreground">Deliverables</h3>
                            <button
                                type="button"
                                onClick={() => handleAddItem('deliverables')}
                                className="text-sm text-brand-600 hover:text-[#4338CA]"
                            >
                                + Add
                            </button>
                        </div>
                        <div className="space-y-2">
                            {formData.deliverables.map((item: string, index: number) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={item}
                                        onChange={(e) => handleItemChange('deliverables', index, e.target.value)}
                                        placeholder={`Deliverable ${index + 1}`}
                                        className="flex-1 px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                                    />
                                    {formData.deliverables.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem('deliverables', index)}
                                            className="px-3 text-red-600 hover:bg-red-50 rounded-lg"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        {errors.deliverables && (
                            <p className="text-xs text-destructive mt-2">⚠ {errors.deliverables}</p>
                        )}
                    </div>

                    {/* Status */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <h3 className="text-sm font-semibold text-foreground mb-3">Task Status</h3>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 capitalize"
                        >
                            <option value="draft">Draft</option>
                            <option value="active">Active</option>
                            <option value="paused">Paused</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            disabled={submitting}
                            className="flex-1 px-6 py-3 border border-border text-foreground/85 font-medium rounded-lg hover:surface-canvas disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 px-6 py-3 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                'Update Task'
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
                        <h3 className="text-2xl font-bold text-foreground mb-2">Task Updated!</h3>
                        <p className="text-foreground/85 mb-6">
                            Your task has been updated successfully.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => router.push('/company/tasks')}
                                className="flex-1 px-6 py-3 border border-border text-foreground/85 font-medium rounded-lg hover:surface-canvas"
                            >
                                View All Tasks
                            </button>
                            <button
                                onClick={() => router.push(`/tasks/${params.taskId}`)}
                                className="flex-1 px-6 py-3 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700"
                            >
                                View Task
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
