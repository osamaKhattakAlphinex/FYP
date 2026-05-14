'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    Plus,
    Search,
    Pencil,
    Trash2,
    Eye,
    Users,
    MoreVertical,
    Loader2,
    ClipboardList,
    Sparkles,
} from 'lucide-react'
import { taskService, Task } from '@/services/taskService'
import AppShell from '@/components/shared/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogBody,
    DialogFooter,
    DialogTitle,
    DialogCloseButton,
} from '@/components/ui/dialog'
import { useRoleProtection } from '@/hooks/useRoleProtection'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'

const STATUSES: Array<Task['status']> = ['active', 'draft', 'paused', 'closed', 'completed']

const statusFilters = ['all', 'active', 'draft', 'paused', 'closed', 'completed'] as const
type StatusFilter = (typeof statusFilters)[number]

const statusVariants: Record<string, 'success' | 'muted' | 'warning' | 'destructive' | 'soft'> = {
    active: 'success',
    closed: 'muted',
    draft: 'warning',
    paused: 'destructive',
    completed: 'soft',
}

export default function CompanyTasksPage() {
    useRoleProtection({ allowedRoles: ['company'] })
    const router = useRouter()

    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalTasks, setTotalTasks] = useState(0)
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [changingStatusId, setChangingStatusId] = useState<string | null>(null)

    const limit = 10

    useEffect(() => {
        fetchTasks()
    }, [currentPage, statusFilter])

    const fetchTasks = async () => {
        try {
            setLoading(true)
            const response = await taskService.getMyTasks(
                currentPage,
                limit,
                statusFilter,
                'createdAt',
                'desc'
            )
            setTasks(response.tasks)
            setTotalPages(response.pagination.totalPages)
            setTotalTasks(response.pagination.totalTasks)
        } catch {
            toast.error('Failed to load tasks')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!taskToDelete) return
        try {
            setDeleting(true)
            await taskService.deleteTask(taskToDelete._id)
            toast.success('Task deleted')
            setTaskToDelete(null)
            fetchTasks()
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete')
        } finally {
            setDeleting(false)
        }
    }

    const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
        try {
            setChangingStatusId(taskId)
            await taskService.updateTask(taskId, { status: newStatus as any })
            toast.success(`Task ${newStatus}`)
            fetchTasks()
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update')
        } finally {
            setChangingStatusId(null)
        }
    }

    const formatDate = (date: string) =>
        new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })

    const filteredTasks = searchQuery
        ? tasks.filter((t) =>
              t.title.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : tasks

    // Stats counts (across loaded page only)
    const counts = STATUSES.reduce(
        (acc, s) => ({ ...acc, [s]: tasks.filter((t) => t.status === s).length }),
        {} as Record<Task['status'], number>
    )
    const totalApplicants = tasks.reduce((acc, t) => acc + (t.applicationCount || 0), 0)
    const totalViews = tasks.reduce((acc, t) => acc + (t.views || 0), 0)

    return (
        <>
            <AppShell
                rightRail={
                    <>
                        <Card className="p-4">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                At a glance
                            </h3>
                            <dl className="mt-3 space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <dt className="text-muted-foreground">Total tasks</dt>
                                    <dd className="font-semibold text-foreground">{totalTasks}</dd>
                                </div>
                                <Separator />
                                {STATUSES.map((s) => (
                                    <div
                                        key={s}
                                        className="flex items-center justify-between"
                                    >
                                        <dt className="capitalize text-muted-foreground">{s}</dt>
                                        <dd>
                                            <Badge variant={statusVariants[s]}>{counts[s]}</Badge>
                                        </dd>
                                    </div>
                                ))}
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <dt className="text-muted-foreground">Total applicants</dt>
                                    <dd className="font-semibold text-brand-700">
                                        {totalApplicants}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between">
                                    <dt className="text-muted-foreground">Total views</dt>
                                    <dd className="font-semibold text-brand-700">{totalViews}</dd>
                                </div>
                            </dl>
                        </Card>
                        <Card className="overflow-hidden">
                            <div className="bg-accent-500 px-4 py-3 text-accent-foreground">
                                <p className="text-xs font-semibold uppercase tracking-wider">
                                    Tip
                                </p>
                                <p className="mt-1 text-sm font-semibold">
                                    Detailed deliverables hire faster
                                </p>
                            </div>
                            <div className="px-4 py-3">
                                <p className="text-xs text-muted-foreground">
                                    Tasks with 3+ deliverables receive 60% more high-quality
                                    applications.
                                </p>
                                <Button asChild variant="accent" size="sm" className="mt-3 w-full">
                                    <Link href="/company/post-task">
                                        <Sparkles className="h-3.5 w-3.5" /> Post a task
                                    </Link>
                                </Button>
                            </div>
                        </Card>
                    </>
                }
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                            My tasks
                        </h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Manage every task you've posted
                        </p>
                    </div>
                    <Button asChild size="sm">
                        <Link href="/company/post-task">
                            <Plus className="h-4 w-4" />
                            Post task
                        </Link>
                    </Button>
                </div>

                <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by title…"
                            className="h-9 pl-9"
                        />
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {statusFilters.map((s) => (
                            <button
                                key={s}
                                onClick={() => {
                                    setStatusFilter(s)
                                    setCurrentPage(1)
                                }}
                                className={cn(
                                    'rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors',
                                    statusFilter === s
                                        ? 'bg-foreground text-background'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                                )}
                            >
                                {s === 'all' ? 'All' : s}
                            </button>
                        ))}
                    </div>
                </Card>

                <p className="text-xs text-muted-foreground">
                    {loading
                        ? 'Loading…'
                        : `${totalTasks.toLocaleString()} task${totalTasks === 1 ? '' : 's'}`}
                </p>

                {loading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-20 w-full" />
                        ))}
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <Card className="p-10 text-center">
                        <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
                            <ClipboardList className="h-5 w-5" />
                        </div>
                        <h3 className="mt-3 text-sm font-semibold text-foreground">
                            No tasks {statusFilter !== 'all' ? `(${statusFilter})` : 'yet'}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {searchQuery || statusFilter !== 'all'
                                ? 'Try adjusting your filters.'
                                : 'Get started by posting your first task.'}
                        </p>
                        {!searchQuery && statusFilter === 'all' && (
                            <Button asChild size="sm" className="mt-4">
                                <Link href="/company/post-task">
                                    <Plus className="h-4 w-4" /> Post your first task
                                </Link>
                            </Button>
                        )}
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {filteredTasks.map((task) => (
                            <Card
                                key={task._id}
                                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Link
                                            href={`/tasks/${task._id}`}
                                            className="line-clamp-1 text-sm font-semibold text-foreground hover:text-brand-700"
                                        >
                                            {task.title}
                                        </Link>
                                        <Badge variant={statusVariants[task.status] ?? 'muted'}>
                                            {task.status}
                                        </Badge>
                                        {task.isFeatured && (
                                            <Badge variant="accent">Featured</Badge>
                                        )}
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                        <Link
                                            href={`/company/candidates?taskId=${task._id}`}
                                            className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100"
                                        >
                                            <Users className="h-3 w-3" />
                                            Applications: {task.applicationCount}
                                            {task.maxApplications
                                                ? ` / ${task.maxApplications}`
                                                : ''}
                                        </Link>
                                        <span className="flex items-center gap-1">
                                            <Eye className="h-3 w-3" /> {task.views} views
                                        </span>
                                        <span>Deadline {formatDate(task.applicationDeadline)}</span>
                                        <span className="capitalize">{task.workType}</span>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger
                                        aria-label="Options"
                                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onClick={() => router.push(`/tasks/${task._id}`)}
                                        >
                                            <Eye className="h-4 w-4" /> View details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() =>
                                                router.push(`/company/tasks/${task._id}/edit`)
                                            }
                                        >
                                            <Pencil className="h-4 w-4" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel>Change status</DropdownMenuLabel>
                                        {STATUSES.map((s) => (
                                            <DropdownMenuItem
                                                key={s}
                                                disabled={
                                                    task.status === s ||
                                                    changingStatusId === task._id
                                                }
                                                onClick={() => handleStatusChange(task._id, s)}
                                                className={cn(task.status === s && 'opacity-50')}
                                            >
                                                <span className="capitalize">{s}</span>
                                                {task.status === s && (
                                                    <span className="ml-auto text-xs">✓</span>
                                                )}
                                            </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => setTaskToDelete(task)}
                                            className="text-destructive focus:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" /> Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </Card>
                        ))}
                    </div>
                )}

                {!loading && totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 pt-2 text-sm">
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        >
                            Previous
                        </Button>
                        <span className="text-muted-foreground">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        >
                            Next
                        </Button>
                    </div>
                )}
            </AppShell>

            <Dialog
                open={!!taskToDelete}
                onOpenChange={(open) => !open && setTaskToDelete(null)}
            >
                <DialogContent size="sm">
                    <DialogHeader>
                        <DialogTitle>Delete task?</DialogTitle>
                        <DialogCloseButton />
                    </DialogHeader>
                    <DialogBody>
                        <p className="text-sm text-foreground/80">
                            "<span className="font-semibold">{taskToDelete?.title}</span>" will be
                            permanently removed. This can't be undone.
                        </p>
                    </DialogBody>
                    <DialogFooter>
                        <Button
                            variant="secondary"
                            onClick={() => setTaskToDelete(null)}
                            disabled={deleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleting}
                        >
                            {deleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> Deleting…
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4" /> Delete task
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
