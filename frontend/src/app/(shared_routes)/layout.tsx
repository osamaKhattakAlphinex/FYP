import Navbar from '@/components/shared/Navbar'
import AppFooter from '@/components/shared/AppFooter'

export default function SharedRoutesLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <Navbar />
            <div className="flex-1">{children}</div>
            <AppFooter />
        </div>
    )
}
