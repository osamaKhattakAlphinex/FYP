'use client'

import { UploadCloud, X } from 'lucide-react'
import { useState, useRef, DragEvent } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AvatarUploadProps {
    currentImage?: string | null
    currentAvatar?: string | null
    initials?: string
    onUpload?: (file: File) => void
    onSave?: (url: any) => void
    onClose: () => void
    label?: string
}

export default function AvatarUpload({
    currentImage,
    currentAvatar,
    onUpload,
    onSave,
    onClose,
    label = 'Profile photo',
}: AvatarUploadProps) {
    const [preview, setPreview] = useState<string | null>(
        currentImage || currentAvatar || null
    )
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFile = (file: File) => {
        if (!file?.type.startsWith('image/')) return
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB')
            return
        }
        const reader = new FileReader()
        reader.onloadend = () => setPreview(reader.result as string)
        reader.readAsDataURL(file)
    }

    const handleSave = () => {
        if (fileInputRef.current?.files?.[0]) {
            if (onUpload) onUpload(fileInputRef.current.files[0])
            else if (onSave) onSave(preview)
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/55 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-md rounded-lg bg-card shadow-pop">
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <h2 className="text-base font-semibold text-foreground">
                        Upload {label.toLowerCase()}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="px-6 py-5">
                    {preview ? (
                        <div className="text-center">
                            <img
                                src={preview}
                                alt="Preview"
                                className="mx-auto h-24 w-24 rounded-full border-2 border-border object-cover shadow-sm"
                            />
                            <div className="mt-4 flex justify-center gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    Change
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => {
                                        setPreview(null)
                                        if (fileInputRef.current) fileInputRef.current.value = ''
                                    }}
                                >
                                    Remove
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div
                            onDrop={(e: DragEvent<HTMLDivElement>) => {
                                e.preventDefault()
                                setIsDragging(false)
                                const file = e.dataTransfer.files[0]
                                if (file) handleFile(file)
                            }}
                            onDragOver={(e) => {
                                e.preventDefault()
                                setIsDragging(true)
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                                'cursor-pointer rounded-md border-2 border-dashed px-6 py-10 text-center transition-all',
                                isDragging
                                    ? 'border-brand-600 bg-brand-50'
                                    : 'border-border bg-muted/30 hover:border-brand-500 hover:bg-brand-50/50'
                            )}
                        >
                            <UploadCloud className="mx-auto h-8 w-8 text-brand-600" />
                            <p className="mt-2 text-sm font-medium text-foreground">
                                Drag &amp; drop your photo
                            </p>
                            <p className="text-xs text-muted-foreground">
                                or click to browse · PNG, JPG up to 5MB
                            </p>
                        </div>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFile(file)
                        }}
                        className="hidden"
                    />
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!preview}>
                        Save photo
                    </Button>
                </div>
            </div>
        </div>
    )
}
