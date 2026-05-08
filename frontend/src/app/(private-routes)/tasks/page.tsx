"use client";

import { useState, useEffect } from "react";
import { taskService, Task, TaskFilters } from "@/services/taskService";
import TaskCard from "@/components/task/TaskCard";
import TaskFiltersComponent from "@/components/task/TaskFilters";
import TaskSearch from "@/components/task/TaskSearch";
import Pagination from "@/components/shared/Pagination";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { toast } from "react-hot-toast";

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalTasks, setTotalTasks] = useState(0);
    const [filters, setFilters] = useState<TaskFilters>({
        sortBy: 'createdAt',
        sortOrder: 'desc'
    });
    const [searchQuery, setSearchQuery] = useState("");

    const limit = 12;

    useEffect(() => {
        fetchTasks();
    }, [currentPage, filters]);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const response = await taskService.getTasks(currentPage, limit, {
                ...filters,
                search: searchQuery || undefined
            });

            setTasks(response.tasks);
            setTotalPages(response.pagination.totalPages);
            setTotalTasks(response.pagination.totalTasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            toast.error('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        setCurrentPage(1);
        setFilters(prev => ({ ...prev, search: query || undefined }));
    };

    const handleFilterChange = (newFilters: TaskFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setCurrentPage(1);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const clearFilters = () => {
        setFilters({
            sortBy: 'createdAt',
            sortOrder: 'desc'
        });
        setSearchQuery("");
        setCurrentPage(1);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Find Your Perfect Micro-Internship
                        </h1>
                        <p className="text-lg text-gray-600 mb-6">
                            Discover short-term opportunities to build your skills and gain real-world experience
                        </p>

                        {/* Search Bar */}
                        <div className="max-w-2xl mx-auto">
                            <TaskSearch
                                onSearch={handleSearch}
                                initialValue={searchQuery}
                                placeholder="Search by title, skills, or company..."
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Filters Sidebar */}
                    <div className="lg:w-1/4">
                        <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                                <button
                                    onClick={clearFilters}
                                    className="text-sm text-blue-600 hover:text-blue-700"
                                >
                                    Clear all
                                </button>
                            </div>

                            <TaskFiltersComponent
                                filters={filters}
                                onFilterChange={handleFilterChange}
                            />
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:w-3/4">
                        {/* Results Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">
                                    {loading ? 'Loading...' : `${totalTasks.toLocaleString()} opportunities found`}
                                </h2>
                                {searchQuery && (
                                    <p className="text-gray-600 mt-1">
                                        Results for "{searchQuery}"
                                    </p>
                                )}
                            </div>

                            {/* Sort Options */}
                            <div className="flex items-center space-x-2">
                                <label className="text-sm text-gray-600">Sort by:</label>
                                <select
                                    value={`${filters.sortBy}-${filters.sortOrder}`}
                                    onChange={(e) => {
                                        const [sortBy, sortOrder] = e.target.value.split('-');
                                        handleFilterChange({ sortBy, sortOrder: sortOrder as 'asc' | 'desc' });
                                    }}
                                    className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="createdAt-desc">Newest first</option>
                                    <option value="createdAt-asc">Oldest first</option>
                                    <option value="views-desc">Most viewed</option>
                                    <option value="applicationDeadline-asc">Deadline (earliest)</option>
                                    <option value="applicationDeadline-desc">Deadline (latest)</option>
                                </select>
                            </div>
                        </div>

                        {/* Loading State */}
                        {loading && (
                            <div className="flex justify-center py-12">
                                <LoadingSpinner size="lg" />
                            </div>
                        )}

                        {/* Tasks Grid */}
                        {!loading && tasks.length > 0 && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                    {tasks.map((task) => (
                                        <TaskCard key={task._id} task={task} />
                                    ))}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={handlePageChange}
                                    />
                                )}
                            </>
                        )}

                        {/* Empty State */}
                        {!loading && tasks.length === 0 && (
                            <div className="text-center py-12">
                                <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                                <p className="text-gray-600 mb-4">
                                    {searchQuery || Object.keys(filters).some(key => filters[key as keyof TaskFilters] && key !== 'sortBy' && key !== 'sortOrder')
                                        ? "Try adjusting your search criteria or filters"
                                        : "No tasks are currently available"
                                    }
                                </p>
                                {(searchQuery || Object.keys(filters).some(key => filters[key as keyof TaskFilters] && key !== 'sortBy' && key !== 'sortOrder')) && (
                                    <button
                                        onClick={clearFilters}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                    >
                                        Clear filters
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}