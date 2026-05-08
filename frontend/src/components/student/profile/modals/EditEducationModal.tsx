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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Education } from '@/types/student.types'

interface EditEducationModalProps {
    isOpen: boolean
    onClose: () => void
    education: Education | null
    onSave: (data: Omit<Education, 'id'>) => Promise<void>
}

export default function EditEducationModal({
    isOpen,
    onClose,
    education,
    onSave,
}: EditEducationModalProps) {
    const [formData, setFormData] = useState({
        institution: '',
        degree: '',
        fieldOfStudy: '',
        startYear: new Date().getFullYear(),
        endYear: null as number | null,
        isCurrentlyStudying: false,
        grade: '',
        description: '',
    })
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            if (education) {
                setFormData({
                    institution: education.institution,
                    degree: education.degree,
                    fieldOfStudy: education.fieldOfStudy,
                    startYear: education.startYear,
                    endYear: education.endYear,
                    isCurrentlyStudying: education.isCurrentlyStudying,
                    grade: education.grade || '',
                    description: education.description || '',
                })
            } else {
                setFormData({
                    institution: '',
                    degree: '',
                    fieldOfStudy: '',
                    startYear: new Date().getFullYear(),
                    endYear: null,
                    isCurrentlyStudying: false,
                    grade: '',
                    description: '',
                })
            }
        }
    }, [isOpen, education])

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
                        <DialogTitle>{education ? 'Edit education' : 'Add education'}</DialogTitle>
                        <DialogCloseButton type="button" />
                    </DialogHeader>
                    <DialogBody>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="institution">Institution *</Label>
                                <Input
                                    id="institution"
                                    required
                                    value={formData.institution}
                                    onChange={(e) =>
                                        setFormData({ ...formData, institution: e.target.value })
                                    }
                                    placeholder="Stanford University"
                                    className="mt-1.5"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="degree">Degree *</Label>
                                    <Input
                                        id="degree"
                                        required
                                        value={formData.degree}
                                        onChange={(e) =>
                                            setFormData({ ...formData, degree: e.target.value })
                                        }
                                        placeholder="Bachelor of Science"
                                        className="mt-1.5"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="fieldOfStudy">Field of study *</Label>
                                    <Input
                                        id="fieldOfStudy"
                                        required
                                        value={formData.fieldOfStudy}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                fieldOfStudy: e.target.value,
                                            })
                                        }
                                        placeholder="Computer Science"
                                        className="mt-1.5"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="startYear">Start year *</Label>
                                    <Input
                                        id="startYear"
                                        type="number"
                                        required
                                        value={formData.startYear}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                startYear: parseInt(e.target.value),
                                            })
                                        }
                                        min={1950}
                                        max={new Date().getFullYear() + 10}
                                        className="mt-1.5"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="endYear">End year</Label>
                                    <Input
                                        id="endYear"
                                        type="number"
                                        value={formData.endYear || ''}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                endYear: e.target.value
                                                    ? parseInt(e.target.value)
                                                    : null,
                                            })
                                        }
                                        disabled={formData.isCurrentlyStudying}
                                        min={formData.startYear}
                                        max={new Date().getFullYear() + 10}
                                        className="mt-1.5"
                                    />
                                </div>
                            </div>

                            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                                <Checkbox
                                    checked={formData.isCurrentlyStudying}
                                    onCheckedChange={(c) =>
                                        setFormData({
                                            ...formData,
                                            isCurrentlyStudying: !!c,
                                            endYear: c ? null : formData.endYear,
                                        })
                                    }
                                />
                                I am currently studying here
                            </label>

                            <div>
                                <Label htmlFor="grade">Grade / CGPA</Label>
                                <Input
                                    id="grade"
                                    value={formData.grade}
                                    onChange={(e) =>
                                        setFormData({ ...formData, grade: e.target.value })
                                    }
                                    placeholder="3.8"
                                    className="mt-1.5"
                                />
                            </div>

                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                    rows={3}
                                    placeholder="Focus areas, achievements, etc."
                                    className="mt-1.5"
                                />
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
                            ) : education ? (
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
