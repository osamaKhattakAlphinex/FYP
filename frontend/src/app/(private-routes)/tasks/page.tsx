'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { taskService, Task, TaskFilters } from '@/services/taskService'
import TaskListItem from '@/components/task/TaskListItem'
import TaskFiltersComponent from '@/components/task/TaskFilters'
import TaskSearch from '@/components/task/TaskSearch'
import TaskDetailPane from '@/components/task/TaskDetailPane'
import Pagination from '@/components/shared/Pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'
import { toast } from 'react-hot-toast'
import ApplyModal from '@/components/applications/ApplyModal'
import { applicationService } from '@/services/applicationService'
import { useAuth } from '@/contexts/AuthContext'

const LIMIT = 12

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalTasks, setTotalTasks] = useState(0)
    const [filters, setFilters] = useState<TaskFilters>({
        sortBy: 'createdAt',
        sortOrder: 'desc',
    })
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
    const [applyOpen, setApplyOpen] = useState(false)
    const [appliedMap, setAppliedMap] = useState<Record<string, string>>({})
    const { user, loading: authLoading } = useAuth()
    const isStudent = user?.role === 'student'
    const searchParams = useSearchParams()
    const router = useRouter()

    // Companies don't browse the student task feed — send them to their own
    // task management view instead.
    useEffect(() => {
        if (!authLoading && user?.role === 'company') {
            router.replace('/company/tasks')
        }
    }, [authLoading, user, router])

    useEffect(() => {
        // Students default to the AI "Recommended" ranking unless the URL asks
        // for a specific sort. Companies/guests keep the "Most recent" default.
        const sort = searchParams.get('sort')
        if (isStudent && (sort === 'recommended' || !sort)) {
            setFilters((p) => ({ ...p, sortBy: 'recommended', sortOrder: 'desc' }))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isStudent])

    const selectedTask = tasks.find((t) => t._id === selectedTaskId) ?? null
    const appliedApplicationId = selectedTask ? appliedMap[selectedTask._id] : null

    const refreshAppliedMap = async () => {
        if (!isStudent) return
        try {
            const res = await applicationService.getMyApplications(1, 100, 'all')
            const map: Record<string, string> = {}
            res.applications.forEach((a) => {
                map[String(a.taskId)] = a._id
            })
            setAppliedMap(map)
        } catch {
            // Non-critical
        }
    }

    useEffect(() => {
        refreshAppliedMap()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isStudent])

    useEffect(() => {
        fetchTasks()
    }, [currentPage, filters])

    const fetchTasks = async () => {
        try {
            setLoading(true)

            // The backend personalises every task with an AI matchScore for
            // students and handles the 'recommended' sort (whole-pool ranking +
            // pagination), so a single getTasks call covers all sort modes.
            const response = await taskService.getTasks(currentPage, LIMIT, {
                ...filters,
                search: searchQuery || undefined,
            })
            const nextTasks = response.tasks
            const nextTotalPages = response.pagination.totalPages
            const nextTotalTasks = response.pagination.totalTasks

            setTasks(nextTasks)
            setTotalPages(nextTotalPages)
            setTotalTasks(nextTotalTasks)

            if (nextTasks.length > 0 && !selectedTaskId) {
                setSelectedTaskId(nextTasks[0]._id)
            } else if (
                selectedTaskId &&
                !nextTasks.some((t) => t._id === selectedTaskId)
            ) {
                setSelectedTaskId(nextTasks[0]?._id ?? null)
            }
        } catch (error) {
            toast.error('Failed to load tasks')
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = (q: string) => {
        setSearchQuery(q)
        setCurrentPage(1)
        setFilters((p) => ({ ...p, search: q || undefined }))
    }

    const handleFilterChange = (newFilters: TaskFilters) => {
        setFilters((p) => ({ ...p, ...newFilters }))
        setCurrentPage(1)
    }

    const handleSortChange = (value: string) => {
        const [sortBy, sortOrder] = value.split('-')
        handleFilterChange({ sortBy, sortOrder: sortOrder as 'asc' | 'desc' })
    }

    const clearFilters = () => {
        setFilters({ sortBy: 'createdAt', sortOrder: 'desc' })
        setSearchQuery('')
        setCurrentPage(1)
    }

    const activeFilterCount = Object.entries(filters).filter(
        ([k, v]) => v && k !== 'sortBy' && k !== 'sortOrder'
    ).length

    return (
        <div className="surface-canvas min-h-[calc(100vh-3.5rem)]">
            <div className="border-b border-border bg-card">
                <div className="mx-auto max-w-[1280px] px-4 py-5 lg:px-6">
                    <TaskSearch onSearch={handleSearch} initialValue={searchQuery} />
                </div>
            </div>

            <div className="mx-auto max-w-[1280px] px-4 py-6 lg:px-6">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_minmax(0,440px)_minmax(0,1fr)] md:grid-cols-[260px_minmax(0,1fr)]">
                    {/* Filter rail */}
                    <aside className="hidden md:block">
                        <div className="sticky top-[4.5rem] rounded-md border border-border bg-card p-4">
                            <div className="mb-2 flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-foreground">Filters</h2>
                                {activeFilterCount > 0 && (
                                    <button
                                        onClick={clearFilters}
                                        className="text-xs font-medium text-brand-600 hover:underline"
                                    >
                                        Clear all
                                    </button>
                                )}
                            </div>
                            <TaskFiltersComponent
                                filters={filters}
                                onFilterChange={handleFilterChange}
                            />
                        </div>
                    </aside>

                    {/* Result list */}
                    <section className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                {loading ? (
                                    'Loading…'
                                ) : (
                                    <>
                                        <span className="font-semibold text-foreground">
                                            {totalTasks.toLocaleString()}
                                        </span>{' '}
                                        result{totalTasks === 1 ? '' : 's'}
                                        {searchQuery ? ` for "${searchQuery}"` : ''}
                                    </>
                                )}
                            </p>
                            <Select
                                value={`${filters.sortBy}-${filters.sortOrder}`}
                                onValueChange={handleSortChange}
                            >
                                <SelectTrigger className="h-8 w-44 text-xs">
                                    <SelectValue placeholder="Sort" />
                                </SelectTrigger>
                                <SelectContent>
                                    {isStudent && (
                                        <SelectItem value="recommended-desc">
                                            ✨ Recommended (AI)
                                        </SelectItem>
                                    )}
                                    <SelectItem value="createdAt-desc">Most recent</SelectItem>
                                    <SelectItem value="createdAt-asc">Oldest first</SelectItem>
                                    <SelectItem value="views-desc">Most viewed</SelectItem>
                                    <SelectItem value="applicationDeadline-asc">
                                        Closing soonest
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {loading && (
                            <div className="space-y-2">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Skeleton key={i} className="h-24 w-full" />
                                ))}
                            </div>
                        )}

                        {!loading && tasks.length > 0 && (
                            <>
                                <div className="space-y-2">
                                    {tasks.map((task) => (
                                        <TaskListItem
                                            key={task._id}
                                            task={task}
                                            selected={selectedTaskId === task._id}
                                            onClick={() => setSelectedTaskId(task._id)}
                                        />
                                    ))}
                                </div>
                                {totalPages > 1 && (
                                    <div className="pt-2">
                                        <Pagination
                                            currentPage={currentPage}
                                            totalPages={totalPages}
                                            onPageChange={(p) => {
                                                setCurrentPage(p)
                                                window.scrollTo({ top: 0, behavior: 'smooth' })
                                            }}
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        {!loading && tasks.length === 0 && (
                            <div className="rounded-md border border-dashed border-border bg-card p-10 text-center">
                                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
                                    <Search className="h-5 w-5" />
                                </div>
                                <h3 className="mt-3 text-base font-semibold text-foreground">
                                    No tasks match your filters
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Try broadening your search or removing a filter.
                                </p>
                                {activeFilterCount > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-4"
                                        onClick={clearFilters}
                                    >
                                        Clear filters
                                    </Button>
                                )}
                            </div>
                        )}
                    </section>

                    {/* Detail pane */}
                    <aside className="hidden lg:block">
                        <div className="sticky top-[4.5rem] max-h-[calc(100vh-5rem)] overflow-y-auto scrollbar-thin">
                            <TaskDetailPane
                                task={selectedTask}
                                appliedApplicationId={appliedApplicationId}
                                onApply={() => {
                                    if (!selectedTask) return
                                    setApplyOpen(true)
                                }}
                            />
                        </div>
                    </aside>
                </div>
            </div>

            {selectedTask && (
                <ApplyModal
                    taskId={selectedTask._id}
                    taskTitle={selectedTask.title}
                    taskBudgetType={selectedTask.budget?.type}
                    isOpen={applyOpen}
                    onClose={() => setApplyOpen(false)}
                    onSuccess={() => {
                        fetchTasks()
                        refreshAppliedMap()
                    }}
                />
            )}
        </div>
    )
}
