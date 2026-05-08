'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'
import { taskService, Task } from '@/services/taskService'
import TaskCard from '@/components/task/TaskCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { toast } from 'react-hot-toast'

export default function RecommendedTasksCard() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true)
                const data = await taskService.getRecommendedTasks(3)
                setTasks(data)
            } catch {
                try {
                    const fallback = await taskService.getTasks(1, 3)
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

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-brand-600" />
                    <CardTitle className="text-base">Recommended for you</CardTitle>
                </div>
                <Link
                    href="/tasks"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
                >
                    See all <ArrowRight className="h-3 w-3" />
                </Link>
            </CardHeader>
            <CardContent className="space-y-2.5">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                    ))
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
                    tasks.map((t) => <TaskCard key={t._id} task={t} />)
                )}
            </CardContent>
        </Card>
    )
}
