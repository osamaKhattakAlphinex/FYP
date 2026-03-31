"use client";

import { useState } from 'react';
import { Search, Filter, Briefcase } from 'lucide-react';
import TaskCard from '@/components/shared/TaskCard';
import EmptyState from '@/components/shared/EmptyState';
import type { Task } from '@/types/task.types';

// Mock data - replace with actual API call
const mockTasks: Task[] = [
    {
        id: '1',
        companyId: 'comp1',
        companyName: 'TechVenture Pakistan',
        companyLogo: null,
        title: 'Build a React Dashboard Component',
        description: 'Create a responsive dashboard component using React and TypeScript. The component should display analytics data with charts and graphs. You will learn modern React patterns, state management, and data visualization.',
        requiredSkills: ['React', 'TypeScript', 'Tailwind CSS'],
        difficulty: 'Intermediate',
        duration: '2-4 weeks',
        deadline: '2026-04-15T00:00:00Z',
        deliverables: ['Functional dashboard component', 'Documentation', 'Unit tests'],
        isPaid: true,
        compensation: 15000,
        applicants: 12,
        status: 'Active',
        createdAt: '2026-03-20T00:00:00Z',
        updatedAt: '2026-03-20T00:00:00Z'
    },
    {
        id: '2',
        companyId: 'comp1',
        companyName: 'TechVenture Pakistan',
        companyLogo: null,
        title: 'API Integration for Mobile App',
        description: 'Integrate RESTful APIs into an existing mobile application. Work with authentication, data fetching, and error handling. Perfect for learning backend integration.',
        requiredSkills: ['Node.js', 'Express', 'REST API'],
        difficulty: 'Beginner',
        duration: '1-2 weeks',
        deadline: '2026-04-10T00:00:00Z',
        deliverables: ['API endpoints', 'Integration documentation'],
        isPaid: false,
        compensation: null,
        applicants: 8,
        status: 'Active',
        createdAt: '2026-03-18T00:00:00Z',
        updatedAt: '2026-03-18T00:00:00Z'
    },
    {
        id: '3',
        companyId: 'comp2',
        companyName: 'Digital Solutions Inc',
        companyLogo: null,
        title: 'Database Schema Design and Optimization',
        description: 'Design and optimize database schemas for a high-traffic e-commerce platform. Learn about indexing, query optimization, and database best practices.',
        requiredSkills: ['PostgreSQL', 'SQL', 'Database Design'],
        difficulty: 'Advanced',
        duration: '2-4 weeks',
        deadline: '2026-04-02T00:00:00Z',
        deliverables: ['Schema design', 'Migration scripts', 'Performance report'],
        isPaid: true,
        compensation: 25000,
        applicants: 5,
        status: 'Active',
        createdAt: '2026-03-15T00:00:00Z',
        updatedAt: '2026-03-15T00:00:00Z'
    }
];

const DIFFICULTY_FILTERS = ['All', 'Beginner', 'Intermediate', 'Advanced'];
const DURATION_FILTERS = ['All', '1-2 weeks', '2-4 weeks', '1-2 months', '2-3 months'];

export default function StudentTasksPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState('All');
    const [selectedDuration, setSelectedDuration] = useState('All');
    const [showFilters, setShowFilters] = useState(false);
    const [tasks] = useState<Task[]>(mockTasks);

    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.requiredSkills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesDifficulty = selectedDifficulty === 'All' || task.difficulty === selectedDifficulty;
        const matchesDuration = selectedDuration === 'All' || task.duration === selectedDuration;

        return matchesSearch && matchesDifficulty && matchesDuration;
    });

    return (
        <div className="min-h-screen bg-[#F8FAFC] py-8">
            <div className="max-w-[1200px] mx-auto px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-[#0F172A] mb-2">Browse Micro-Internship Tasks</h1>
                    <p className="text-[#475569]">Find and apply to tasks that match your skills and interests</p>
                </div>

                {/* Search and Filter Bar */}
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search Input */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by title, skills, or keywords..."
                                className="w-full pl-12 pr-4 py-3 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                            />
                        </div>

                        {/* Filter Button */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center justify-center gap-2 px-6 py-3 border border-[#E2E8F0] rounded-lg text-sm font-medium text-[#475569] hover:border-[#4F46E5] hover:text-[#4F46E5] transition-all duration-200"
                        >
                            <Filter className="w-5 h-5" />
                            <span>Filters</span>
                        </button>
                    </div>

                    {/* Filter Options */}
                    {showFilters && (
                        <div className="mt-6 pt-6 border-t border-[#E2E8F0] grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Difficulty Filter */}
                            <div>
                                <label className="block text-sm font-medium text-[#0F172A] mb-3">Difficulty Level</label>
                                <div className="flex flex-wrap gap-2">
                                    {DIFFICULTY_FILTERS.map((difficulty) => (
                                        <button
                                            key={difficulty}
                                            onClick={() => setSelectedDifficulty(difficulty)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${selectedDifficulty === difficulty
                                                    ? 'bg-[#4F46E5] text-white'
                                                    : 'bg-[#F8FAFC] text-[#475569] hover:bg-[#EEF2FF]'
                                                }`}
                                        >
                                            {difficulty}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Duration Filter */}
                            <div>
                                <label className="block text-sm font-medium text-[#0F172A] mb-3">Duration</label>
                                <div className="flex flex-wrap gap-2">
                                    {DURATION_FILTERS.map((duration) => (
                                        <button
                                            key={duration}
                                            onClick={() => setSelectedDuration(duration)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${selectedDuration === duration
                                                    ? 'bg-[#4F46E5] text-white'
                                                    : 'bg-[#F8FAFC] text-[#475569] hover:bg-[#EEF2FF]'
                                                }`}
                                        >
                                            {duration}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Results Count */}
                <div className="mb-4">
                    <p className="text-sm text-[#64748B]">
                        Showing <span className="font-semibold text-[#0F172A]">{filteredTasks.length}</span> tasks
                    </p>
                </div>

                {/* Task Grid */}
                {filteredTasks.length === 0 ? (
                    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12">
                        <EmptyState
                            icon={Briefcase}
                            title="No tasks found"
                            description="Try adjusting your search or filters to find more opportunities"
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredTasks.map((task) => (
                            <TaskCard key={task.id} task={task} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
