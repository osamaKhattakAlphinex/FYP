'use client'

import { useEffect, useState } from 'react'
import { Loader2, Upload, X } from 'lucide-react'
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
import { Certificate } from '@/types/student.types'

interface EditCertificateModalProps {
    isOpen: boolean
    onClose: () => void
    certificate: Certificate | null
    onSave: (data: Omit<Certificate, 'id'>, file?: File) => Promise<void>
}

export default function EditCertificateModal({
    isOpen,
    onClose,
    certificate,
    onSave,
}: EditCertificateModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        issuer: '',
        issueDate: '',
        expiryDate: null as string | null,
        credentialId: null as string | null,
        credentialUrl: null as string | null,
        certificateImage: null as string | null,
        isNexInternCertificate: false,
    })
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            if (certificate) {
                setFormData(certificate)
                if (certificate.certificateImage) {
                    setPreviewUrl(
                        `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${certificate.certificateImage}`
                    )
                } else {
                    setPreviewUrl(null)
                }
            } else {
                setFormData({
                    title: '',
                    issuer: '',
                    issueDate: '',
                    expiryDate: null,
                    credentialId: null,
                    credentialUrl: null,
                    certificateImage: null,
                    isNexInternCertificate: false,
                })
                setPreviewUrl(null)
            }
            setSelectedFile(null)
        }
    }, [isOpen, certificate])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setSelectedFile(file)
        const reader = new FileReader()
        reader.onloadend = () => setPreviewUrl(reader.result as string)
        reader.readAsDataURL(file)
    }

    const handleRemoveFile = () => {
        setSelectedFile(null)
        setPreviewUrl(
            certificate?.certificateImage
                ? `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${certificate.certificateImage}`
                : null
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await onSave(formData, selectedFile || undefined)
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
                            {certificate ? 'Edit credential' : 'Add credential'}
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
                                    placeholder="e.g. AWS Certified Developer"
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="issuer">Issuing organization *</Label>
                                <Input
                                    id="issuer"
                                    required
                                    value={formData.issuer}
                                    onChange={(e) =>
                                        setFormData({ ...formData, issuer: e.target.value })
                                    }
                                    placeholder="e.g. Amazon Web Services"
                                    className="mt-1.5"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="issueDate">Issue date *</Label>
                                    <Input
                                        id="issueDate"
                                        type="date"
                                        required
                                        value={formData.issueDate}
                                        onChange={(e) =>
                                            setFormData({ ...formData, issueDate: e.target.value })
                                        }
                                        className="mt-1.5"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="expiryDate">Expiry date</Label>
                                    <Input
                                        id="expiryDate"
                                        type="date"
                                        value={formData.expiryDate || ''}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                expiryDate: e.target.value || null,
                                            })
                                        }
                                        className="mt-1.5"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="credentialId">Credential ID</Label>
                                    <Input
                                        id="credentialId"
                                        value={formData.credentialId || ''}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                credentialId: e.target.value || null,
                                            })
                                        }
                                        placeholder="optional"
                                        className="mt-1.5"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="credentialUrl">Credential URL</Label>
                                    <Input
                                        id="credentialUrl"
                                        type="url"
                                        value={formData.credentialUrl || ''}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                credentialUrl: e.target.value || null,
                                            })
                                        }
                                        placeholder="optional"
                                        className="mt-1.5"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label>Certificate image</Label>
                                {previewUrl ? (
                                    <div className="mt-1.5 relative">
                                        <img
                                            src={previewUrl}
                                            alt="Certificate preview"
                                            className="h-44 w-full rounded-md border border-border object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleRemoveFile}
                                            className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md bg-card text-destructive shadow-pop hover:bg-destructive/10"
                                            aria-label="Remove image"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="mt-1.5 flex h-28 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/40 transition-colors hover:border-brand-500 hover:bg-brand-50/40">
                                        <Upload className="mb-1.5 h-5 w-5 text-muted-foreground" />
                                        <span className="text-xs font-medium text-foreground">
                                            Upload certificate
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">
                                            PNG, JPG or PDF · max 5MB
                                        </span>
                                        <input
                                            type="file"
                                            accept="image/*,.pdf"
                                            onChange={handleFileChange}
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
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                                </>
                            ) : certificate ? (
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
