'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Users, Eye, Clock, Plus, Pencil, Trash2, MoreVertical, Loader2 } from 'lucide-react'
import { taskService, Task } from '@/services/taskService'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
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
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'

const statusVariants: Record<string, 'success' | 'muted' | 'warning' | 'destructive' | 'soft'> = {
    active: 'success',
    closed: 'muted',
    draft: 'warning',
    paused: 'destructive',
    completed: 'soft',
}

const STATUSES: Array<Task['status']> = ['active', 'draft', 'paused', 'closed', 'completed']

export default function ActiveTasksCard() {
    const router = useRouter()
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [changingStatusId, setChangingStatusId] = useState<string | null>(null)

    const fetchMyTasks = async () => {
        try {
            setLoading(true)
            const response = await taskService.getMyTasks(1, 4, 'active')
            setTasks(response.tasks)
        } catch {
            toast.error('Failed to load tasks')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMyTasks()
    }, [])

    const handleDelete = async () => {
        if (!taskToDelete) return
        try {
            setDeleting(true)
            await taskService.deleteTask(taskToDelete._id)
            toast.success('Task deleted')
            setTaskToDelete(null)
            fetchMyTasks()
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
            fetchMyTasks()
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update')
        } finally {
            setChangingStatusId(null)
        }
    }

    const formatDeadline = (deadline: string) =>
        new Date(deadline).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Active tasks</CardTitle>
                    <div className="flex items-center gap-3 text-xs">
                        <Link
                            href="/company/tasks"
                            className="font-semibold text-brand-700 hover:underline"
                        >
                            View all
                        </Link>
                        <Link
                            href="/company/post-task"
                            className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
                        >
                            <Plus className="h-3.5 w-3.5" /> Post new
                        </Link>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="space-y-2 px-6 pb-6">
                            <Skeleton className="h-16" />
                            <Skeleton className="h-16" />
                            <Skeleton className="h-16" />
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="px-6 pb-6 text-center">
                            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
                                <Clock className="h-5 w-5" />
                            </div>
                            <p className="mt-3 text-sm text-muted-foreground">
                                No active tasks yet
                            </p>
                            <Button asChild size="sm" className="mt-3">
                                <Link href="/company/post-task">
                                    <Plus className="h-3.5 w-3.5" />
                                    Post your first task
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <ul className="divide-y divide-border">
                            {tasks.map((task) => (
                                <li
                                    key={task._id}
                                    className="flex items-start gap-3 px-6 py-4 transition-colors hover:bg-muted/40"
                                >
                                    <div className="min-w-0 flex-1">
                                        <Link
                                            href={`/tasks/${task._id}`}
                                            className="line-clamp-1 text-sm font-semibold text-foreground hover:text-brand-700"
                                        >
                                            {task.title}
                                        </Link>
                                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                {task.applicationCount} applicant
                                                {task.applicationCount === 1 ? '' : 's'}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Eye className="h-3 w-3" /> {task.views}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {formatDeadline(task.applicationDeadline)}
                                            </span>
                                        </div>
                                    </div>
                                    <Badge variant={statusVariants[task.status] ?? 'muted'}>
                                        {task.status}
                                    </Badge>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger
                                            aria-label="Options"
                                            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
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
                                                onClick={() =>
                                                    router.push(`/company/tasks/${task._id}/edit`)
                                                }
                                            >
                                                <Pencil className="h-4 w-4" /> Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => setTaskToDelete(task)}
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
                <DialogContent size="sm">
                    <DialogHeader>
                        <DialogTitle>Delete task?</DialogTitle>
                        <DialogCloseButton />
                    </DialogHeader>
                    <DialogBody>
                        <p className="text-sm text-foreground/80">
                            "<span className="font-semibold">{taskToDelete?.title}</span>" will be
                            permanently removed and applicants will be notified. This can't be undone.
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
