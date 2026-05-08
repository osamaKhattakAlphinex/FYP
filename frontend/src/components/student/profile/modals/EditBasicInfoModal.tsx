'use client'

import { useEffect, useState } from 'react'
import { Loader2, Upload, FileText, X } from 'lucide-react'
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

interface EditBasicInfoModalProps {
    isOpen: boolean
    onClose: () => void
    currentData: {
        firstName: string
        lastName: string
        headline: string
        phone: string
        city: string
        country: string
    }
    resumeUrl: string | null
    onSave: (data: any) => Promise<void>
    onUploadResume: (file: File) => Promise<void>
    onDeleteResume: () => Promise<void>
}

export default function EditBasicInfoModal({
    isOpen,
    onClose,
    currentData,
    resumeUrl,
    onSave,
    onUploadResume,
    onDeleteResume,
}: EditBasicInfoModalProps) {
    const [formData, setFormData] = useState(currentData)
    const [loading, setLoading] = useState(false)
    const [resumeFile, setResumeFile] = useState<File | null>(null)
    const [uploadingResume, setUploadingResume] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setFormData(currentData)
            setResumeFile(null)
        }
    }, [isOpen, currentData])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await onSave({
                firstName: formData.firstName,
                lastName: formData.lastName,
                headline: formData.headline,
                phone: formData.phone,
                location: { city: formData.city, country: formData.country },
            })
            if (resumeFile) {
                setUploadingResume(true)
                await onUploadResume(resumeFile)
                setUploadingResume(false)
            }
            onClose()
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteResume = async () => {
        if (!confirm('Delete your resume?')) return
        setUploadingResume(true)
        try {
            await onDeleteResume()
        } finally {
            setUploadingResume(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
            <DialogContent size="md">
                <form onSubmit={handleSubmit} className="contents">
                    <DialogHeader>
                        <DialogTitle>Edit profile</DialogTitle>
                        <DialogCloseButton type="button" />
                    </DialogHeader>
                    <DialogBody>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="firstName">First name *</Label>
                                    <Input
                                        id="firstName"
                                        required
                                        value={formData.firstName}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                firstName: e.target.value,
                                            })
                                        }
                                        className="mt-1.5"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="lastName">Last name *</Label>
                                    <Input
                                        id="lastName"
                                        required
                                        value={formData.lastName}
                                        onChange={(e) =>
                                            setFormData({ ...formData, lastName: e.target.value })
                                        }
                                        className="mt-1.5"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="headline">Headline</Label>
                                <Input
                                    id="headline"
                                    value={formData.headline}
                                    onChange={(e) =>
                                        setFormData({ ...formData, headline: e.target.value })
                                    }
                                    placeholder="e.g. Full-Stack Developer · AI enthusiast"
                                    maxLength={100}
                                    className="mt-1.5"
                                />
                            </div>

                            <div>
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) =>
                                        setFormData({ ...formData, phone: e.target.value })
                                    }
                                    placeholder="+1 555 123 4567"
                                    className="mt-1.5"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="city">City</Label>
                                    <Input
                                        id="city"
                                        value={formData.city}
                                        onChange={(e) =>
                                            setFormData({ ...formData, city: e.target.value })
                                        }
                                        placeholder="San Francisco"
                                        className="mt-1.5"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="country">Country</Label>
                                    <Input
                                        id="country"
                                        value={formData.country}
                                        onChange={(e) =>
                                            setFormData({ ...formData, country: e.target.value })
                                        }
                                        placeholder="USA"
                                        className="mt-1.5"
                                    />
                                </div>
                            </div>

                            <div className="border-t border-border pt-4">
                                <Label>Resume</Label>
                                {resumeUrl ? (
                                    <div className="mt-1.5 flex items-center justify-between rounded-md border border-success/20 bg-success/5 px-3 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-success" />
                                            <div>
                                                <p className="text-sm font-medium text-foreground">
                                                    Resume uploaded
                                                </p>
                                                <a
                                                    href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${resumeUrl}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs font-medium text-brand-700 hover:underline"
                                                >
                                                    View resume
                                                </a>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleDeleteResume}
                                            disabled={uploadingResume}
                                            className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                                            aria-label="Delete resume"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ) : resumeFile ? (
                                    <div className="mt-1.5 flex items-center justify-between rounded-md border border-brand-200 bg-brand-50 px-3 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-brand-700" />
                                            <div>
                                                <p className="text-sm font-medium text-foreground">
                                                    {resumeFile.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setResumeFile(null)}
                                            className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                                            aria-label="Remove"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="mt-1.5 flex h-24 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/40 transition-colors hover:border-brand-500 hover:bg-brand-50/40">
                                        <Upload className="mb-1 h-5 w-5 text-muted-foreground" />
                                        <span className="text-xs font-medium text-foreground">
                                            Upload resume
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">
                                            PDF, DOC, DOCX · max 10MB
                                        </span>
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx"
                                            onChange={(e) =>
                                                e.target.files?.[0] && setResumeFile(e.target.files[0])
                                            }
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            disabled={loading || uploadingResume}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || uploadingResume}>
                            {loading || uploadingResume ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                                </>
                            ) : (
                                'Save'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
