import { HeroSection } from "@/features/landing/hero-section";
import { HowItWorks } from "@/features/landing/how-it-works";
import { FeaturesSection } from "@/features/landing/features-section";
import { ProtocolStats } from "@/features/landing/protocol-stats";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <HowItWorks />
      <ProtocolStats />
      <FeaturesSection />
    </>
  );
}
