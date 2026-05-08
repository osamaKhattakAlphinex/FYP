'use client'

import { Loader2 } from 'lucide-react'
import { ReactNode } from 'react'
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

interface EditModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    onSubmit?: () => void
    onSave?: () => void
    isLoading?: boolean
    children: ReactNode
}

export default function EditModal({
    isOpen,
    onClose,
    title,
    onSubmit,
    onSave,
    isLoading = false,
    children,
}: EditModalProps) {
    const handleSubmit = onSubmit || onSave || (() => {})

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent size="md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogCloseButton />
                </DialogHeader>
                <DialogBody>{children}</DialogBody>
                <DialogFooter>
                    <Button variant="secondary" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                            </>
                        ) : (
                            'Save'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
