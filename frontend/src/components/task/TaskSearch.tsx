'use client'

import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskSearchProps {
    onSearch: (query: string) => void
    initialValue?: string
    placeholder?: string
    className?: string
}

export default function TaskSearch({
    onSearch,
    initialValue = '',
    placeholder = 'Search tasks, skills or companies',
    className,
}: TaskSearchProps) {
    const [query, setQuery] = useState(initialValue)
    const [location, setLocation] = useState('')

    useEffect(() => setQuery(initialValue), [initialValue])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSearch(query.trim())
    }

    return (
        <form
            onSubmit={handleSubmit}
            className={cn(
                'flex flex-col gap-2 rounded-md border border-border bg-card p-2 sm:flex-row sm:items-center',
                className
            )}
        >
            <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder}
                    className="h-10 w-full rounded-md border border-transparent bg-transparent pl-9 pr-9 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-input focus:bg-card"
                />
                {query && (
                    <button
                        type="button"
                        onClick={() => {
                            setQuery('')
                            onSearch('')
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            <div className="hidden h-6 w-px bg-border sm:block" />

            <div className="relative sm:w-56">
                <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, country, remote"
                    className="h-10 w-full rounded-md border border-transparent bg-transparent px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-input focus:bg-card"
                />
            </div>

            <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
                Search
            </button>
        </form>
    )
}
