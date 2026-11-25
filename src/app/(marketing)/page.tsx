import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FinalCtaSection } from "@/components/landing/final-cta-section";

export default function LandingPage() {
  return (
    <main className="editorial-root animate-page-enter">
      {/* 1. Hero Section with Static Interview Preview Card */}
      <HeroSection />

      {/* 2. Three-Step How It Works Section */}
      <HowItWorks />

      {/* 3. Final Closing CTA */}
      <FinalCtaSection />
    </main>
  );
}
