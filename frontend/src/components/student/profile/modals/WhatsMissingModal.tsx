'use client'

import { CheckCircle2, Circle, AlertCircle, Sparkles } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogBody,
    DialogFooter,
    DialogTitle,
    DialogCloseButton,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface WhatsMissingModalProps {
    isOpen: boolean
    onClose: () => void
    profileData: {
        hasBasicInfo: boolean
        hasEducation: boolean
        hasSkills: boolean
        hasExperience: boolean
        hasProjects: boolean
        hasBio: boolean
        hasResume: boolean
    }
    completionScore: number
}

export default function WhatsMissingModal({
    isOpen,
    onClose,
    profileData,
    completionScore,
}: WhatsMissingModalProps) {
    const sections = [
        { name: 'Basic info', description: 'Name and location', completed: profileData.hasBasicInfo, weight: 20 },
        { name: 'Education', description: 'At least one entry', completed: profileData.hasEducation, weight: 15 },
        { name: 'Skills', description: 'At least 3 skills', completed: profileData.hasSkills, weight: 15 },
        { name: 'Experience', description: 'At least one role', completed: profileData.hasExperience, weight: 15 },
        { name: 'Projects', description: 'At least one project', completed: profileData.hasProjects, weight: 15 },
        { name: 'About / bio', description: 'Tell employers about you', completed: profileData.hasBio, weight: 10 },
        { name: 'Resume', description: 'PDF or DOCX upload', completed: profileData.hasResume, weight: 10 },
    ]
    const completed = sections.filter((s) => s.completed)
    const missing = sections.filter((s) => !s.completed)

    return (
        <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
            <DialogContent size="md">
                <DialogHeader>
                    <DialogTitle>Profile completion</DialogTitle>
                    <DialogCloseButton />
                </DialogHeader>
                <DialogBody>
                    <div className="rounded-md border border-border bg-brand-50 px-4 py-3">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-foreground">
                                Overall progress
                            </div>
                            <div className="text-2xl font-bold text-brand-700">
                                {completionScore}%
                            </div>
                        </div>
                        <Progress value={completionScore} className="mt-2 bg-card" />
                        <p className="mt-2 text-xs text-muted-foreground">
                            {completed.length} of {sections.length} sections completed
                        </p>
                    </div>

                    {completed.length > 0 && (
                        <div className="mt-5">
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <CheckCircle2 className="h-4 w-4 text-success" />
                                Done ({completed.length})
                            </h3>
                            <ul className="mt-2 space-y-1.5">
                                {completed.map((s) => (
                                    <li
                                        key={s.name}
                                        className="flex items-start gap-3 rounded-md border border-success/20 bg-success/5 px-3 py-2"
                                    >
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-foreground">
                                                {s.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {s.description}
                                            </p>
                                        </div>
                                        <span className="rounded bg-card px-1.5 py-0.5 text-xs font-medium text-success">
                                            +{s.weight}%
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {missing.length > 0 && (
                        <div className="mt-5">
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <AlertCircle className="h-4 w-4 text-accent-600" />
                                Still to do ({missing.length})
                            </h3>
                            <ul className="mt-2 space-y-1.5">
                                {missing.map((s) => (
                                    <li
                                        key={s.name}
                                        className="flex items-start gap-3 rounded-md border border-accent-100 bg-accent-50 px-3 py-2"
                                    >
                                        <Circle className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-600" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-foreground">
                                                {s.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {s.description}
                                            </p>
                                        </div>
                                        <span className="rounded bg-card px-1.5 py-0.5 text-xs font-medium text-accent-700">
                                            +{s.weight}%
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {completionScore === 100 ? (
                        <div className="mt-5 flex items-center gap-2 rounded-md border border-success/20 bg-success/5 px-3 py-2.5">
                            <Sparkles className="h-4 w-4 flex-shrink-0 text-success" />
                            <p className="text-sm font-medium text-success">
                                Your profile is 100% complete — you're ready to get matched.
                            </p>
                        </div>
                    ) : (
                        <p className="mt-5 text-center text-xs text-muted-foreground">
                            Complete your profile to unlock AI matching and apply for tasks.
                        </p>
                    )}
                </DialogBody>
                <DialogFooter>
                    <Button onClick={onClose} className="w-full sm:w-auto">
                        Got it
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
