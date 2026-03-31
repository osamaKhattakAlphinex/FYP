"use client";

import { useRouter } from 'next/navigation';
import { LogOut, Bell, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function DashboardHeader() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Logged out successfully');
            router.push('/');
        } catch (error) {
            toast.error('Failed to logout');
        }
    };

    const getUserName = () => {
        if (user?.firstName && user?.lastName) {
            return `${user.firstName} ${user.lastName}`;
        }
        if (user?.firstName) return user.firstName;
        if (user?.companyName) return user.companyName;
        return user?.email?.split('@')[0] || 'User';
    };

    const getInitials = () => {
        const name = getUserName();
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-white transform rotate-45"></div>
                        </div>
                        <span className="text-xl font-bold">
                            <span className="text-indigo-600">Nex</span>
                            <span className="text-slate-900">Intern</span>
                        </span>
                    </div>

                    {/* Right Side Actions */}
                    <div className="flex items-center space-x-4">
                        {/* Notifications */}
                        <button className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                        </button>

                        {/* Settings */}
                        <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            <Settings className="w-5 h-5" />
                        </button>

                        {/* User Info */}
                        <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
                            <div className="hidden sm:block text-right">
                                <p className="text-sm font-semibold text-slate-900">{getUserName()}</p>
                                <p className="text-xs text-slate-500">{user?.role}</p>
                            </div>
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                {getInitials()}
                            </div>
                        </div>

                        {/* Logout Button */}
                        <button
                            onClick={handleLogout}
                            className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="hidden md:inline text-sm font-medium">Logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
