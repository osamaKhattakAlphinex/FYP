"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Briefcase, Clock, Calendar, Users, Target, CheckCircle,
    DollarSign, ArrowLeft, Building2, MapPin, Globe, ExternalLink
} from 'lucide-react';
import { taskService, Task } from '@/services/taskService';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';

export default function TaskDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [showApplicationModal, setShowApplicationModal] = useState(false);
    const [coverLetter, setCoverLetter] = useState('');
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchTask();
    }, [params.taskId]);

    const fetchTask = async () => {
        try {
            setLoading(true);
            setError(null);
            const taskData = await taskService.getTask(params.taskId as string);
            setTask(taskData);

            // Track unique view after successfully loading the task
            trackView();
        } catch (err: any) {
            console.error('Error fetching task:', err);
            setError(err.response?.data?.message || 'Failed to load task');
            toast.error('Failed to load task details');
        } finally {
            setLoading(false);
        }
    };

    const trackView = async () => {
        try {
            const result = await taskService.trackView(params.taskId as string);
            // Update the task views count if it's a new view
            if (result.isNewView && task) {
                setTask(prev => prev ? { ...prev, views: result.views } : null);
            }
        } catch (err) {
            // Silently fail - view tracking is not critical
            console.error('Error tracking view:', err);
        }
    };

    const getExperienceLevelColor = (level: string) => {
        switch (level.toLowerCase()) {
            case 'entry':
                return 'bg-[#DCFCE7] text-[#16A34A]';
            case 'intermediate':
                return 'bg-[#FEF3C7] text-[#D97706]';
            case 'expert':
                return 'bg-[#FEE2E2] text-[#DC2626]';
            default:
                return 'bg-[#F1F5F9] text-[#64748B]';
        }
    };

    const getDaysLeft = (deadline: string) => {
        const days = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return days;
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const handleApply = () => {
        // TODO: API call to submit application
        console.log('Application submitted:', { taskId: task?._id, coverLetter });
        setShowApplicationModal(false);
        toast.success('Application submitted successfully!');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (error || !task) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Task not found</h3>
                    <p className="text-gray-600 mb-4">{error || 'The task you are looking for does not exist.'}</p>
                    <button
                        onClick={() => router.push('/tasks')}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                        Back to Tasks
                    </button>
                </div>
            </div>
        );
    }

    const daysLeft = getDaysLeft(task.applicationDeadline);
    const isUrgent = daysLeft <= 7;

    return (
        <div className="min-h-screen bg-[#F8FAFC] py-8">
            <div className="max-w-[1200px] mx-auto px-8">
                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-[#475569] hover:text-[#4F46E5] mb-6 transition-colors duration-200"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">Back to Tasks</span>
                </button>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Main Content */}
                    <div className="flex-1 space-y-6">
                        {/* Task Header */}
                        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <h1 className="text-3xl font-extrabold text-[#0F172A] mb-3">{task.title}</h1>
                                    <div className="flex items-center gap-4 flex-wrap">
                                        <span className={`text-sm font-medium px-3 py-1 rounded-full ${getExperienceLevelColor(task.experienceLevel)}`}>
                                            {task.experienceLevel.charAt(0).toUpperCase() + task.experienceLevel.slice(1)}
                                        </span>
                                        <div className="flex items-center gap-1.5 text-sm text-[#64748B]">
                                            <Clock className="w-4 h-4" />
                                            <span>{taskService.formatDuration(task.duration)}</span>
                                        </div>
                                        <div className={`flex items-center gap-1.5 text-sm ${isUrgent ? 'text-[#EF4444]' : 'text-[#64748B]'}`}>
                                            <Calendar className="w-4 h-4" />
                                            <span>{daysLeft} days left</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-sm text-[#64748B]">
                                            <Users className="w-4 h-4" />
                                            <span>{task.applicationCount} applicants</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-sm text-[#64748B]">
                                            <span>{taskService.getWorkTypeIcon(task.workType)} {task.workType.charAt(0).toUpperCase() + task.workType.slice(1)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Company Info */}
                            <div className="flex items-center gap-4 pt-6 border-t border-[#E2E8F0]">
                                <div className="w-16 h-16 rounded-xl bg-[#EEF2FF] flex items-center justify-center overflow-hidden">
                                    {task.companyId.logo ? (
                                        <img
                                            src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${task.companyId.logo}`}
                                            alt={task.companyId.companyName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-xl font-bold text-[#4F46E5]">{getInitials(task.companyId.companyName)}</span>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-[#0F172A]">{task.companyId.companyName}</h3>
                                    <p className="text-sm text-[#64748B]">
                                        {task.companyId.industry} • Posted on {new Date(task.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Task Description */}
                        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8">
                            <h2 className="text-xl font-bold text-[#0F172A] mb-4">About This Task</h2>
                            <div
                                className="prose prose-sm max-w-none text-[#475569]"
                                dangerouslySetInnerHTML={{ __html: task.description }}
                            />
                        </div>

                        {/* Required Skills */}
                        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8">
                            <div className="flex items-center gap-3 mb-4">
                                <Target className="w-6 h-6 text-[#4F46E5]" />
                                <h2 className="text-xl font-bold text-[#0F172A]">Required Skills</h2>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {task.skillsRequired.map((skill, index) => (
                                    <span
                                        key={index}
                                        className="inline-flex items-center bg-[#0F172A] text-white text-sm font-medium px-4 py-2 rounded-full"
                                    >
                                        {skill.name}
                                        {skill.required && <span className="ml-1 text-xs">*</span>}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Requirements */}
                        {task.requirements && task.requirements.length > 0 && (
                            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8">
                                <h2 className="text-xl font-bold text-[#0F172A] mb-4">Requirements</h2>
                                <ul className="space-y-2">
                                    {task.requirements.map((requirement, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <div className="w-1.5 h-1.5 bg-[#4F46E5] rounded-full mt-2 flex-shrink-0"></div>
                                            <span className="text-[#475569]">{requirement}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Deliverables */}
                        {task.deliverables && task.deliverables.length > 0 && (
                            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8">
                                <div className="flex items-center gap-3 mb-4">
                                    <CheckCircle className="w-6 h-6 text-[#4F46E5]" />
                                    <h2 className="text-xl font-bold text-[#0F172A]">Expected Deliverables</h2>
                                </div>
                                <ul className="space-y-3">
                                    {task.deliverables.map((deliverable, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <div className="w-6 h-6 bg-[#EEF2FF] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <span className="text-xs font-semibold text-[#4F46E5]">{index + 1}</span>
                                            </div>
                                            <span className="text-[#475569]">{deliverable}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Benefits */}
                        {task.benefits && task.benefits.length > 0 && (
                            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8">
                                <h2 className="text-xl font-bold text-[#0F172A] mb-4">Benefits</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {task.benefits.map((benefit, index) => (
                                        <div key={index} className="flex items-start gap-2">
                                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                            <span className="text-sm text-[#475569]">{benefit}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="lg:w-[380px]">
                        <div className="lg:sticky lg:top-[88px] space-y-6">
                            {/* Apply Card */}
                            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-[#0F172A] mb-4">Apply for this Task</h3>

                                {task.budget.type !== 'unpaid' && task.budget.amount && (
                                    <div className="flex items-center justify-between mb-4 p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg">
                                        <span className="text-sm font-medium text-[#15803D]">Compensation</span>
                                        <div className="flex items-center gap-1 text-lg font-bold text-[#15803D]">
                                            <DollarSign className="w-5 h-5" />
                                            <span>{taskService.formatBudget(task.budget)}</span>
                                        </div>
                                    </div>
                                )}

                                {task.budget.type === 'unpaid' && (
                                    <div className="mb-4 p-4 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg">
                                        <span className="text-sm font-medium text-[#64748B]">Unpaid Opportunity</span>
                                    </div>
                                )}

                                <button
                                    onClick={() => setShowApplicationModal(true)}
                                    className="w-full bg-[#4F46E5] text-white font-semibold py-3 rounded-lg hover:bg-[#4338CA] transition-colors duration-200 mb-3"
                                >
                                    Apply Now
                                </button>

                                <p className="text-xs text-[#64748B] text-center">
                                    Deadline: {new Date(task.applicationDeadline).toLocaleDateString()}
                                </p>
                            </div>

                            {/* Task Details */}
                            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
                                <h3 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-4">
                                    Task Details
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[#64748B]">Category</span>
                                        <span className="text-sm font-semibold text-[#0F172A]">{task.category}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[#64748B]">Type</span>
                                        <span className="text-sm font-semibold text-[#0F172A] capitalize">{task.type}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[#64748B]">Duration</span>
                                        <span className="text-sm font-semibold text-[#0F172A]">{taskService.formatDuration(task.duration)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[#64748B]">Experience</span>
                                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getExperienceLevelColor(task.experienceLevel)}`}>
                                            {task.experienceLevel.charAt(0).toUpperCase() + task.experienceLevel.slice(1)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[#64748B]">Applicants</span>
                                        <span className="text-sm font-semibold text-[#0F172A]">{task.applicationCount} / {task.maxApplications}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[#64748B]">Views</span>
                                        <span className="text-sm font-semibold text-[#0F172A]">{task.views}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[#64748B]">Status</span>
                                        <span className="inline-flex items-center bg-[#DCFCE7] text-[#16A34A] text-xs font-medium px-2 py-1 rounded-full capitalize">
                                            {task.status}
                                        </span>
                                    </div>
                                    {task.location && (
                                        <div className="flex items-start justify-between">
                                            <span className="text-sm text-[#64748B]">Location</span>
                                            <span className="text-sm font-semibold text-[#0F172A] text-right">
                                                {[task.location.city, task.location.country].filter(Boolean).join(', ')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Company Card */}
                            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
                                <h3 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-4">
                                    About Company
                                </h3>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-lg bg-[#EEF2FF] flex items-center justify-center overflow-hidden">
                                        {task.companyId.logo ? (
                                            <img
                                                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${task.companyId.logo}`}
                                                alt={task.companyId.companyName}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-sm font-bold text-[#4F46E5]">{getInitials(task.companyId.companyName)}</span>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-[#0F172A]">{task.companyId.companyName}</h4>
                                        <p className="text-xs text-[#64748B]">{task.companyId.industry}</p>
                                        {task.companyId.location && (
                                            <p className="text-xs text-[#64748B]">
                                                {[task.companyId.location.city, task.companyId.location.country].filter(Boolean).join(', ')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => router.push(`/company/${task.companyId._id}`)}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-[#E2E8F0] text-[#475569] text-sm font-medium rounded-lg hover:border-[#4F46E5] hover:text-[#4F46E5] transition-all duration-200"
                                >
                                    <Building2 className="w-4 h-4" />
                                    <span>View Company Profile</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Application Modal */}
            {showApplicationModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Apply for this Task</h2>
                        <p className="text-[#475569] mb-6">Tell the company why you're a great fit for this task</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#0F172A] mb-2">
                                    Cover Letter <span className="text-[#EF4444]">*</span>
                                </label>
                                <textarea
                                    value={coverLetter}
                                    onChange={(e) => setCoverLetter(e.target.value)}
                                    placeholder="Explain your relevant experience, skills, and why you're interested in this task..."
                                    rows={8}
                                    maxLength={1000}
                                    className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent resize-none"
                                />
                                <div className="flex justify-end mt-1">
                                    <span className="text-xs text-[#94A3B8]">{coverLetter.length}/1000</span>
                                </div>
                            </div>

                            <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-lg p-4">
                                <p className="text-sm text-[#92400E]">
                                    <strong>Tip:</strong> Highlight your relevant skills and experience. Explain what you hope to learn and how you'll deliver quality work.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowApplicationModal(false)}
                                className="flex-1 px-6 py-3 border border-[#E2E8F0] text-[#475569] font-medium rounded-lg hover:bg-[#F8FAFC] transition-colors duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApply}
                                disabled={coverLetter.length < 50}
                                className="flex-1 px-6 py-3 bg-[#4F46E5] text-white font-semibold rounded-lg hover:bg-[#4338CA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                                Submit Application
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
