'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface EditAboutModalProps {
    isOpen: boolean
    onClose: () => void
    currentAbout: string
    onSave: (about: string) => Promise<void>
}

export default function EditAboutModal({
    isOpen,
    onClose,
    currentAbout,
    onSave,
}: EditAboutModalProps) {
    const [about, setAbout] = useState(currentAbout)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen) setAbout(currentAbout)
    }, [isOpen, currentAbout])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await onSave(about)
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
                        <DialogTitle>Edit about</DialogTitle>
                        <DialogCloseButton type="button" />
                    </DialogHeader>
                    <DialogBody>
                        <Label htmlFor="about">Tell companies about yourself</Label>
                        <Textarea
                            id="about"
                            value={about}
                            onChange={(e) => setAbout(e.target.value)}
                            rows={8}
                            maxLength={500}
                            placeholder="Share your background, interests, and what you're hoping to build…"
                            className="mt-1.5"
                        />
                        <p className="mt-1 text-right text-xs text-muted-foreground">
                            {about.length} / 500
                        </p>
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
