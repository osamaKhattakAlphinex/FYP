'use client'

import { Award, Calendar, ExternalLink, MoreVertical, Trash2 } from 'lucide-react'
import SectionCard from '@/components/shared/SectionCard'
import EmptyState from '@/components/shared/EmptyState'
import { Certificate } from '@/types/student.types'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface CertificatesSectionProps {
    certificates: Certificate[]
    isEditMode?: boolean
    onEdit?: (cert: Certificate) => void
    onDelete?: (id: string) => void
    onAdd?: () => void
    onDeleteImage?: (certId: string) => void
}

export default function CertificatesSection({
    certificates,
    isEditMode = false,
    onEdit,
    onDelete,
    onAdd,
    onDeleteImage,
}: CertificatesSectionProps) {
    const fmt = (s: string) =>
        new Date(s).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

    return (
        <SectionCard
            title="Licenses & certifications"
            icon={Award}
            onEdit={isEditMode ? onAdd : undefined}
            isEmpty={certificates.length === 0}
        >
            {certificates.length > 0 ? (
                <ul className="divide-y divide-border">
                    {certificates.map((cert) => (
                        <li key={cert.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                            <div
                                className={cn(
                                    'grid h-10 w-10 flex-shrink-0 place-items-center rounded-md',
                                    cert.isNexInternCertificate
                                        ? 'bg-gradient-to-br from-brand-600 to-brand-500 text-white'
                                        : 'bg-muted text-muted-foreground border border-border'
                                )}
                            >
                                <Award className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <p className="text-sm font-semibold text-foreground">
                                                {cert.title}
                                            </p>
                                            {cert.isNexInternCertificate && (
                                                <Badge variant="success">NexIntern verified ✓</Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-foreground/80">{cert.issuer}</p>
                                    </div>
                                    {isEditMode && (onEdit || onDelete) && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger
                                                aria-label="Options"
                                                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {onEdit && (
                                                    <DropdownMenuItem onClick={() => onEdit(cert)}>
                                                        Edit
                                                    </DropdownMenuItem>
                                                )}
                                                {onDeleteImage && cert.certificateImage && (
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            if (confirm('Delete certificate image?'))
                                                                onDeleteImage(cert.id)
                                                        }}
                                                    >
                                                        Delete image
                                                    </DropdownMenuItem>
                                                )}
                                                {onDelete && (
                                                    <DropdownMenuItem
                                                        onClick={() => onDelete(cert.id)}
                                                        className="text-destructive focus:text-destructive"
                                                    >
                                                        Delete
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        Issued {fmt(cert.issueDate)}
                                    </span>
                                    <span>·</span>
                                    <span>
                                        {cert.expiryDate ? `Expires ${fmt(cert.expiryDate)}` : 'No expiry'}
                                    </span>
                                </p>
                                {cert.credentialId && (
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        ID: {cert.credentialId}
                                    </p>
                                )}
                                {cert.certificateImage && (
                                    <div className="group relative mt-2">
                                        <img
                                            src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${cert.certificateImage}`}
                                            alt={cert.title}
                                            className="h-auto w-full max-w-xs rounded-md border border-border object-cover"
                                        />
                                        {isEditMode && onDeleteImage && (
                                            <button
                                                onClick={() => {
                                                    if (confirm('Delete certificate image?'))
                                                        onDeleteImage(cert.id)
                                                }}
                                                className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md bg-destructive text-destructive-foreground opacity-0 shadow-pop transition-opacity hover:bg-destructive/90 group-hover:opacity-100"
                                                aria-label="Delete image"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                )}
                                {cert.credentialUrl && (
                                    <a
                                        href={cert.credentialUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        Show credential
                                    </a>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            ) : isEditMode ? (
                <EmptyState
                    icon={Award}
                    title="Add a credential"
                    description="Show off course completions, certifications, and the NexIntern credentials you'll earn for completed tasks."
                    ctaLabel="Add credential"
                    onCtaClick={onAdd}
                />
            ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">No credentials yet.</p>
            )}
        </SectionCard>
    )
}
