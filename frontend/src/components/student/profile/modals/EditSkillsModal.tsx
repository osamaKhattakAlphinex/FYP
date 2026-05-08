'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Skill } from '@/types/student.types'

interface EditSkillsModalProps {
    isOpen: boolean
    onClose: () => void
    currentSkills: Skill[]
    onSave: (skills: Omit<Skill, 'id'>[]) => Promise<void>
}

export default function EditSkillsModal({
    isOpen,
    onClose,
    currentSkills,
    onSave,
}: EditSkillsModalProps) {
    const [skills, setSkills] = useState<Array<{ name: string; level: Skill['level'] }>>([])
    const [newSkill, setNewSkill] = useState({ name: '', level: 'Intermediate' as Skill['level'] })
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setSkills(currentSkills.map((s) => ({ name: s.name, level: s.level })))
            setNewSkill({ name: '', level: 'Intermediate' })
        }
    }, [isOpen, currentSkills])

    const handleAdd = () => {
        if (!newSkill.name.trim()) return
        setSkills([...skills, { ...newSkill, name: newSkill.name.trim() }])
        setNewSkill({ name: '', level: 'Intermediate' })
    }

    const handleRemove = (index: number) =>
        setSkills(skills.filter((_, i) => i !== index))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await onSave(skills)
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
                        <DialogTitle>Edit skills</DialogTitle>
                        <DialogCloseButton type="button" />
                    </DialogHeader>
                    <DialogBody>
                        <div className="flex gap-2">
                            <Input
                                value={newSkill.name}
                                onChange={(e) =>
                                    setNewSkill({ ...newSkill, name: e.target.value })
                                }
                                placeholder="Skill name (e.g. React)"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        handleAdd()
                                    }
                                }}
                            />
                            <Select
                                value={newSkill.level}
                                onValueChange={(v) =>
                                    setNewSkill({ ...newSkill, level: v as Skill['level'] })
                                }
                            >
                                <SelectTrigger className="w-36">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Beginner">Beginner</SelectItem>
                                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                                    <SelectItem value="Advanced">Advanced</SelectItem>
                                    <SelectItem value="Expert">Expert</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button
                                type="button"
                                onClick={handleAdd}
                                size="icon"
                                aria-label="Add skill"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>

                        <ul className="mt-4 max-h-72 space-y-1.5 overflow-y-auto scrollbar-thin">
                            {skills.length === 0 && (
                                <li className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
                                    No skills yet — add a few above.
                                </li>
                            )}
                            {skills.map((skill, i) => (
                                <li
                                    key={`${skill.name}-${i}`}
                                    className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2"
                                >
                                    <div className="text-sm">
                                        <span className="font-medium text-foreground">
                                            {skill.name}
                                        </span>
                                        <span className="ml-2 text-xs text-muted-foreground">
                                            · {skill.level}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(i)}
                                        className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                        aria-label="Remove"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </li>
                            ))}
                        </ul>
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
