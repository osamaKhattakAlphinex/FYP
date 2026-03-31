import Navbar from '@/components/shared/Navbar'
import HeroSection from '@/components/shared/HeroSection'
import TrustBar from '@/components/shared/TrustBar'
import HowItWorksSection from '@/components/shared/HowItWorksSection'
import ForStudentsCompaniesSection from '@/components/shared/ForStudentsCompaniesSection'
import StatsSection from '@/components/shared/StatsSection'
import TestimonialsSection from '@/components/shared/TestimonialsSection'
import CTABanner from '@/components/shared/CTABanner'
import Footer from '@/components/shared/Footer'

export default function Home() {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />
            <HeroSection />
            <TrustBar />
            <HowItWorksSection />
            <ForStudentsCompaniesSection />
            <StatsSection />
            <TestimonialsSection />
            <CTABanner />
            <Footer />
        </div>
    )
}