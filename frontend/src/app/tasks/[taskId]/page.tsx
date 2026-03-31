"use client";

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Briefcase, Clock, Calendar, Users, Target, CheckCircle,
    DollarSign, ArrowLeft, Building2, MapPin, Globe, ExternalLink
} from 'lucide-react';
import type { Task } from '@/types/task.types';

// Mock data - replace with actual API call
const mockTask: Task = {
    id: '1',
    companyId: 'comp1',
    companyName: 'TechVenture Pakistan',
    companyLogo: null,
    title: 'Build a React Dashboard Component',
    description: `We are looking for a talented student to create a responsive dashboard component using React and TypeScript. This is an excellent opportunity to gain hands-on experience with modern web development technologies.

**What you'll do:**
- Design and implement a reusable dashboard component
- Integrate data visualization libraries (Chart.js or Recharts)
- Implement responsive design using Tailwind CSS
- Write clean, maintainable code following best practices
- Create comprehensive documentation

**What you'll learn:**
- Modern React patterns and hooks
- TypeScript for type-safe development
- Component architecture and reusability
- Data visualization techniques
- Professional development workflow

**Requirements:**
- Basic knowledge of React and JavaScript
- Familiarity with HTML/CSS
- Ability to work independently
- Good communication skills
- Commitment to meeting deadlines`,
    requiredSkills: ['React', 'TypeScript', 'Tailwind CSS', 'JavaScript'],
    difficulty: 'Intermediate',
    duration: '2-4 weeks',
    deadline: '2026-04-15T00:00:00Z',
    deliverables: [
        'Functional dashboard component with at least 3 chart types',
        'Comprehensive documentation including setup and usage',
        'Unit tests with minimum 80% coverage',
        'Responsive design working on mobile and desktop'
    ],
    isPaid: true,
    compensation: 15000,
    applicants: 12,
    status: 'Active',
    createdAt: '2026-03-20T00:00:00Z',
    updatedAt: '2026-03-20T00:00:00Z'
};

export default function TaskDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [showApplicationModal, setShowApplicationModal] = useState(false);
    const [coverLetter, setCoverLetter] = useState('');
    const [task] = useState<Task>(mockTask);

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'Beginner':
                return 'bg-[#DCFCE7] text-[#16A34A]';
            case 'Intermediate':
                return 'bg-[#FEF3C7] text-[#D97706]';
            case 'Advanced':
                return 'bg-[#FEE2E2] text-[#DC2626]';
            default:
                return 'bg-[#F1F5F9] text-[#64748B]';
        }
    };

    const getDaysLeft = () => {
        const days = Math.ceil((new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
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
        console.log('Application submitted:', { taskId: task.id, coverLetter });
        setShowApplicationModal(false);
        // Show success message
    };

    const daysLeft = getDaysLeft();
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
                                        <span className={`text-sm font-medium px-3 py-1 rounded-full ${getDifficultyColor(task.difficulty)}`}>
                                            {task.difficulty}
                                        </span>
                                        <div className="flex items-center gap-1.5 text-sm text-[#64748B]">
                                            <Clock className="w-4 h-4" />
                                            <span>{task.duration}</span>
                                        </div>
                                        <div className={`flex items-center gap-1.5 text-sm ${isUrgent ? 'text-[#EF4444]' : 'text-[#64748B]'}`}>
                                            <Calendar className="w-4 h-4" />
                                            <span>{daysLeft} days left</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-sm text-[#64748B]">
                                            <Users className="w-4 h-4" />
                                            <span>{task.applicants} applicants</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Company Info */}
                            <div className="flex items-center gap-4 pt-6 border-t border-[#E2E8F0]">
                                <div className="w-16 h-16 rounded-xl bg-[#EEF2FF] flex items-center justify-center overflow-hidden">
                                    {task.companyLogo ? (
                                        <img src={task.companyLogo} alt={task.companyName} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xl font-bold text-[#4F46E5]">{getInitials(task.companyName)}</span>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-[#0F172A]">{task.companyName}</h3>
                                    <p className="text-sm text-[#64748B]">Posted on {new Date(task.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Task Description */}
                        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8">
                            <h2 className="text-xl font-bold text-[#0F172A] mb-4">About This Task</h2>
                            <div className="prose prose-sm max-w-none text-[#475569] whitespace-pre-wrap">
                                {task.description}
                            </div>
                        </div>

                        {/* Required Skills */}
                        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8">
                            <div className="flex items-center gap-3 mb-4">
                                <Target className="w-6 h-6 text-[#4F46E5]" />
                                <h2 className="text-xl font-bold text-[#0F172A]">Required Skills</h2>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {task.requiredSkills.map((skill, index) => (
                                    <span
                                        key={index}
                                        className="inline-flex items-center bg-[#0F172A] text-white text-sm font-medium px-4 py-2 rounded-full"
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Deliverables */}
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
                    </div>

                    {/* Sidebar */}
                    <div className="lg:w-[380px]">
                        <div className="lg:sticky lg:top-[88px] space-y-6">
                            {/* Apply Card */}
                            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-[#0F172A] mb-4">Apply for this Task</h3>

                                {task.isPaid && task.compensation && (
                                    <div className="flex items-center justify-between mb-4 p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg">
                                        <span className="text-sm font-medium text-[#15803D]">Compensation</span>
                                        <div className="flex items-center gap-1 text-lg font-bold text-[#15803D]">
                                            <DollarSign className="w-5 h-5" />
                                            <span>PKR {task.compensation.toLocaleString()}</span>
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={() => setShowApplicationModal(true)}
                                    className="w-full bg-[#4F46E5] text-white font-semibold py-3 rounded-lg hover:bg-[#4338CA] transition-colors duration-200 mb-3"
                                >
                                    Apply Now
                                </button>

                                <p className="text-xs text-[#64748B] text-center">
                                    Deadline: {new Date(task.deadline).toLocaleDateString()}
                                </p>
                            </div>

                            {/* Task Details */}
                            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
                                <h3 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-4">
                                    Task Details
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[#64748B]">Duration</span>
                                        <span className="text-sm font-semibold text-[#0F172A]">{task.duration}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[#64748B]">Difficulty</span>
                                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getDifficultyColor(task.difficulty)}`}>
                                            {task.difficulty}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[#64748B]">Applicants</span>
                                        <span className="text-sm font-semibold text-[#0F172A]">{task.applicants}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[#64748B]">Status</span>
                                        <span className="inline-flex items-center bg-[#DCFCE7] text-[#16A34A] text-xs font-medium px-2 py-1 rounded-full">
                                            {task.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Company Card */}
                            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
                                <h3 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-4">
                                    About Company
                                </h3>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-lg bg-[#EEF2FF] flex items-center justify-center overflow-hidden">
                                        {task.companyLogo ? (
                                            <img src={task.companyLogo} alt={task.companyName} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-sm font-bold text-[#4F46E5]">{getInitials(task.companyName)}</span>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-[#0F172A]">{task.companyName}</h4>
                                        <p className="text-xs text-[#64748B]">Technology</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => router.push(`/company/${task.companyId}`)}
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
