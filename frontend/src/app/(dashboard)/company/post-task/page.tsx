'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Briefcase,
    Calendar,
    DollarSign,
    FileText,
    Target,
    CheckCircle2,
    Loader2,
    Plus,
    X,
    Sparkles,
} from 'lucide-react'
import TagInput from '@/components/shared/TagInput'
import RichTextEditor from '@/components/shared/RichTextEditor'
import { taskService, CreateTaskData } from '@/services/taskService'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogBody,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog'
import { useRoleProtection } from '@/hooks/useRoleProtection'
import { toast } from 'react-hot-toast'

const DIFFICULTY_LEVELS = ['entry', 'intermediate', 'expert']
const DURATION_OPTIONS = [
    { label: '1–2 weeks', value: 2, unit: 'weeks' },
    { label: '2–4 weeks', value: 4, unit: 'weeks' },
    { label: '1–2 months', value: 2, unit: 'months' },
    { label: '2–3 months', value: 3, unit: 'months' },
]
const CATEGORIES = [
    'Web Development', 'Mobile Development', 'UI/UX Design', 'Data Science',
    'Machine Learning', 'Digital Marketing', 'Content Writing', 'Graphic Design',
    'Video Editing', 'Business Analysis', 'Quality Assurance', 'DevOps',
    'Cybersecurity', 'Other',
]
const WORK_TYPES = ['remote', 'onsite', 'hybrid']
const TASK_TYPES = ['internship', 'project', 'freelance']

export default function PostTaskPage() {
    useRoleProtection({ allowedRoles: ['company'] })
    const router = useRouter()

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'Web Development',
        type: 'internship' as 'internship' | 'project' | 'freelance',
        workType: 'remote' as 'remote' | 'onsite' | 'hybrid',
        requiredSkills: [] as string[],
        difficulty: 'intermediate' as 'entry' | 'intermediate' | 'expert',
        duration: { value: 4, unit: 'weeks' as 'days' | 'weeks' | 'months' },
        deadline: '',
        startDate: '',
        deliverables: [''],
        requirements: [''],
        benefits: [''],
        isPaid: false,
        compensation: '',
        maxApplications: 50,
    })
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [submitting, setSubmitting] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)

    const validate = () => {
        const e: Record<string, string> = {}
        if (!formData.title.trim() || formData.title.length < 10)
            e.title = 'Title must be at least 10 characters'
        const plain = formData.description.replace(/<[^>]*>/g, '').trim()
        if (!plain || plain.length < 100)
            e.description = 'Description must be at least 100 characters'
        if (formData.requiredSkills.length === 0)
            e.requiredSkills = 'At least one skill is required'
        if (!formData.deadline) e.deadline = 'Deadline is required'
        else {
            const min = new Date(Date.now() + 24 * 60 * 60 * 1000)
            if (new Date(formData.deadline) <= min)
                e.deadline = 'Must be at least 24 hours from now'
        }
        if (!formData.startDate) e.startDate = 'Start date is required'
        else if (
            formData.deadline &&
            new Date(formData.startDate) <= new Date(formData.deadline)
        )
            e.startDate = 'Must be after deadline'
        if (formData.requirements.filter((r) => r.trim()).length === 0)
            e.requirements = 'At least one requirement is required'
        if (formData.deliverables.filter((d) => d.trim()).length === 0)
            e.deliverables = 'At least one deliverable is required'
        if (
            formData.isPaid &&
            (!formData.compensation || parseFloat(formData.compensation) <= 0)
        )
            e.compensation = 'Compensation is required for paid tasks'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault()
        if (!validate()) {
            toast.error('Please fix the errors')
            return
        }
        try {
            setSubmitting(true)
            const taskData: CreateTaskData = {
                title: formData.title.trim(),
                description: formData.description.trim(),
                category: formData.category,
                type: formData.type,
                workType: formData.workType,
                experienceLevel: formData.difficulty,
                duration: formData.duration,
                skillsRequired: formData.requiredSkills.map((s) => ({
                    name: s,
                    level: 'intermediate',
                    required: true,
                })),
                requirements: formData.requirements.filter((r) => r.trim()),
                deliverables: formData.deliverables.filter((d) => d.trim()),
                benefits: formData.benefits.filter((b) => b.trim()),
                budget: formData.isPaid
                    ? {
                          type: 'fixed',
                          amount: {
                              min: parseFloat(formData.compensation),
                              max: parseFloat(formData.compensation),
                          },
                          currency: 'PKR',
                      }
                    : { type: 'unpaid', currency: 'PKR' },
                applicationDeadline: new Date(formData.deadline).toISOString(),
                startDate: new Date(formData.startDate).toISOString(),
                maxApplications: formData.maxApplications,
                tags: formData.requiredSkills,
                status: 'active',
            }
            await taskService.createTask(taskData)
            toast.success('Task posted!')
            setShowSuccess(true)
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to post task')
        } finally {
            setSubmitting(false)
        }
    }

    type ListField = 'deliverables' | 'requirements' | 'benefits'
    const updateListItem = (field: ListField, index: number, value: string) => {
        const next = [...formData[field]]
        next[index] = value
        setFormData({ ...formData, [field]: next })
    }
    const addListItem = (field: ListField) =>
        setFormData({ ...formData, [field]: [...formData[field], ''] })
    const removeListItem = (field: ListField, index: number) => {
        const next = formData[field].filter((_, i) => i !== index)
        setFormData({ ...formData, [field]: next })
    }

    const ListSection = ({
        field,
        title,
        icon: Icon,
        placeholder,
        optional = false,
    }: {
        field: ListField
        title: string
        icon: React.ElementType
        placeholder: string
        optional?: boolean
    }) => (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-brand-600" />
                    <CardTitle className="text-base">
                        {title}
                        {optional && (
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                                (optional)
                            </span>
                        )}
                    </CardTitle>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addListItem(field)}
                >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                </Button>
            </CardHeader>
            <CardContent className="space-y-2">
                {formData[field].map((item, i) => (
                    <div key={i} className="flex gap-2">
                        <Input
                            value={item}
                            onChange={(e) => updateListItem(field, i, e.target.value)}
                            placeholder={`${placeholder} ${i + 1}`}
                        />
                        {formData[field].length > 1 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeListItem(field, i)}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                ))}
                {errors[field] && (
                    <p className="text-xs text-destructive">{errors[field]}</p>
                )}
            </CardContent>
        </Card>
    )

    const plainDescription = formData.description.replace(/<[^>]*>/g, '').trim()
    const completionChecks = [
        { label: 'Title', done: formData.title.trim().length >= 10 },
        { label: 'Description', done: plainDescription.length >= 100 },
        { label: 'Skills', done: formData.requiredSkills.length > 0 },
        { label: 'Timeline', done: !!(formData.deadline && formData.startDate) },
        { label: 'Requirements', done: formData.requirements.some((r) => r.trim()) },
        { label: 'Deliverables', done: formData.deliverables.some((d) => d.trim()) },
    ]
    const completionPct = Math.round(
        (completionChecks.filter((c) => c.done).length / completionChecks.length) * 100
    )

    return (
        <>
            <div className="surface-canvas min-h-[calc(100vh-3.5rem)]">
                <div className="mx-auto max-w-[1128px] px-4 py-6 lg:px-6">
                    <div className="mb-5">
                        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-600">
                            <Sparkles className="h-3.5 w-3.5" />
                            New posting
                        </p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                            Post a micro-internship task
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Share enough detail and the right students will find you.
                        </p>
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"
                    >
                        <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Basics</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <Label htmlFor="category">Category</Label>
                                        <Select
                                            value={formData.category}
                                            onValueChange={(v) => setFormData({ ...formData, category: v })}
                                        >
                                            <SelectTrigger className="mt-1.5">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {CATEGORIES.map((c) => (
                                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="type">Task type</Label>
                                        <Select
                                            value={formData.type}
                                            onValueChange={(v) => setFormData({ ...formData, type: v as any })}
                                        >
                                            <SelectTrigger className="mt-1.5 capitalize">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TASK_TYPES.map((t) => (
                                                    <SelectItem key={t} value={t} className="capitalize">
                                                        {t}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="title">Task title</Label>
                                    <Input
                                        id="title"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g. Build a React Dashboard Component"
                                        className={`mt-1.5 ${errors.title ? 'border-destructive' : ''}`}
                                    />
                                    {errors.title && (
                                        <p className="mt-1 text-xs text-destructive">{errors.title}</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-brand-600" />
                                    <CardTitle className="text-base">Description</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <RichTextEditor
                                    value={formData.description}
                                    onChange={(value) => setFormData({ ...formData, description: value })}
                                    placeholder="Describe the task. Include objectives, deliverables, what students will learn…"
                                    maxLength={5000}
                                    error={errors.description}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Target className="h-4 w-4 text-brand-600" />
                                    <CardTitle className="text-base">Required skills</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <TagInput
                                    tags={formData.requiredSkills}
                                    onChange={(skills) =>
                                        setFormData({ ...formData, requiredSkills: skills })
                                    }
                                    placeholder="e.g. React, TypeScript, Node.js…"
                                    maxTags={10}
                                    suggestions={[
                                        'React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Express',
                                        'Python', 'Django', 'FastAPI', 'PostgreSQL', 'MongoDB',
                                        'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Tailwind CSS',
                                    ]}
                                />
                                {errors.requiredSkills && (
                                    <p className="mt-1 text-xs text-destructive">
                                        {errors.requiredSkills}
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Engagement details</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4 sm:grid-cols-3">
                                <div>
                                    <Label>Work type</Label>
                                    <Select
                                        value={formData.workType}
                                        onValueChange={(v) => setFormData({ ...formData, workType: v as any })}
                                    >
                                        <SelectTrigger className="mt-1.5 capitalize">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {WORK_TYPES.map((w) => (
                                                <SelectItem key={w} value={w} className="capitalize">
                                                    {w}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Experience</Label>
                                    <Select
                                        value={formData.difficulty}
                                        onValueChange={(v) => setFormData({ ...formData, difficulty: v as any })}
                                    >
                                        <SelectTrigger className="mt-1.5 capitalize">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DIFFICULTY_LEVELS.map((d) => (
                                                <SelectItem key={d} value={d} className="capitalize">
                                                    {d}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Duration</Label>
                                    <Select
                                        value={`${formData.duration.value}-${formData.duration.unit}`}
                                        onValueChange={(v) => {
                                            const sel = DURATION_OPTIONS.find(
                                                (d) => `${d.value}-${d.unit}` === v
                                            )
                                            if (sel)
                                                setFormData({
                                                    ...formData,
                                                    duration: { value: sel.value, unit: sel.unit as any },
                                                })
                                        }}
                                    >
                                        <SelectTrigger className="mt-1.5">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DURATION_OPTIONS.map((d) => (
                                                <SelectItem
                                                    key={`${d.value}-${d.unit}`}
                                                    value={`${d.value}-${d.unit}`}
                                                >
                                                    {d.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-brand-600" />
                                    <CardTitle className="text-base">Timeline</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label htmlFor="deadline">Application deadline</Label>
                                    <Input
                                        id="deadline"
                                        type="date"
                                        value={formData.deadline}
                                        onChange={(e) =>
                                            setFormData({ ...formData, deadline: e.target.value })
                                        }
                                        min={
                                            new Date(Date.now() + 24 * 60 * 60 * 1000)
                                                .toISOString()
                                                .split('T')[0]
                                        }
                                        className={`mt-1.5 ${errors.deadline ? 'border-destructive' : ''}`}
                                    />
                                    {errors.deadline && (
                                        <p className="mt-1 text-xs text-destructive">{errors.deadline}</p>
                                    )}
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        At least 24 hours from now
                                    </p>
                                </div>
                                <div>
                                    <Label htmlFor="startDate">Start date</Label>
                                    <Input
                                        id="startDate"
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) =>
                                            setFormData({ ...formData, startDate: e.target.value })
                                        }
                                        min={
                                            formData.deadline ||
                                            new Date().toISOString().split('T')[0]
                                        }
                                        className={`mt-1.5 ${errors.startDate ? 'border-destructive' : ''}`}
                                    />
                                    {errors.startDate && (
                                        <p className="mt-1 text-xs text-destructive">
                                            {errors.startDate}
                                        </p>
                                    )}
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Must be after the application deadline
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <ListSection
                            field="requirements"
                            title="Requirements"
                            icon={CheckCircle2}
                            placeholder="Requirement"
                        />
                        <ListSection
                            field="deliverables"
                            title="Expected deliverables"
                            icon={CheckCircle2}
                            placeholder="Deliverable"
                        />
                        <ListSection
                            field="benefits"
                            title="Benefits"
                            icon={CheckCircle2}
                            placeholder="Benefit"
                            optional
                        />

                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-brand-600" />
                                    <CardTitle className="text-base">Compensation</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <label className="flex cursor-pointer items-center gap-2.5">
                                    <Checkbox
                                        checked={formData.isPaid}
                                        onCheckedChange={(c) =>
                                            setFormData({ ...formData, isPaid: !!c })
                                        }
                                    />
                                    <span className="text-sm">This is a paid task</span>
                                </label>
                                {formData.isPaid && (
                                    <div>
                                        <Label htmlFor="compensation">Amount (PKR)</Label>
                                        <Input
                                            id="compensation"
                                            type="number"
                                            value={formData.compensation}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    compensation: e.target.value,
                                                })
                                            }
                                            placeholder="e.g. 25000"
                                            className={`mt-1.5 ${errors.compensation ? 'border-destructive' : ''}`}
                                        />
                                        {errors.compensation && (
                                            <p className="mt-1 text-xs text-destructive">
                                                {errors.compensation}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="sticky bottom-3 flex justify-end gap-2 rounded-md border border-border bg-card/95 p-3 shadow-pop backdrop-blur">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => router.back()}
                                disabled={submitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" /> Posting…
                                    </>
                                ) : (
                                    <>
                                        <Briefcase className="h-4 w-4" /> Post task
                                    </>
                                )}
                            </Button>
                        </div>
                        </div>

                        <aside className="hidden lg:block">
                            <div className="sticky top-[4.5rem] space-y-3">
                                <Card className="p-5">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Posting checklist
                                    </h3>
                                    <div className="mt-3 flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Ready to post</span>
                                        <span className="font-semibold text-brand-700">
                                            {completionPct}%
                                        </span>
                                    </div>
                                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full bg-brand-600 transition-all"
                                            style={{ width: `${completionPct}%` }}
                                        />
                                    </div>
                                    <ul className="mt-4 space-y-1.5">
                                        {completionChecks.map((c) => (
                                            <li
                                                key={c.label}
                                                className="flex items-center gap-2 text-xs"
                                            >
                                                <span
                                                    className={
                                                        c.done
                                                            ? 'grid h-4 w-4 place-items-center rounded-full bg-success/15 text-success'
                                                            : 'h-4 w-4 rounded-full border border-border'
                                                    }
                                                >
                                                    {c.done && (
                                                        <CheckCircle2 className="h-3 w-3" />
                                                    )}
                                                </span>
                                                <span
                                                    className={
                                                        c.done
                                                            ? 'text-foreground'
                                                            : 'text-muted-foreground'
                                                    }
                                                >
                                                    {c.label}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </Card>

                                <Card className="p-5">
                                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-700">
                                        <Sparkles className="h-3 w-3" />
                                        Preview
                                    </p>
                                    <div className="mt-3 rounded-md border border-border bg-muted/40 p-3">
                                        <p className="line-clamp-2 text-sm font-semibold text-foreground">
                                            {formData.title || 'Your task title appears here'}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {formData.category} ·{' '}
                                            <span className="capitalize">{formData.workType}</span> ·{' '}
                                            <span className="capitalize">{formData.difficulty}</span>
                                        </p>
                                        {formData.requiredSkills.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {formData.requiredSkills.slice(0, 4).map((s) => (
                                                    <span
                                                        key={s}
                                                        className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700"
                                                    >
                                                        {s}
                                                    </span>
                                                ))}
                                                {formData.requiredSkills.length > 4 && (
                                                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                                        +{formData.requiredSkills.length - 4}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            {formData.isPaid && formData.compensation
                                                ? `PKR ${formData.compensation}`
                                                : formData.isPaid
                                                ? 'Paid'
                                                : 'Unpaid'}{' '}
                                            ·{' '}
                                            {formData.duration.value} {formData.duration.unit}
                                        </p>
                                    </div>
                                    <p className="mt-2 text-[11px] text-muted-foreground">
                                        Students see this card preview in their feed.
                                    </p>
                                </Card>
                            </div>
                        </aside>
                    </form>
                </div>
            </div>

            <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
                <DialogContent size="sm">
                    <DialogHeader>
                        <DialogTitle>Task posted successfully</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <div className="flex items-start gap-3">
                            <span className="mt-0.5 grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-success/10 text-success">
                                <CheckCircle2 className="h-5 w-5" />
                            </span>
                            <p className="text-sm text-foreground/85">
                                Your micro-internship task is live. Students can start applying
                                right away — we'll notify you of new applications.
                            </p>
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button
                            variant="secondary"
                            onClick={() => router.push('/company/tasks')}
                        >
                            View all tasks
                        </Button>
                        <Button onClick={() => router.push('/company/dashboard')}>
                            Go to dashboard
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
