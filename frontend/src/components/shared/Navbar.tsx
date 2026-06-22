'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    Search,
    Home,
    Briefcase,
    User as UserIcon,
    Bell,
    Menu,
    LogOut,
    Settings,
    LayoutDashboard,
    CalendarClock,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

function Wordmark() {
    return (
        <Link href="/" className="flex items-center font-bold text-lg tracking-tight">
            <span className="text-brand-700">Nex</span>
            <span className="text-foreground">Intern</span>
        </Link>
    )
}

interface NavIconLinkProps {
    href: string
    icon: React.ElementType
    label: string
    active?: boolean
}

function NavIconLink({ href, icon: Icon, label, active }: NavIconLinkProps) {
    return (
        <Link
            href={href}
            className={cn(
                'flex flex-col items-center justify-center px-3 h-full text-xs font-medium border-b-2 transition-colors',
                active
                    ? 'text-foreground border-foreground'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
            )}
        >
            <Icon className="h-5 w-5" />
            <span className="mt-0.5">{label}</span>
        </Link>
    )
}

export default function Navbar() {
    const { user, loading, logout } = useAuth()
    const pathname = usePathname()
    const router = useRouter()
    const [searchValue, setSearchValue] = useState('')
    const [mobileOpen, setMobileOpen] = useState(false)

    const handleLogout = async () => {
        try {
            await logout()
            toast.success('Logged out')
            router.push('/')
        } catch {
            toast.error('Failed to log out')
        }
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchValue.trim()) {
            router.push(`/tasks?search=${encodeURIComponent(searchValue.trim())}`)
        }
    }

    const dashboardHref =
        user?.role === 'company' ? '/company/dashboard' : '/student/dashboard'
    const profileHref =
        user?.role === 'company' ? '/company/profile' : '/student/profile'
    const interviewsHref =
        user?.role === 'company' ? '/company/interviews' : '/student/interviews'

    const userName =
        user?.firstName && user?.lastName
            ? `${user.firstName} ${user.lastName}`
            : user?.firstName || user?.companyName || user?.email?.split('@')[0] || 'User'

    return (
        <header className="sticky top-0 z-40 w-full border-b border-border bg-card">
            <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-3 px-4 lg:px-6">
                <Wordmark />

                {/* Search bar (logged-in only) */}
                {user && (
                    <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md ml-2">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                placeholder="Search tasks, skills, companies"
                                className="h-9 w-full rounded-md border-0 bg-secondary pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                    </form>
                )}

                <div className="flex-1" />

                {/* Logged-in nav */}
                {user && !loading && (
                    <nav className="hidden md:flex items-center h-14">
                        <NavIconLink
                            href={dashboardHref}
                            icon={Home}
                            label="Home"
                            active={pathname?.includes('/dashboard')}
                        />
                        <NavIconLink
                            href="/tasks"
                            icon={Briefcase}
                            label="Tasks"
                            active={pathname?.startsWith('/tasks')}
                        />
                        <NavIconLink
                            href={interviewsHref}
                            icon={CalendarClock}
                            label="Interviews"
                            active={pathname?.includes('/interviews')}
                        />
                        <NavIconLink
                            href={profileHref}
                            icon={UserIcon}
                            label="Profile"
                            active={pathname?.includes('/profile')}
                        />
                        <button className="flex flex-col items-center justify-center px-3 h-full text-xs font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent">
                            <Bell className="h-5 w-5" />
                            <span className="mt-0.5">Alerts</span>
                        </button>

                        <div className="h-6 w-px bg-border mx-2" />

                        <DropdownMenu>
                            <DropdownMenuTrigger className="flex flex-col items-center justify-center px-2 h-full text-xs font-medium text-muted-foreground hover:text-foreground focus:outline-none">
                                <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-[10px]">
                                        {getInitials(userName)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="mt-0.5">Me ▾</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                                <DropdownMenuLabel className="normal-case tracking-normal">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-foreground">
                                                {userName}
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {user.email}
                                            </p>
                                        </div>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => router.push(dashboardHref)}>
                                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(profileHref)}>
                                    <UserIcon className="h-4 w-4" /> View profile
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push('/settings')}>
                                    <Settings className="h-4 w-4" /> Settings
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={handleLogout}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <LogOut className="h-4 w-4" /> Sign out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </nav>
                )}

                {/* Anonymous nav */}
                {!user && !loading && (
                    <>
                        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
                            <Link href="/#how-it-works" className="hover:text-foreground transition-colors">
                                How it works
                            </Link>
                            <Link href="/#for-students" className="hover:text-foreground transition-colors">
                                For students
                            </Link>
                            <Link href="/#for-companies" className="hover:text-foreground transition-colors">
                                For companies
                            </Link>
                            <Link href="/tasks" className="hover:text-foreground transition-colors">
                                Browse tasks
                            </Link>
                        </nav>
                        <div className="hidden md:flex items-center gap-2 ml-3">
                            <Button asChild variant="ghost" size="sm">
                                <Link href="/login">Sign in</Link>
                            </Button>
                            <Button asChild size="sm">
                                <Link href="/register">Join now</Link>
                            </Button>
                        </div>
                    </>
                )}

                {/* Mobile menu toggle */}
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="md:hidden ml-auto rounded-md p-2 text-foreground hover:bg-muted"
                    aria-label="Toggle menu"
                >
                    <Menu className="h-5 w-5" />
                </button>
            </div>

            {/* Mobile drawer */}
            {mobileOpen && (
                <div className="md:hidden border-t border-border bg-card">
                    <div className="px-4 py-3 space-y-1">
                        {user && !loading ? (
                            <>
                                <Link
                                    href={dashboardHref}
                                    onClick={() => setMobileOpen(false)}
                                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                                >
                                    <Home className="h-4 w-4" /> Home
                                </Link>
                                <Link
                                    href="/tasks"
                                    onClick={() => setMobileOpen(false)}
                                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                                >
                                    <Briefcase className="h-4 w-4" /> Tasks
                                </Link>
                                <Link
                                    href={interviewsHref}
                                    onClick={() => setMobileOpen(false)}
                                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                                >
                                    <CalendarClock className="h-4 w-4" /> Interviews
                                </Link>
                                <Link
                                    href={profileHref}
                                    onClick={() => setMobileOpen(false)}
                                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                                >
                                    <UserIcon className="h-4 w-4" /> Profile
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                                >
                                    <LogOut className="h-4 w-4" /> Sign out
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/#how-it-works"
                                    onClick={() => setMobileOpen(false)}
                                    className="block rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                                >
                                    How it works
                                </Link>
                                <Link
                                    href="/tasks"
                                    onClick={() => setMobileOpen(false)}
                                    className="block rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                                >
                                    Browse tasks
                                </Link>
                                <div className="pt-2 grid grid-cols-2 gap-2">
                                    <Button asChild variant="outline" size="sm" className="w-full">
                                        <Link href="/login">Sign in</Link>
                                    </Button>
                                    <Button asChild size="sm" className="w-full">
                                        <Link href="/register">Join now</Link>
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    )
}
