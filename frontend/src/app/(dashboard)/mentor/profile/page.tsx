'use client'

import { useCallback, useEffect, useState } from 'react'
import {
    Briefcase,
    Github,
    Linkedin,
    Loader2,
    MapPin,
    Pencil,
    Plus,
    ShieldAlert,
    ShieldCheck,
    Trash2,
    Globe,
} from 'lucide-react'
import toast from 'react-hot-toast'

import AppShell from '@/components/shared/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import ExpertiseModal from '@/components/mentor/ExpertiseModal'
import { useRoleProtection } from '@/hooks/useRoleProtection'
import { mentorService } from '@/services/mentorService'
import type {
    AvailabilityStatus,
    Mentor,
    MentorExpertise,
} from '@/types/mentor.types'
import { cn, getInitials } from '@/lib/utils'

const apiRoot = () => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    return base.replace(/\/api\/?$/, '')
}
const resolveImage = (url?: string | null) =>
    !url ? undefined : url.startsWith('http') ? url : `${apiRoot()}${url}`

export default function MentorProfilePage() {
    useRoleProtection({ allowedRoles: ['mentor'] })

    const [profile, setProfile] = useState<Mentor | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Form state, hydrated once the profile loads.
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [headline, setHeadline] = useState('')
    const [bio, setBio] = useState('')
    const [currentPosition, setCurrentPosition] = useState('')
    const [currentCompany, setCurrentCompany] = useState('')
    const [yearsOfExperience, setYearsOfExperience] = useState('')
    const [city, setCity] = useState('')
    const [country, setCountry] = useState('')
    const [linkedin, setLinkedin] = useState('')
    const [github, setGithub] = useState('')
    const [portfolio, setPortfolio] = useState('')

    const [expertiseModalOpen, setExpertiseModalOpen] = useState(false)
    const [editingExpertise, setEditingExpertise] = useState<MentorExpertise | null>(null)

    const fetchProfile = useCallback(async () => {
        try {
            setLoading(true)
            const p = await mentorService.getMyProfile()
            setProfile(p)
            setFirstName(p.firstName || '')
            setLastName(p.lastName || '')
            setHeadline(p.headline || '')
            setBio(p.bio || '')
            setCurrentPosition(p.currentPosition || '')
            setCurrentCompany(p.currentCompany || '')
            setYearsOfExperience(String(p.yearsOfExperience ?? ''))
            setCity(p.location?.city || '')
            setCountry(p.location?.country || '')
            setLinkedin(p.social?.linkedin || '')
            setGithub(p.social?.github || '')
            setPortfolio(p.social?.portfolio || '')
        } catch {
            toast.error('Failed to load your profile')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchProfile()
    }, [fetchProfile])

    const handleSave = async () => {
        try {
            setSaving(true)
            const updated = await mentorService.updateMyProfile({
                firstName,
                lastName,
                headline: headline || undefined,
                bio: bio || undefined,
                currentPosition: currentPosition || undefined,
                currentCompany: currentCompany || undefined,
                yearsOfExperience: yearsOfExperience ? Number(yearsOfExperience) : undefined,
                location: { city: city || undefined, country: country || undefined },
                social: {
                    linkedin: linkedin || undefined,
                    github: github || undefined,
                    portfolio: portfolio || undefined,
                },
            })
            setProfile(updated)
            toast.success('Profile updated')
        } catch (err: any) {
            const message =
                err?.response?.data?.errors?.[0]?.message ||
                err?.response?.data?.message ||
                'Failed to update your profile'
            toast.error(message)
        } finally {
            setSaving(false)
        }
    }

    const handleAvailabilityChange = async (status: AvailabilityStatus) => {
        if (!profile) return
        try {
            await mentorService.updateAvailability({ availabilityStatus: status })
            setProfile({
                ...profile,
                availability: { ...profile.availability, status },
            })
            toast.success('Availability updated')
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Could not update availability')
        }
    }

    const handleCapacityChange = async (max: number) => {
        if (!profile) return
        try {
            await mentorService.updateAvailability({ maxActiveMentees: max })
            setProfile({
                ...profile,
                availability: { ...profile.availability, maxActiveMentees: max },
            })
            toast.success('Capacity updated')
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Could not update capacity')
        }
    }

    const handleDeleteExpertise = async (expertiseId: string) => {
        if (!window.confirm('Remove this expertise?')) return
        try {
            await mentorService.deleteExpertise(expertiseId)
            setProfile((prev) =>
                prev
                    ? { ...prev, expertise: (prev.expertise || []).filter((e) => e.id !== expertiseId) }
                    : prev,
            )
            toast.success('Expertise removed')
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Could not remove this expertise')
        }
    }

    const handleExpertiseSaved = (expertise: MentorExpertise) => {
        setProfile((prev) => {
            if (!prev) return prev
            const existing = prev.expertise || []
            const idx = existing.findIndex((e) => e.id === expertise.id)
            const next =
                idx >= 0
                    ? existing.map((e) => (e.id === expertise.id ? expertise : e))
                    : [...existing, expertise]
            return { ...prev, expertise: next }
        })
    }

    if (loading) {
        return (
            <AppShell>
                <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </AppShell>
        )
    }

    return (
        <AppShell>
            <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    Mentor profile
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    Companies see this profile when choosing a mentor for their students.
                </p>
            </div>

            {profile && (
                <Card
                    className={cn(
                        'flex items-start gap-3 p-4',
                        profile.verification.status === 'approved'
                            ? 'border-emerald-200 bg-emerald-50'
                            : profile.verification.status === 'rejected'
                              ? 'border-red-200 bg-red-50'
                              : 'border-amber-200 bg-amber-50',
                    )}
                >
                    {profile.verification.status === 'approved' ? (
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    ) : (
                        <ShieldAlert
                            className={cn(
                                'mt-0.5 h-5 w-5 shrink-0',
                                profile.verification.status === 'rejected'
                                    ? 'text-red-600'
                                    : 'text-amber-600',
                            )}
                        />
                    )}
                    <div>
                        <p className="text-sm font-semibold text-foreground">
                            {mentorService.getVerificationLabel(profile.verification.status)}
                        </p>
                        {profile.verification.note && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {profile.verification.note}
                            </p>
                        )}
                        {profile.verification.status !== 'approved' && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Companies cannot assign you until an administrator approves your
                                profile. Complete it fully to speed up the review.
                            </p>
                        )}
                    </div>
                </Card>
            )}

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-16 w-16">
                                <AvatarImage
                                    src={resolveImage(profile?.profilePicture)}
                                    alt={`${firstName} ${lastName}`}
                                />
                                <AvatarFallback>
                                    {getInitials(`${firstName} ${lastName}` || '?')}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm font-semibold text-foreground">
                                    Profile completion: {profile?.profileCompletion ?? 0}%
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Complete profiles are reviewed faster and rank higher in AI
                                    suggestions.
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <div>
                                <Label htmlFor="firstName">First name</Label>
                                <Input
                                    id="firstName"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="lastName">Last name</Label>
                                <Input
                                    id="lastName"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="mt-1.5"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <Label htmlFor="headline">Professional headline</Label>
                                <Input
                                    id="headline"
                                    value={headline}
                                    onChange={(e) => setHeadline(e.target.value)}
                                    placeholder="Senior Frontend Engineer · React & TypeScript"
                                    maxLength={255}
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="currentPosition">Current position</Label>
                                <Input
                                    id="currentPosition"
                                    value={currentPosition}
                                    onChange={(e) => setCurrentPosition(e.target.value)}
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="currentCompany">Current company</Label>
                                <Input
                                    id="currentCompany"
                                    value={currentCompany}
                                    onChange={(e) => setCurrentCompany(e.target.value)}
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="yearsOfExperience">Years of experience</Label>
                                <Input
                                    id="yearsOfExperience"
                                    type="number"
                                    min={0}
                                    max={60}
                                    value={yearsOfExperience}
                                    onChange={(e) => setYearsOfExperience(e.target.value)}
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="city">City</Label>
                                <Input
                                    id="city"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    className="mt-1.5"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <Label htmlFor="country">Country</Label>
                                <Input
                                    id="country"
                                    value={country}
                                    onChange={(e) => setCountry(e.target.value)}
                                    className="mt-1.5"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <Label htmlFor="bio">Bio</Label>
                                <Textarea
                                    id="bio"
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    rows={4}
                                    maxLength={2000}
                                    placeholder="What do you help students with, and how do you like to mentor?"
                                    className="mt-1.5"
                                />
                            </div>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-3">
                            <div>
                                <Label htmlFor="linkedin" className="flex items-center gap-1">
                                    <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                                </Label>
                                <Input
                                    id="linkedin"
                                    value={linkedin}
                                    onChange={(e) => setLinkedin(e.target.value)}
                                    placeholder="https://linkedin.com/in/…"
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="github" className="flex items-center gap-1">
                                    <Github className="h-3.5 w-3.5" /> GitHub
                                </Label>
                                <Input
                                    id="github"
                                    value={github}
                                    onChange={(e) => setGithub(e.target.value)}
                                    placeholder="https://github.com/…"
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="portfolio" className="flex items-center gap-1">
                                    <Globe className="h-3.5 w-3.5" /> Portfolio
                                </Label>
                                <Input
                                    id="portfolio"
                                    value={portfolio}
                                    onChange={(e) => setPortfolio(e.target.value)}
                                    placeholder="https://…"
                                    className="mt-1.5"
                                />
                            </div>
                        </div>

                        <Button className="mt-5" onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            {saving ? 'Saving…' : 'Save profile'}
                        </Button>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                <Briefcase className="h-4 w-4" /> Expertise
                            </h2>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                    setEditingExpertise(null)
                                    setExpertiseModalOpen(true)
                                }}
                            >
                                <Plus className="h-3.5 w-3.5" /> Add
                            </Button>
                        </div>
                        {(profile?.expertise || []).length === 0 ? (
                            <p className="mt-3 text-xs text-muted-foreground">
                                Add the skills you can mentor students on — this drives the AI
                                suggestions companies see.
                            </p>
                        ) : (
                            <div className="mt-3 space-y-2">
                                {(profile?.expertise || []).map((e) => (
                                    <div
                                        key={e.id}
                                        className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                                    >
                                        <div>
                                            <span className="text-sm font-medium text-foreground">
                                                {e.name}
                                            </span>
                                            <span className="ml-2 text-xs text-muted-foreground">
                                                {e.level}
                                                {e.yearsOfExperience ? ` · ${e.yearsOfExperience}y` : ''}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => {
                                                    setEditingExpertise(e)
                                                    setExpertiseModalOpen(true)
                                                }}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => handleDeleteExpertise(e.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                <div className="space-y-4">
                    <Card className="p-4">
                        <h2 className="text-sm font-semibold text-foreground">Availability</h2>
                        <div className="mt-3">
                            <Label htmlFor="availabilityStatus">Status</Label>
                            <Select
                                value={profile?.availability.status}
                                onValueChange={(v) =>
                                    handleAvailabilityChange(v as AvailabilityStatus)
                                }
                            >
                                <SelectTrigger id="availabilityStatus" className="mt-1.5 h-10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="available">Available</SelectItem>
                                    <SelectItem value="limited">Limited availability</SelectItem>
                                    <SelectItem value="unavailable">Not taking mentees</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="mt-3">
                            <Label htmlFor="maxMentees">Max active mentees</Label>
                            <Input
                                id="maxMentees"
                                type="number"
                                min={1}
                                max={50}
                                defaultValue={profile?.availability.maxActiveMentees}
                                onBlur={(e) => {
                                    const v = Number(e.target.value)
                                    if (v && v !== profile?.availability.maxActiveMentees) {
                                        handleCapacityChange(v)
                                    }
                                }}
                                className="mt-1.5"
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                                Currently mentoring {profile?.availability.activeMenteeCount ?? 0} of{' '}
                                {profile?.availability.maxActiveMentees ?? 0}.
                            </p>
                        </div>
                    </Card>

                    <Card className="p-4">
                        <h2 className="text-sm font-semibold text-foreground">Track record</h2>
                        <dl className="mt-2 space-y-1.5 text-xs">
                            <div className="flex justify-between">
                                <dt className="text-muted-foreground">Total mentees</dt>
                                <dd className="font-medium text-foreground">
                                    {profile?.stats.totalMentees ?? 0}
                                </dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-muted-foreground">Completed</dt>
                                <dd className="font-medium text-foreground">
                                    {profile?.stats.completedMentorships ?? 0}
                                </dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-muted-foreground">Average rating</dt>
                                <dd className="font-medium text-foreground">
                                    {profile?.stats.totalRatings
                                        ? `${profile.stats.averageRating.toFixed(1)} (${profile.stats.totalRatings})`
                                        : 'No ratings yet'}
                                </dd>
                            </div>
                        </dl>
                    </Card>
                </div>
            </div>

            {expertiseModalOpen && (
                <ExpertiseModal
                    isOpen={expertiseModalOpen}
                    onClose={() => setExpertiseModalOpen(false)}
                    existing={editingExpertise}
                    onSaved={handleExpertiseSaved}
                />
            )}
        </AppShell>
    )
}
