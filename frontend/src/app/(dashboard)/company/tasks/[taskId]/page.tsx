'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
    ArrowLeft,
    Pencil,
    Users,
    Eye,
    Sparkles,
    Loader2,
    Calendar,
    Clock,
    MapPin,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

import AppShell from '@/components/shared/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useRoleProtection } from '@/hooks/useRoleProtection'
import { taskService, Task } from '@/services/taskService'

const statusVariants: Record<string, 'success' | 'muted' | 'warning' | 'destructive' | 'soft'> = {
    active: 'success',
    closed: 'muted',
    draft: 'warning',
    paused: 'destructive',
    completed: 'soft',
}

export default function CompanyTaskDetailPage() {
    useRoleProtection({ allowedRoles: ['company'] })
    const params = useParams<{ taskId: string }>()
    const router = useRouter()
    const taskId = params?.taskId

    const [task, setTask] = useState<Task | null>(null)
    const [loading, setLoading] = useState(true)
    const [recomputing, setRecomputing] = useState(false)

    useEffect(() => {
        if (!taskId) return
        ;(async () => {
            try {
                setLoading(true)
                const data = await taskService.getTask(taskId)
                setTask(data)
            } catch {
                toast.error('Failed to load task')
            } finally {
                setLoading(false)
            }
        })()
    }, [taskId])

    const handleRecompute = async () => {
        if (!taskId) return
        try {
            setRecomputing(true)
            const result = await taskService.recomputeMatchScores(taskId)
            toast.success(
                result.total === 0
                    ? 'No applicants to score yet'
                    : `Recomputed ${result.updated} of ${result.total} match scores`,
            )
        } catch (err: any) {
            const status = err?.response?.status
            const msg =
                status === 503
                    ? 'AI service is offline — try again shortly'
                    : err?.response?.data?.message || 'Failed to recompute matches'
            toast.error(msg)
        } finally {
            setRecomputing(false)
        }
    }

    const budget = task ? taskService.formatBudget(task.budget) : ''
    const time = task ? taskService.getTimeRemaining(task.applicationDeadline) : null

    return (
        <AppShell>
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/company/tasks')}
                >
                    <ArrowLeft className="h-4 w-4" /> Back
                </Button>
            </div>

            {loading ? (
                <div className="space-y-3">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-44 w-full" />
                </div>
            ) : !task ? (
                <Card className="p-10 text-center text-sm text-muted-foreground">
                    Task not found.
                </Card>
            ) : (
                <>
                    <Card className="space-y-3 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                                        {task.title}
                                    </h1>
                                    <Badge variant={statusVariants[task.status] ?? 'muted'}>
                                        {task.status}
                                    </Badge>
                                </div>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {task.category} · {task.type}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Button asChild variant="secondary" size="sm">
                                    <Link href={`/tasks/${task._id}`}>
                                        <Eye className="h-4 w-4" /> Public view
                                    </Link>
                                </Button>
                                <Button asChild variant="secondary" size="sm">
                                    <Link href={`/company/tasks/${task._id}/edit`}>
                                        <Pencil className="h-4 w-4" /> Edit
                                    </Link>
                                </Button>
                                <Button asChild size="sm">
                                    <Link href={`/company/candidates?taskId=${task._id}`}>
                                        <Users className="h-4 w-4" /> Candidates (
                                        {task.applicationCount})
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-4">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>
                                    Deadline{' '}
                                    {new Date(task.applicationDeadline).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                <span>
                                    {time?.expired
                                        ? 'Expired'
                                        : time?.days === 0
                                          ? `${time?.hours}h left`
                                          : `${time?.days}d left`}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5" />
                                <span className="capitalize">{task.workType}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5" />
                                <span>
                                    {task.applicationCount} applicant
                                    {task.applicationCount === 1 ? '' : 's'} ·{' '}
                                    {budget}
                                </span>
                            </div>
                        </div>
                    </Card>

                    <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <Sparkles className="h-4 w-4 text-brand-600" />
                                AI match scores
                            </h2>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Recompute after updating required skills so each applicant's
                                match score reflects the latest task definition.
                            </p>
                        </div>
                        <Button
                            size="sm"
                            onClick={handleRecompute}
                            disabled={recomputing || task.applicationCount === 0}
                        >
                            {recomputing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> Recomputing…
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4" /> Recompute match scores
                                </>
                            )}
                        </Button>
                    </Card>

                    <Card className="space-y-2 p-5">
                        <h2 className="text-sm font-semibold text-foreground">Description</h2>
                        <p className="whitespace-pre-wrap text-sm text-foreground/80">
                            {task.description}
                        </p>
                        {task.skillsRequired.length > 0 && (
                            <div className="pt-2">
                                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Required skills
                                </h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {task.skillsRequired.map((s, i) => (
                                        <Badge key={`${s.name}-${i}`} variant="soft">
                                            {s.name}
                                            <span className="opacity-60">· {s.level}</span>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>
                </>
            )}
        </AppShell>
    )
}
