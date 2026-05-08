"use client";

import { useState, useEffect } from 'react';
import { Users, Eye, Clock, Plus, Edit2, Trash2, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { taskService, Task } from '@/services/taskService';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { getTextPreview } from '@/utils/textUtils';

export default function ActiveTasksCard() {
    const router = useRouter();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [statusMenuId, setStatusMenuId] = useState<string | null>(null);
    const [changingStatus, setChangingStatus] = useState<string | null>(null);

    useEffect(() => {
        fetchMyTasks();
    }, []);

    const fetchMyTasks = async () => {
        try {
            setLoading(true);
            const response = await taskService.getMyTasks(1, 4, 'active');
            setTasks(response.tasks);
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
            fetchMyTasks();
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
            fetchMyTasks();
        } catch (error: any) {
            console.error('Error changing status:', error);
            toast.error(error.response?.data?.message || 'Failed to change status');
        } finally {
            setChangingStatus(null);
        }
    };

    const getStatusColor = (status: string) => {
        const colors = {
            active: 'bg-[#DCFCE7] text-[#16A34A] border-[#86EFAC]',
            closed: 'bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]',
            draft: 'bg-[#FEF3C7] text-[#D97706] border-[#FCD34D]',
            paused: 'bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5]',
            completed: 'bg-[#DBEAFE] text-[#2563EB] border-[#93C5FD]',
        };
        return colors[status as keyof typeof colors] || colors.draft;
    };

    const formatDeadline = (deadline: string) => {
        const date = new Date(deadline);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (loading) {
        return (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
                <div className="flex items-center justify-center py-8">
                    <LoadingSpinner size="md" />
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[#0F172A]">Active Tasks</h3>
                    <div className="flex items-center gap-2">
                        <Link
                            href="/company/tasks"
                            className="text-sm font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors"
                        >
                            View All
                        </Link>
                        <Link
                            href="/company/post-task"
                            className="flex items-center gap-1 text-sm font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Post New
                        </Link>
                    </div>
                </div>

                {tasks.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                            <Clock className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-600 mb-3">No active tasks yet</p>
                        <Link
                            href="/company/post-task"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#4F46E5] text-white text-sm font-medium rounded-lg hover:bg-[#4338CA] transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Post Your First Task
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tasks.map((task) => (
                            <div
                                key={task._id}
                                className="border border-[#E2E8F0] rounded-xl p-4 hover:border-[#4F46E5] transition-all duration-200 relative"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <Link href={`/tasks/${task._id}`} className="flex-1 pr-2">
                                        <p className="text-sm font-bold text-[#0F172A] line-clamp-2 hover:text-[#4F46E5] transition-colors">
                                            {task.title}
                                        </p>
                                    </Link>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded-md text-xs font-semibold border capitalize whitespace-nowrap ${getStatusColor(task.status)}`}>
                                            {task.status}
                                        </span>

                                        <div className="relative">
                                            <button
                                                onClick={() => setOpenMenuId(openMenuId === task._id ? null : task._id)}
                                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                                            >
                                                <MoreVertical className="w-4 h-4 text-gray-600" />
                                            </button>

                                            {openMenuId === task._id && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => setOpenMenuId(null)}
                                                    />
                                                    <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                                        {/* Status Change Submenu */}
                                                        <div className="relative">
                                                            <button
                                                                onClick={() => setStatusMenuId(statusMenuId === task._id ? null : task._id)}
                                                                className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
                                                            >
                                                                <span className="flex items-center gap-2">
                                                                    <span className="w-3 h-3 flex items-center justify-center text-[10px]">⚡</span>
                                                                    Status
                                                                </span>
                                                                <span className="text-[10px]">›</span>
                                                            </button>

                                                            {statusMenuId === task._id && (
                                                                <div className="absolute left-full top-0 ml-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                                                                    {['active', 'draft', 'paused', 'closed', 'completed'].map((status) => (
                                                                        <button
                                                                            key={status}
                                                                            onClick={() => handleStatusChange(task._id, status)}
                                                                            disabled={task.status === status || changingStatus === task._id}
                                                                            className={`w-full text-left px-3 py-2 text-xs capitalize ${task.status === status
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
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
                                                        >
                                                            <Edit2 className="w-3 h-3" />
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setTaskToDelete(task);
                                                                setDeleteModalOpen(true);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                            Delete
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-[#64748B] flex-wrap">
                                    <div className="flex items-center gap-1">
                                        <Users className="w-3.5 h-3.5" />
                                        {task.applicationCount} applicants
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Eye className="w-3.5 h-3.5" />
                                        {task.views} views
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {formatDeadline(task.applicationDeadline)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

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
        </>
    );
}
