'use client'

import { useEffect, useState } from 'react'
import { Loader2, Linkedin, Github, Globe, Twitter } from 'lucide-react'
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
import { SocialLinks } from '@/types/student.types'

interface EditSocialLinksModalProps {
    isOpen: boolean
    onClose: () => void
    currentLinks: SocialLinks
    onSave: (links: Partial<SocialLinks>) => Promise<void>
}

export default function EditSocialLinksModal({
    isOpen,
    onClose,
    currentLinks,
    onSave,
}: EditSocialLinksModalProps) {
    const [formData, setFormData] = useState(currentLinks)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen) setFormData(currentLinks)
    }, [isOpen, currentLinks])

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

    const fields = [
        { key: 'linkedin', icon: Linkedin, label: 'LinkedIn', placeholder: 'https://linkedin.com/in/yourprofile' },
        { key: 'github', icon: Github, label: 'GitHub', placeholder: 'https://github.com/yourusername' },
        { key: 'portfolio', icon: Globe, label: 'Portfolio', placeholder: 'https://yourportfolio.com' },
        { key: 'twitter', icon: Twitter, label: 'Twitter / X', placeholder: 'https://x.com/yourusername' },
    ] as const

    return (
        <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
            <DialogContent size="md">
                <form onSubmit={handleSubmit} className="contents">
                    <DialogHeader>
                        <DialogTitle>Edit social links</DialogTitle>
                        <DialogCloseButton type="button" />
                    </DialogHeader>
                    <DialogBody>
                        <div className="space-y-4">
                            {fields.map(({ key, icon: Icon, label, placeholder }) => (
                                <div key={key}>
                                    <Label
                                        htmlFor={key}
                                        className="flex items-center gap-1.5"
                                    >
                                        <Icon className="h-3.5 w-3.5" />
                                        {label}
                                    </Label>
                                    <Input
                                        id={key}
                                        type="url"
                                        value={formData[key] || ''}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                [key]: e.target.value || null,
                                            })
                                        }
                                        placeholder={placeholder}
                                        className="mt-1.5"
                                    />
                                </div>
                            ))}
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
