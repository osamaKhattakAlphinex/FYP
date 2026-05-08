'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Experience } from '@/types/student.types'

interface EditExperienceModalProps {
    isOpen: boolean
    onClose: () => void
    experience: Experience | null
    onSave: (data: Omit<Experience, 'id'>) => Promise<void>
}

export default function EditExperienceModal({
    isOpen,
    onClose,
    experience,
    onSave,
}: EditExperienceModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        company: '',
        employmentType: 'Internship' as Experience['employmentType'],
        startDate: '',
        endDate: null as string | null,
        isCurrentlyWorking: false,
        description: '',
        skills: [] as string[],
    })
    const [newSkill, setNewSkill] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            if (experience) setFormData(experience)
            else
                setFormData({
                    title: '',
                    company: '',
                    employmentType: 'Internship',
                    startDate: '',
                    endDate: null,
                    isCurrentlyWorking: false,
                    description: '',
                    skills: [],
                })
            setNewSkill('')
        }
    }, [isOpen, experience])

    const addSkill = () => {
        if (!newSkill.trim()) return
        setFormData({ ...formData, skills: [...formData.skills, newSkill.trim()] })
        setNewSkill('')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await onSave(formData)
            onClose()
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
            <DialogContent size="md">
                <form onSubmit={handleSubmit} className="contents">
                    <DialogHeader>
                        <DialogTitle>
                            {experience ? 'Edit experience' : 'Add experience'}
                        </DialogTitle>
                        <DialogCloseButton type="button" />
                    </DialogHeader>
                    <DialogBody>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="title">Title *</Label>
                                <Input
                                    id="title"
                                    required
                                    value={formData.title}
                                    onChange={(e) =>
                                        setFormData({ ...formData, title: e.target.value })
                                    }
                                    placeholder="e.g. Software Engineering Intern"
                                    className="mt-1.5"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="company">Company *</Label>
                                    <Input
                                        id="company"
                                        required
                                        value={formData.company}
                                        onChange={(e) =>
                                            setFormData({ ...formData, company: e.target.value })
                                        }
                                        placeholder="Acme Inc."
                                        className="mt-1.5"
                                    />
                                </div>
                                <div>
                                    <Label>Employment type</Label>
                                    <Select
                                        value={formData.employmentType}
                                        onValueChange={(v) =>
                                            setFormData({
                                                ...formData,
                                                employmentType: v as Experience['employmentType'],
                                            })
                                        }
                                    >
                                        <SelectTrigger className="mt-1.5">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Internship">Internship</SelectItem>
                                            <SelectItem value="Full-time">Full-time</SelectItem>
                                            <SelectItem value="Part-time">Part-time</SelectItem>
                                            <SelectItem value="Freelance">Freelance</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="startDate">Start date *</Label>
                                    <Input
                                        id="startDate"
                                        type="month"
                                        required
                                        value={formData.startDate}
                                        onChange={(e) =>
                                            setFormData({ ...formData, startDate: e.target.value })
                                        }
                                        className="mt-1.5"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="endDate">End date</Label>
                                    <Input
                                        id="endDate"
                                        type="month"
                                        value={formData.endDate || ''}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                endDate: e.target.value || null,
                                            })
                                        }
                                        disabled={formData.isCurrentlyWorking}
                                        className="mt-1.5"
                                    />
                                </div>
                            </div>

                            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                                <Checkbox
                                    checked={formData.isCurrentlyWorking}
                                    onCheckedChange={(c) =>
                                        setFormData({
                                            ...formData,
                                            isCurrentlyWorking: !!c,
                                            endDate: c ? null : formData.endDate,
                                        })
                                    }
                                />
                                I'm currently working here
                            </label>

                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                    rows={4}
                                    placeholder="Responsibilities, achievements, what you shipped…"
                                    className="mt-1.5"
                                />
                            </div>

                            <div>
                                <Label>Skills used</Label>
                                <div className="mt-1.5 flex gap-2">
                                    <Input
                                        value={newSkill}
                                        onChange={(e) => setNewSkill(e.target.value)}
                                        placeholder="Add a skill"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                addSkill()
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        size="icon"
                                        onClick={addSkill}
                                        aria-label="Add skill"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                {formData.skills.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {formData.skills.map((s, i) => (
                                            <Badge
                                                key={i}
                                                variant="soft"
                                                className="inline-flex items-center gap-1"
                                            >
                                                {s}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setFormData({
                                                            ...formData,
                                                            skills: formData.skills.filter(
                                                                (_, j) => j !== i
                                                            ),
                                                        })
                                                    }
                                                    className="rounded-full hover:bg-brand-200/60"
                                                    aria-label="Remove"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                                </>
                            ) : experience ? (
                                'Update'
                            ) : (
                                'Add'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
