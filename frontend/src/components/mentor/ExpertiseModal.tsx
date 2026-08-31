'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

import EditModal from '@/components/shared/EditModal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { mentorService } from '@/services/mentorService'
import type { ExpertiseLevel, MentorExpertise } from '@/types/mentor.types'

const LEVELS: ExpertiseLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert']

interface ExpertiseModalProps {
    isOpen: boolean
    onClose: () => void
    existing?: MentorExpertise | null
    onSaved: (expertise: MentorExpertise) => void
}

export default function ExpertiseModal({
    isOpen,
    onClose,
    existing,
    onSaved,
}: ExpertiseModalProps) {
    const [name, setName] = useState(existing?.name || '')
    const [level, setLevel] = useState<ExpertiseLevel>(existing?.level || 'Advanced')
    const [years, setYears] = useState<string>(
        existing?.yearsOfExperience != null ? String(existing.yearsOfExperience) : '',
    )
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        const trimmed = name.trim()
        if (!trimmed) {
            toast.error('Enter a skill name')
            return
        }
        try {
            setSaving(true)
            const payload = {
                name: trimmed,
                level,
                yearsOfExperience: years ? Number(years) : null,
            }
            const result = existing
                ? await mentorService.updateExpertise(existing.id, payload)
                : await mentorService.addExpertise(payload)
            toast.success(existing ? 'Expertise updated' : 'Expertise added')
            onSaved(result)
            onClose()
        } catch (err: any) {
            const message =
                err?.response?.data?.errors?.[0]?.message ||
                err?.response?.data?.message ||
                'Could not save this expertise'
            toast.error(message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <EditModal
            isOpen={isOpen}
            onClose={onClose}
            title={existing ? 'Edit expertise' : 'Add expertise'}
            onSave={handleSave}
            isLoading={saving}
        >
            <div className="space-y-4">
                <div>
                    <Label htmlFor="expertiseName">Skill</Label>
                    <Input
                        id="expertiseName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. React, Python, Figma"
                        maxLength={150}
                        className="mt-1.5"
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label htmlFor="expertiseLevel">Level</Label>
                        <Select value={level} onValueChange={(v) => setLevel(v as ExpertiseLevel)}>
                            <SelectTrigger id="expertiseLevel" className="mt-1.5 h-10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {LEVELS.map((l) => (
                                    <SelectItem key={l} value={l}>
                                        {l}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="expertiseYears">
                            Years{' '}
                            <span className="font-normal text-muted-foreground">(optional)</span>
                        </Label>
                        <Input
                            id="expertiseYears"
                            type="number"
                            min={0}
                            max={60}
                            value={years}
                            onChange={(e) => setYears(e.target.value)}
                            placeholder="5"
                            className="mt-1.5"
                        />
                    </div>
                </div>
            </div>
        </EditModal>
    )
}
