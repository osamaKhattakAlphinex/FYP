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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Project } from '@/types/student.types'

interface EditProjectModalProps {
    isOpen: boolean
    onClose: () => void
    project: Project | null
    onSave: (data: Omit<Project, 'id'>) => Promise<void>
}

export default function EditProjectModal({
    isOpen,
    onClose,
    project,
    onSave,
}: EditProjectModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        techStack: [] as string[],
        projectUrl: null as string | null,
        githubUrl: null as string | null,
        thumbnailUrl: null as string | null,
        startDate: '',
        endDate: null as string | null,
    })
    const [newTech, setNewTech] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            if (project) setFormData(project)
            else
                setFormData({
                    title: '',
                    description: '',
                    techStack: [],
                    projectUrl: null,
                    githubUrl: null,
                    thumbnailUrl: null,
                    startDate: '',
                    endDate: null,
                })
            setNewTech('')
        }
    }, [isOpen, project])

    const addTech = () => {
        if (!newTech.trim()) return
        setFormData({ ...formData, techStack: [...formData.techStack, newTech.trim()] })
        setNewTech('')
    }

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
                        <DialogTitle>{project ? 'Edit project' : 'Add project'}</DialogTitle>
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
                                    placeholder="Project title"
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
                                    rows={4}
                                    placeholder="What does this project do? What did you build?"
                                    className="mt-1.5"
                                />
                            </div>

                            <div>
                                <Label>Tech stack</Label>
                                <div className="mt-1.5 flex gap-2">
                                    <Input
                                        value={newTech}
                                        onChange={(e) => setNewTech(e.target.value)}
                                        placeholder="Add a technology"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                addTech()
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        size="icon"
                                        onClick={addTech}
                                        aria-label="Add"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                {formData.techStack.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {formData.techStack.map((t, i) => (
                                            <Badge
                                                key={i}
                                                variant="soft"
                                                className="inline-flex items-center gap-1"
                                            >
                                                {t}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setFormData({
                                                            ...formData,
                                                            techStack: formData.techStack.filter(
                                                                (_, j) => j !== i
                                                            ),
                                                        })
                                                    }
                                                    className="rounded-full hover:bg-brand-200/60"
                                                    aria-label="Remove"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="projectUrl">Live URL</Label>
                                    <Input
                                        id="projectUrl"
                                        type="url"
                                        value={formData.projectUrl || ''}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                projectUrl: e.target.value || null,
                                            })
                                        }
                                        placeholder="https://example.com"
                                        className="mt-1.5"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="githubUrl">GitHub URL</Label>
                                    <Input
                                        id="githubUrl"
                                        type="url"
                                        value={formData.githubUrl || ''}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                githubUrl: e.target.value || null,
                                            })
                                        }
                                        placeholder="https://github.com/…"
                                        className="mt-1.5"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="startDate">Start</Label>
                                    <Input
                                        id="startDate"
                                        type="month"
                                        value={formData.startDate}
                                        onChange={(e) =>
                                            setFormData({ ...formData, startDate: e.target.value })
                                        }
                                        className="mt-1.5"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="endDate">End (optional)</Label>
                                    <Input
                                        id="endDate"
                                        type="month"
                                        value={formData.endDate || ''}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                endDate: e.target.value || null,
                                            })
                                        }
                                        className="mt-1.5"
                                    />
                                </div>
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
                            ) : project ? (
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
