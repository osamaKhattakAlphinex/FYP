'use client'

import * as React from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogBody,
    DialogTitle,
    DialogCloseButton,
} from '@/components/ui/dialog'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    size?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
}: ModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent size={size}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogCloseButton />
                </DialogHeader>
                <DialogBody>{children}</DialogBody>
            </DialogContent>
        </Dialog>
    )
}
