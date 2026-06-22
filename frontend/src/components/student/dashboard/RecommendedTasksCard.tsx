'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, ArrowRight, ChevronDown } from 'lucide-react'
import { taskService, Task } from '@/services/taskService'
import TaskCard from '@/components/task/TaskCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { toast } from 'react-hot-toast'

const RECOMMENDATION_LIMIT = 8

export default function RecommendedTasksCard() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true)
                const data = await taskService.getRecommendedTasks(RECOMMENDATION_LIMIT)
                setTasks(data)
            } catch {
                try {
                    const fallback = await taskService.getTasks(1, RECOMMENDATION_LIMIT)
                    setTasks(fallback.tasks)
                } catch {
                    toast.error('Failed to load tasks')
                }
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const tasksWithReasons = tasks.filter(
        (t) => typeof t.matchScore === 'number' && (t.matchReasons?.length ?? 0) > 0,
    )

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-brand-600" />
                    <CardTitle className="text-base">Recommended for you</CardTitle>
                </div>
                <Link
                    href="/tasks?sort=recommended"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
                >
                    See all <ArrowRight className="h-3 w-3" />
                </Link>
            </CardHeader>
            <CardContent className="space-y-3">
                {loading ? (
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-28 w-full" />
                        ))}
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="py-8 text-center">
                        <p className="text-sm text-muted-foreground">
                            No recommendations yet — finish your profile for better matches.
                        </p>
                        <Button asChild variant="outline" size="sm" className="mt-3">
                            <Link href="/tasks">Browse all tasks</Link>
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            {tasks.map((t) => (
                                <TaskCard key={t._id} task={t} />
                            ))}
                        </div>

                        {tasksWithReasons.length > 0 && (
                            <details className="group rounded-md border border-border bg-muted/30 px-3 py-2 text-sm open:bg-muted/40">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-foreground">
                                    <span className="font-medium">Why these matches?</span>
                                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                                </summary>
                                <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                                    {tasksWithReasons.map((t) => (
                                        <li key={t._id} className="flex gap-2">
                                            <span className="line-clamp-1 max-w-[40%] font-medium text-foreground">
                                                {t.title}
                                            </span>
                                            <span className="opacity-60">—</span>
                                            <span className="line-clamp-1 flex-1">
                                                {t.matchReasons?.[0]}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    )
}
