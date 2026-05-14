'use client'

import { useRef, useState } from 'react'
import { FileText, Loader2, Paperclip, Trash2, Upload } from 'lucide-react'
import { toast } from 'react-hot-toast'

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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { applicationService } from '@/services/applicationService'
import type { Application, CreateApplicationData } from '@/types/application.types'

interface ApplyModalProps {
    taskId: string
    taskTitle: string
    taskBudgetType?: 'fixed' | 'hourly' | 'unpaid'
    isOpen: boolean
    onClose: () => void
    onSuccess?: (application: Application) => void
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'PKR', 'INR', 'AED']
const MAX_FILES = 8
const MAX_FILE_SIZE_MB = 10
const ACCEPTED_EXTENSIONS = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.zip'

const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ApplyModal({
    taskId,
    taskTitle,
    taskBudgetType = 'unpaid',
    isOpen,
    onClose,
    onSuccess,
}: ApplyModalProps) {
    const isPaid = taskBudgetType !== 'unpaid'

    const fileInputRef = useRef<HTMLInputElement>(null)
    const [coverLetter, setCoverLetter] = useState('')
    const [proposedRate, setProposedRate] = useState<string>('')
    const [proposedCurrency, setProposedCurrency] = useState('USD')
    const [expectedStartDate, setExpectedStartDate] = useState('')
    const [availabilityHours, setAvailabilityHours] = useState<string>('')
    const [portfolioUrl, setPortfolioUrl] = useState('')
    const [files, setFiles] = useState<File[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [uploading, setUploading] = useState(false)

    const reset = () => {
        setCoverLetter('')
        setProposedRate('')
        setProposedCurrency('USD')
        setExpectedStartDate('')
        setAvailabilityHours('')
        setPortfolioUrl('')
        setFiles([])
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const addFiles = (incoming: FileList | null) => {
        if (!incoming || incoming.length === 0) return
        const next: File[] = []
        for (const f of Array.from(incoming)) {
            if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                toast.error(`${f.name} exceeds ${MAX_FILE_SIZE_MB} MB`)
                continue
            }
            if (files.some((existing) => existing.name === f.name && existing.size === f.size)) {
                continue
            }
            next.push(f)
        }
        const combined = [...files, ...next].slice(0, MAX_FILES)
        if (files.length + next.length > MAX_FILES) {
            toast.error(`You can attach up to ${MAX_FILES} files`)
        }
        setFiles(combined)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const removeFile = (idx: number) =>
        setFiles((prev) => prev.filter((_, i) => i !== idx))

    const handleSubmit = async () => {
        if (coverLetter.trim().length < 50) {
            toast.error('Cover letter must be at least 50 characters')
            return
        }

        try {
            setSubmitting(true)

            let uploaded: Array<{ name: string; url: string; type: string }> = []
            if (files.length > 0) {
                setUploading(true)
                try {
                    uploaded = await applicationService.uploadAttachments(files)
                } catch (err: any) {
                    const message =
                        err?.response?.data?.message || 'Failed to upload attachments'
                    toast.error(message)
                    return
                } finally {
                    setUploading(false)
                }
            }

            const payload: CreateApplicationData = {
                coverLetter: coverLetter.trim(),
                ...(portfolioUrl.trim() ? { portfolioUrl: portfolioUrl.trim() } : {}),
                ...(expectedStartDate ? { expectedStartDate } : {}),
                ...(availabilityHours
                    ? { availabilityHoursPerWeek: Number(availabilityHours) }
                    : {}),
                ...(isPaid && proposedRate
                    ? {
                          proposedRate: Number(proposedRate),
                          proposedCurrency,
                      }
                    : {}),
                ...(uploaded.length > 0 ? { attachments: uploaded } : {}),
            }

            const application = await applicationService.applyToTask(taskId, payload)
            toast.success('Application submitted!')
            reset()
            onSuccess?.(application)
            onClose()
        } catch (err: any) {
            const message =
                err?.response?.data?.errors?.[0]?.msg ||
                err?.response?.data?.message ||
                'Failed to submit application'
            toast.error(message)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) {
                    if (submitting) return
                    onClose()
                }
            }}
        >
            <DialogContent size="lg">
                <DialogHeader>
                    <div>
                        <DialogTitle>Apply to {taskTitle}</DialogTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Fill in your application details below.
                        </p>
                    </div>
                    <DialogCloseButton />
                </DialogHeader>

                <DialogBody className="space-y-5">
                    {/* Cover letter */}
                    <div>
                        <Label htmlFor="cover-letter">
                            Cover letter <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="cover-letter"
                            value={coverLetter}
                            onChange={(e) => setCoverLetter(e.target.value)}
                            placeholder="Highlight your relevant experience, skills, and what you'll deliver…"
                            rows={7}
                            maxLength={5000}
                            className="mt-1.5"
                        />
                        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                            <span>Minimum 50 characters</span>
                            <span
                                className={
                                    coverLetter.length < 50 ? 'text-destructive' : ''
                                }
                            >
                                {coverLetter.length} / 5000
                            </span>
                        </div>
                    </div>

                    {/* Proposed rate (paid tasks only) */}
                    {isPaid && (
                        <div>
                            <Label>Proposed rate</Label>
                            <div className="mt-1.5 flex gap-2">
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={proposedRate}
                                    onChange={(e) => setProposedRate(e.target.value)}
                                    placeholder={
                                        taskBudgetType === 'hourly'
                                            ? 'e.g. 25 / hour'
                                            : 'e.g. 500'
                                    }
                                    className="flex-1"
                                />
                                <Select
                                    value={proposedCurrency}
                                    onValueChange={setProposedCurrency}
                                >
                                    <SelectTrigger className="w-28">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CURRENCIES.map((c) => (
                                            <SelectItem key={c} value={c}>
                                                {c}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {taskBudgetType === 'hourly'
                                    ? 'Hourly rate you propose to charge.'
                                    : 'Total fixed amount you propose for this project.'}
                            </p>
                        </div>
                    )}

                    {/* Date + availability row */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="expected-start">Expected start date</Label>
                            <Input
                                id="expected-start"
                                type="date"
                                value={expectedStartDate}
                                onChange={(e) => setExpectedStartDate(e.target.value)}
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label htmlFor="availability">Availability (hours / week)</Label>
                            <Input
                                id="availability"
                                type="number"
                                min={1}
                                max={168}
                                value={availabilityHours}
                                onChange={(e) => setAvailabilityHours(e.target.value)}
                                placeholder="e.g. 20"
                                className="mt-1.5"
                            />
                        </div>
                    </div>

                    {/* Portfolio URL */}
                    <div>
                        <Label htmlFor="portfolio">Portfolio URL</Label>
                        <Input
                            id="portfolio"
                            type="url"
                            value={portfolioUrl}
                            onChange={(e) => setPortfolioUrl(e.target.value)}
                            placeholder="https://your-portfolio.com"
                            className="mt-1.5"
                        />
                    </div>

                    {/* Attachments */}
                    <div>
                        <div className="flex items-center justify-between">
                            <Label>
                                <Paperclip className="mr-1 inline h-3.5 w-3.5" />
                                Attachments
                            </Label>
                            <span className="text-xs text-muted-foreground">
                                {files.length} / {MAX_FILES}
                            </span>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={ACCEPTED_EXTENSIONS}
                            multiple
                            className="hidden"
                            onChange={(e) => addFiles(e.target.files)}
                        />

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={files.length >= MAX_FILES || submitting}
                            className="mt-1.5 grid w-full place-items-center rounded-md border border-dashed border-border bg-muted/30 px-3 py-6 text-center transition-colors hover:border-brand-500 hover:bg-brand-50/40 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Upload className="h-5 w-5 text-muted-foreground" />
                            <p className="mt-2 text-sm font-medium text-foreground">
                                Click to upload files
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                PDF, DOC, DOCX, JPG, PNG, ZIP · up to {MAX_FILE_SIZE_MB} MB each
                            </p>
                        </button>

                        {files.length > 0 && (
                            <ul className="mt-2 space-y-1.5">
                                {files.map((file, idx) => (
                                    <li
                                        key={`${file.name}-${idx}`}
                                        className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
                                    >
                                        <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-medium text-foreground">
                                                {file.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatBytes(file.size)}
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeFile(idx)}
                                            disabled={submitting}
                                            aria-label="Remove file"
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="rounded-md border border-accent-100 bg-accent-50 px-3 py-2.5 text-xs text-accent-700">
                        <strong>Tip:</strong> Connect your past projects to the task's
                        deliverables. Specific beats generic.
                    </div>
                </DialogBody>

                <DialogFooter>
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={coverLetter.length < 50 || submitting}
                    >
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {uploading
                            ? 'Uploading files…'
                            : submitting
                              ? 'Submitting…'
                              : 'Submit application'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
