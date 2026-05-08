'use client'

import { useEffect, useState } from 'react'
import { TaskFilters as TaskFiltersType } from '@/services/taskService'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskFiltersProps {
    filters: TaskFiltersType
    onFilterChange: (filters: TaskFiltersType) => void
}

interface FilterSection {
    title: string
    key: keyof TaskFiltersType
    options: Array<{ value: string; label: string }>
}

const sections: FilterSection[] = [
    {
        title: 'Category',
        key: 'category',
        options: [
            { value: 'Web Development', label: 'Web Development' },
            { value: 'Mobile Development', label: 'Mobile Development' },
            { value: 'UI/UX Design', label: 'UI/UX Design' },
            { value: 'Data Science', label: 'Data Science' },
            { value: 'Machine Learning', label: 'Machine Learning' },
            { value: 'Digital Marketing', label: 'Digital Marketing' },
            { value: 'Content Writing', label: 'Content Writing' },
            { value: 'Graphic Design', label: 'Graphic Design' },
            { value: 'Video Editing', label: 'Video Editing' },
            { value: 'Business Analysis', label: 'Business Analysis' },
            { value: 'Quality Assurance', label: 'QA / Testing' },
            { value: 'DevOps', label: 'DevOps' },
            { value: 'Cybersecurity', label: 'Cybersecurity' },
        ],
    },
    {
        title: 'Work type',
        key: 'workType',
        options: [
            { value: 'remote', label: 'Remote' },
            { value: 'onsite', label: 'On-site' },
            { value: 'hybrid', label: 'Hybrid' },
        ],
    },
    {
        title: 'Experience level',
        key: 'experienceLevel',
        options: [
            { value: 'entry', label: 'Entry' },
            { value: 'intermediate', label: 'Intermediate' },
            { value: 'expert', label: 'Expert' },
        ],
    },
    {
        title: 'Compensation',
        key: 'budget',
        options: [
            { value: 'unpaid', label: 'Unpaid' },
            { value: 'under-500', label: 'Under $500' },
            { value: '500-1000', label: '$500 – $1,000' },
            { value: 'over-1000', label: 'Over $1,000' },
        ],
    },
    {
        title: 'Location',
        key: 'location',
        options: [
            { value: 'remote', label: 'Remote only' },
            { value: 'United States', label: 'United States' },
            { value: 'Canada', label: 'Canada' },
            { value: 'United Kingdom', label: 'United Kingdom' },
            { value: 'Germany', label: 'Germany' },
            { value: 'Australia', label: 'Australia' },
            { value: 'India', label: 'India' },
            { value: 'Pakistan', label: 'Pakistan' },
        ],
    },
]

const popularSkills = [
    'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python',
    'Next.js', 'Tailwind', 'SQL', 'MongoDB', 'AWS',
    'Figma', 'Photoshop', 'Java', 'Docker', 'Git',
]

function FilterAccordion({
    title,
    children,
    defaultOpen = true,
}: {
    title: string
    children: React.ReactNode
    defaultOpen?: boolean
}) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <div className="border-b border-border py-3 last:border-0">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex w-full items-center justify-between py-1 text-left"
            >
                <span className="text-sm font-semibold text-foreground">{title}</span>
                <ChevronDown
                    className={cn(
                        'h-4 w-4 text-muted-foreground transition-transform',
                        open && 'rotate-180'
                    )}
                />
            </button>
            {open && <div className="mt-2 space-y-1">{children}</div>}
        </div>
    )
}

export default function TaskFilters({ filters, onFilterChange }: TaskFiltersProps) {
    const [selectedSkills, setSelectedSkills] = useState<string[]>([])
    const [skillSearch, setSkillSearch] = useState('')

    useEffect(() => {
        if (filters.skills) setSelectedSkills(filters.skills.split(','))
    }, [])

    const handleFilterChange = (key: keyof TaskFiltersType, value: string) => {
        const newFilters = { ...filters }
        if (newFilters[key] === value) delete newFilters[key]
        else (newFilters[key] as string) = value
        onFilterChange(newFilters)
    }

    const handleSkillToggle = (skill: string) => {
        const newSkills = selectedSkills.includes(skill)
            ? selectedSkills.filter((s) => s !== skill)
            : [...selectedSkills, skill]
        setSelectedSkills(newSkills)
        onFilterChange({
            ...filters,
            skills: newSkills.length ? newSkills.join(',') : undefined,
        })
    }

    return (
        <div className="space-y-1">
            {sections.map((section) => (
                <FilterAccordion
                    key={section.key as string}
                    title={section.title}
                    defaultOpen={section.key !== 'location'}
                >
                    <div className="flex flex-col gap-0.5">
                        {section.options.map((opt) => {
                            const active = filters[section.key] === opt.value
                            return (
                                <label
                                    key={opt.value}
                                    className={cn(
                                        'flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                                        active
                                            ? 'bg-brand-50 text-brand-700 font-medium'
                                            : 'text-foreground hover:bg-muted'
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        checked={active}
                                        onChange={() =>
                                            handleFilterChange(section.key, opt.value)
                                        }
                                        className="h-4 w-4 rounded border-input text-brand-600 focus:ring-2 focus:ring-ring"
                                    />
                                    <span className="flex-1">{opt.label}</span>
                                </label>
                            )
                        })}
                    </div>
                </FilterAccordion>
            ))}

            <FilterAccordion title="Skills" defaultOpen>
                <input
                    type="text"
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                    placeholder="Search skills…"
                    className="mb-2 h-8 w-full rounded-md border border-input bg-card px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {selectedSkills.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                        {selectedSkills.map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => handleSkillToggle(s)}
                                className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
                            >
                                {s} <X className="h-3 w-3" />
                            </button>
                        ))}
                    </div>
                )}
                <div className="flex flex-wrap gap-1">
                    {popularSkills
                        .filter(
                            (s) =>
                                !selectedSkills.includes(s) &&
                                s.toLowerCase().includes(skillSearch.toLowerCase())
                        )
                        .slice(0, 14)
                        .map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => handleSkillToggle(s)}
                                className="inline-flex items-center rounded-full border border-border bg-card px-2 py-0.5 text-xs text-foreground hover:bg-muted"
                            >
                                + {s}
                            </button>
                        ))}
                </div>
            </FilterAccordion>
        </div>
    )
}
