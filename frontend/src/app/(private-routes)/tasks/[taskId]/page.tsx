'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft,
    BadgeCheck,
    Bookmark,
    Building2,
    Calendar,
    CheckCircle,
    Clock,
    DollarSign,
    Eye,
    MapPin,
    Send,
    Target,
    Users,
} from 'lucide-react'
import { taskService, Task } from '@/services/taskService'
import { applicationService } from '@/services/applicationService'
import ApplyModal from '@/components/applications/ApplyModal'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'react-hot-toast'
import { formatRelativeTime, getInitials } from '@/lib/utils'

export default function TaskDetailPage() {
    const params = useParams()
    const router = useRouter()
    const [task, setTask] = useState<Task | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showApply, setShowApply] = useState(false)
    const [myApplicationId, setMyApplicationId] = useState<string | null>(null)
    const { user } = useAuth()
    const isStudent = user?.role === 'student'

    useEffect(() => {
        fetchTask()
    }, [params.taskId])

    useEffect(() => {
        if (!isStudent || !params.taskId) {
            setMyApplicationId(null)
            return
        }
        ;(async () => {
            try {
                const res = await applicationService.getMyApplications(1, 100, 'all')
                const match = res.applications.find(
                    (a) => String(a.taskId) === String(params.taskId),
                )
                setMyApplicationId(match?._id ?? null)
            } catch {
                // Non-critical — leave button enabled
            }
        })()
    }, [isStudent, params.taskId])

    const fetchTask = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await taskService.getTask(params.taskId as string)
            setTask(data)
            taskService.trackView(params.taskId as string).catch(() => {})
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load task')
            toast.error('Failed to load task details')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="surface-canvas min-h-[calc(100vh-3.5rem)] py-6">
                <div className="mx-auto grid max-w-[1200px] gap-5 px-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6">
                    <div className="space-y-4">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                    <Skeleton className="hidden h-64 w-full lg:block" />
                </div>
            </div>
        )
    }

    if (error || !task) {
        return (
            <div className="surface-canvas min-h-[calc(100vh-3.5rem)] grid place-items-center px-4 py-10">
                <Card className="w-full max-w-md p-8 text-center">
                    <h3 className="text-lg font-semibold text-foreground">Task not found</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {error || 'The task you are looking for does not exist.'}
                    </p>
                    <Button asChild className="mt-5">
                        <Link href="/tasks">Back to tasks</Link>
                    </Button>
                </Card>
            </div>
        )
    }

    const time = taskService.getTimeRemaining(task.applicationDeadline)
    const company = task.companyId

    return (
        <div className="surface-canvas min-h-[calc(100vh-3.5rem)] py-6">
            <div className="mx-auto max-w-[1200px] px-4 lg:px-6">
                <button
                    onClick={() => router.back()}
                    className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to tasks
                </button>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                    {/* Main column */}
                    <div className="space-y-4">
                        {/* Header card */}
                        <Card className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-md border border-border bg-muted text-base font-semibold">
                                    {company.logo ? (
                                        <img
                                            src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${company.logo}`}
                                            alt={company.companyName}
                                            className="h-full w-full rounded-md object-cover"
                                        />
                                    ) : (
                                        getInitials(company.companyName)
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
                                        {task.title}
                                    </h1>
                                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                                        <Link
                                            href={`/company/${company._id}`}
                                            className="font-medium text-brand-700 hover:underline"
                                        >
                                            {company.companyName}
                                        </Link>
                                        {company.isVerified && (
                                            <BadgeCheck className="h-4 w-4 text-brand-600" />
                                        )}
                                        <span className="text-muted-foreground">
                                            · {company.industry}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <MapPin className="h-3.5 w-3.5" />
                                            {task.workType === 'remote'
                                                ? 'Remote'
                                                : `${task.workType.charAt(0).toUpperCase()}${task.workType.slice(1)}`}
                                        </span>
                                        <span>Posted {formatRelativeTime(task.createdAt)}</span>
                                        <span className="flex items-center gap-1">
                                            <Eye className="h-3.5 w-3.5" /> {task.views} views
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5" />
                                            {task.applicationCount} applicant
                                            {task.applicationCount === 1 ? '' : 's'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 flex flex-wrap items-center gap-2">
                                {myApplicationId ? (
                                    <>
                                        <Button variant="secondary" disabled>
                                            <CheckCircle className="h-4 w-4 text-success" />
                                            Applied
                                        </Button>
                                        <Button asChild variant="ghost" size="sm">
                                            <Link href={`/student/applications/${myApplicationId}`}>
                                                View application
                                            </Link>
                                        </Button>
                                    </>
                                ) : (
                                    <Button onClick={() => setShowApply(true)}>
                                        <Send className="h-4 w-4" /> Apply
                                    </Button>
                                )}
                                <Button variant="secondary">
                                    <Bookmark className="h-4 w-4" /> Save
                                </Button>
                                {!time.expired && (
                                    <span className="ml-auto text-xs text-muted-foreground">
                                        <Calendar className="mr-1 inline h-3.5 w-3.5" />
                                        Apply by{' '}
                                        <span className="font-medium text-foreground">
                                            {time.days}d {time.hours}h
                                        </span>
                                    </span>
                                )}
                            </div>
                        </Card>

                        <Card>
                            <div className="grid gap-4 p-6 sm:grid-cols-3">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Compensation
                                    </p>
                                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                        <DollarSign className="h-4 w-4 text-success" />
                                        {taskService.formatBudget(task.budget)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Duration
                                    </p>
                                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                        <Clock className="h-4 w-4 text-brand-600" />
                                        {taskService.formatDuration(task.duration)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Experience
                                    </p>
                                    <p className="mt-1 text-sm font-semibold capitalize text-foreground">
                                        {task.experienceLevel}
                                    </p>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6">
                            <h2 className="text-lg font-semibold text-foreground">About this task</h2>
                            <div
                                className="prose prose-sm mt-3 max-w-none text-foreground/80"
                                dangerouslySetInnerHTML={{ __html: task.description }}
                            />
                        </Card>

                        {task.skillsRequired.length > 0 && (
                            <Card className="p-6">
                                <div className="flex items-center gap-2">
                                    <Target className="h-4 w-4 text-brand-600" />
                                    <h2 className="text-base font-semibold text-foreground">
                                        Required skills
                                    </h2>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {task.skillsRequired.map((s, i) => (
                                        <Badge key={i} variant={s.required ? 'soft' : 'muted'}>
                                            {s.name}
                                            {s.required && <span className="ml-0.5 text-[10px]">·</span>}
                                            {s.required && (
                                                <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">
                                                    must
                                                </span>
                                            )}
                                        </Badge>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {task.requirements?.length > 0 && (
                            <Card className="p-6">
                                <h2 className="text-base font-semibold text-foreground">Requirements</h2>
                                <ul className="mt-3 space-y-2 text-sm text-foreground/80">
                                    {task.requirements.map((r, i) => (
                                        <li key={i} className="flex gap-2">
                                            <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-brand-600" />
                                            {r}
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        )}

                        {task.deliverables?.length > 0 && (
                            <Card className="p-6">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-brand-600" />
                                    <h2 className="text-base font-semibold text-foreground">
                                        Expected deliverables
                                    </h2>
                                </div>
                                <ol className="mt-3 space-y-2.5 text-sm text-foreground/80">
                                    {task.deliverables.map((d, i) => (
                                        <li key={i} className="flex gap-3">
                                            <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                                                {i + 1}
                                            </span>
                                            {d}
                                        </li>
                                    ))}
                                </ol>
                            </Card>
                        )}

                        {task.benefits?.length > 0 && (
                            <Card className="p-6">
                                <h2 className="text-base font-semibold text-foreground">Benefits</h2>
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    {task.benefits.map((b, i) => (
                                        <div key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                                            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                                            {b}
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* Right rail */}
                    <aside className="space-y-4">
                        <div className="lg:sticky lg:top-[4.5rem] space-y-4">
                            <Card className="p-5">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Task details
                                </h3>
                                <dl className="mt-3 space-y-3 text-sm">
                                    {[
                                        ['Category', task.category],
                                        ['Type', task.type],
                                        ['Duration', taskService.formatDuration(task.duration)],
                                        ['Compensation', taskService.formatBudget(task.budget)],
                                        ['Experience', task.experienceLevel],
                                        ['Applicants', `${task.applicationCount} / ${task.maxApplications}`],
                                        ['Views', `${task.views}`],
                                    ].map(([label, value]) => (
                                        <div
                                            key={label}
                                            className="flex items-center justify-between gap-2"
                                        >
                                            <dt className="text-muted-foreground">{label}</dt>
                                            <dd className="font-medium capitalize text-foreground text-right">
                                                {value}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            </Card>

                            <Card className="p-5">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    About company
                                </h3>
                                <div className="mt-3 flex items-center gap-3">
                                    <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-md border border-border bg-muted text-sm font-semibold">
                                        {company.logo ? (
                                            <img
                                                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${company.logo}`}
                                                alt={company.companyName}
                                                className="h-full w-full rounded-md object-cover"
                                            />
                                        ) : (
                                            getInitials(company.companyName)
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-foreground">
                                            {company.companyName}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {company.industry}
                                        </p>
                                    </div>
                                </div>
                                <Button asChild variant="secondary" className="mt-4 w-full">
                                    <Link href={`/company/${company._id}`}>
                                        <Building2 className="h-4 w-4" />
                                        View company profile
                                    </Link>
                                </Button>
                            </Card>
                        </div>
                    </aside>
                </div>
            </div>

            <ApplyModal
                taskId={task._id}
                taskTitle={task.title}
                taskBudgetType={task.budget?.type}
                isOpen={showApply}
                onClose={() => setShowApply(false)}
                onSuccess={(application) => {
                    fetchTask()
                    setMyApplicationId(application._id)
                }}
            />
        </div>
    )
}
