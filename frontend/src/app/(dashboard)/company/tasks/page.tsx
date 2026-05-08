"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, Edit2, Trash2, Eye, Users, MoreVertical } from 'lucide-react';
import { taskService, Task } from '@/services/taskService';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { useRoleProtection } from '@/hooks/useRoleProtection';
import { getTextPreview } from '@/utils/textUtils';

export default function CompanyTasksPage() {
    useRoleProtection({ allowedRoles: ['company'] });

    const router = useRouter();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalTasks, setTotalTasks] = useState(0);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [statusMenuId, setStatusMenuId] = useState<string | null>(null);
    const [changingStatus, setChangingStatus] = useState<string | null>(null);

    const limit = 10;

    useEffect(() => {
        fetchTasks();
    }, [currentPage, statusFilter, searchQuery]);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const response = await taskService.getMyTasks(
                currentPage,
                limit,
                statusFilter,
                'createdAt',
                'desc'
            );
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

    const handleDelete = async () => {
        if (!taskToDelete) return;

        try {
            setDeleting(true);
            await taskService.deleteTask(taskToDelete._id);
            toast.success('Task deleted successfully');
            setDeleteModalOpen(false);
            setTaskToDelete(null);
            fetchTasks();
        } catch (error: any) {
            console.error('Error deleting task:', error);
            toast.error(error.response?.data?.message || 'Failed to delete task');
        } finally {
            setDeleting(false);
        }
    };

    const handleStatusChange = async (taskId: string, newStatus: string) => {
        try {
            setChangingStatus(taskId);
            await taskService.updateTask(taskId, { status: newStatus as any });
            toast.success(`Task status changed to ${newStatus}`);
            setStatusMenuId(null);
            setOpenMenuId(null);
            fetchTasks();
        } catch (error: any) {
            console.error('Error changing status:', error);
            toast.error(error.response?.data?.message || 'Failed to change status');
        } finally {
            setChangingStatus(null);
        }
    };

    const getStatusColor = (status: string) => {
        const colors = {
            active: 'bg-green-100 text-green-800 border-green-200',
            draft: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            paused: 'bg-orange-100 text-orange-800 border-orange-200',
            closed: 'bg-gray-100 text-gray-800 border-gray-200',
            completed: 'bg-blue-100 text-blue-800 border-blue-200',
        };
        return colors[status as keyof typeof colors] || colors.draft;
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
                        <p className="text-gray-600 mt-1">Manage your posted tasks</p>
                    </div>
                    <button
                        onClick={() => router.push('/company/post-task')}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Post New Task
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search tasks..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="draft">Draft</option>
                            <option value="paused">Paused</option>
                            <option value="closed">Closed</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                </div>

                {/* Results Count */}
                <div className="mb-4">
                    <p className="text-sm text-gray-600">
                        {loading ? 'Loading...' : `Showing ${tasks.length} of ${totalTasks} tasks`}
                    </p>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center py-12">
                        <LoadingSpinner size="lg" />
                    </div>
                )}

                {/* Tasks List */}
                {!loading && tasks.length === 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                            <Plus className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                        <p className="text-gray-600 mb-4">
                            {searchQuery || statusFilter !== 'all'
                                ? 'Try adjusting your filters'
                                : 'Get started by posting your first task'}
                        </p>
                        {!searchQuery && statusFilter === 'all' && (
                            <button
                                onClick={() => router.push('/company/post-task')}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                                Post Your First Task
                            </button>
                        )}
                    </div>
                ) : !loading && (
                    <div className="space-y-4">
                        {tasks.map((task) => (
                            <div
                                key={task._id}
                                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {task.title}
                                            </h3>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium border capitalize ${getStatusColor(task.status)}`}>
                                                {task.status}
                                            </span>
                                            {task.isFeatured && (
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                                    ⭐ Featured
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                            {getTextPreview(task.description, 150)}
                                        </p>

                                        {/* Stats */}
                                        <div className="flex items-center gap-6 text-sm text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <Users className="w-4 h-4" />
                                                <span>{task.applicationCount}/{task.maxApplications} applications</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Eye className="w-4 h-4" />
                                                <span>{task.views} views</span>
                                            </div>
                                            <div>
                                                Deadline: {formatDate(task.applicationDeadline)}
                                            </div>
                                            <div className="capitalize">
                                                {task.workType}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions Menu */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setOpenMenuId(openMenuId === task._id ? null : task._id)}
                                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            <MoreVertical className="w-5 h-5 text-gray-600" />
                                        </button>

                                        {openMenuId === task._id && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-10"
                                                    onClick={() => setOpenMenuId(null)}
                                                />
                                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                                    <button
                                                        onClick={() => {
                                                            router.push(`/tasks/${task._id}`);
                                                            setOpenMenuId(null);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        View Details
                                                    </button>

                                                    {/* Status Change Submenu */}
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setStatusMenuId(statusMenuId === task._id ? null : task._id)}
                                                            className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                        >
                                                            <span className="flex items-center gap-2">
                                                                <span className="w-4 h-4 flex items-center justify-center">⚡</span>
                                                                Change Status
                                                            </span>
                                                            <span className="text-xs">›</span>
                                                        </button>

                                                        {statusMenuId === task._id && (
                                                            <div className="absolute left-full top-0 ml-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                                                                {['active', 'draft', 'paused', 'closed', 'completed'].map((status) => (
                                                                    <button
                                                                        key={status}
                                                                        onClick={() => handleStatusChange(task._id, status)}
                                                                        disabled={task.status === status || changingStatus === task._id}
                                                                        className={`w-full text-left px-4 py-2 text-sm capitalize ${task.status === status
                                                                            ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                                                            : 'text-gray-700 hover:bg-gray-100'
                                                                            } ${changingStatus === task._id ? 'opacity-50' : ''}`}
                                                                    >
                                                                        {status}
                                                                        {task.status === status && ' ✓'}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            router.push(`/company/tasks/${task._id}/edit`);
                                                            setOpenMenuId(null);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                        Edit Task
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setTaskToDelete(task);
                                                            setDeleteModalOpen(true);
                                                            setOpenMenuId(null);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Delete Task
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-8">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-600">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && taskToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Task</h3>
                        <p className="text-gray-600 mb-4">
                            Are you sure you want to delete "{taskToDelete.title}"? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setDeleteModalOpen(false);
                                    setTaskToDelete(null);
                                }}
                                disabled={deleting}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {deleting ? (
                                    <>
                                        <LoadingSpinner size="sm" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
