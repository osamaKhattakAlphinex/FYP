// This file will work properly after running: npm install
// Current errors are expected until dependencies are installed

import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import ToastProvider from '@/components/shared/ToastProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
    title: 'NexIntern - Your First Step Into the Real World',
    description: 'AI-powered micro-internship platform connecting students with companies through skill-based tasks',
}

interface LayoutProps {
    children: React.ReactNode
}

export default function RootLayout({ children }: LayoutProps) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <AuthProvider>
                    <ToastProvider />
                    {children}
                </AuthProvider>
            </body>
        </html>
    )
}