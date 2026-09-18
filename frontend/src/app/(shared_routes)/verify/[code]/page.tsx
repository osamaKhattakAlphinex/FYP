'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Award, ShieldCheck, ShieldX } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { evaluationService } from '@/services/evaluationService'
import type { EvaluationVerification } from '@/types/evaluation.types'
import { cn } from '@/lib/utils'

/**
 * Public confirmation of a finalized evaluation (Module 9). Anyone holding a
 * verification code — an employer reading a CV, say — can check the grade was
 * really issued, without an account. Shows only what the code vouches for.
 */
export default function VerifyEvaluationPage() {
    const params = useParams<{ code: string }>()
    const code = decodeURIComponent(params?.code ?? '')

    const [result, setResult] = useState<EvaluationVerification | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!code) return
        ;(async () => {
            try {
                setLoading(true)
                setResult(await evaluationService.verify(code))
            } catch {
                setResult(null)
            } finally {
                setLoading(false)
            }
        })()
    }, [code])

    return (
        <main className="mx-auto w-full max-w-xl px-4 py-12">
            {loading ? (
                <Skeleton className="h-64 w-full" />
            ) : !result ? (
                <Card className="p-8 text-center">
                    <ShieldX className="mx-auto h-10 w-10 text-red-500" />
                    <h1 className="mt-3 text-lg font-semibold text-foreground">
                        No finalized evaluation matches this code
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Check the code for typos. A code stops verifying if its evaluation has been
                        withdrawn for review.
                    </p>
                    <p className="mt-3 font-mono text-sm text-muted-foreground">{code}</p>
                </Card>
            ) : (
                <Card className="p-8">
                    <div className="flex items-center gap-2 text-emerald-700">
                        <ShieldCheck className="h-6 w-6" />
                        <h1 className="text-lg font-semibold">Verified evaluation</h1>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                        This result was issued on the Smart AI Micro-Internship platform and confirmed
                        by the supervising organisation.
                    </p>

                    <div className="mt-6 flex items-center gap-4">
                        <span
                            className={cn(
                                'flex h-16 w-16 items-center justify-center rounded-lg text-3xl font-bold',
                                evaluationService.getGradeColor(result.grade),
                            )}
                        >
                            {result.grade ?? '—'}
                        </span>
                        <div>
                            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Award className="h-4 w-4" /> Final score
                            </p>
                            <p className="text-2xl font-bold text-foreground">
                                {result.finalScore ?? '—'}
                                <span className="text-sm font-normal text-muted-foreground">/100</span>
                            </p>
                        </div>
                    </div>

                    <dl className="mt-6 space-y-2.5 text-sm">
                        {[
                            ['Student', result.studentName],
                            ['Internship', result.taskTitle],
                            ['Organisation', result.companyName],
                            [
                                'Finalized',
                                result.finalizedAt
                                    ? new Date(result.finalizedAt).toLocaleDateString(undefined, {
                                          day: 'numeric',
                                          month: 'long',
                                          year: 'numeric',
                                      })
                                    : null,
                            ],
                            ['Verification code', result.verificationCode],
                        ].map(([label, value]) => (
                            <div key={label} className="flex items-center justify-between gap-3">
                                <dt className="text-muted-foreground">{label}</dt>
                                <dd className="text-right font-medium text-foreground">{value || '—'}</dd>
                            </div>
                        ))}
                    </dl>
                </Card>
            )}
        </main>
    )
}
