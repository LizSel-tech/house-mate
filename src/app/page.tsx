import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSection from './components/HeroSection';
import ServicesSection from './components/ServicesSection';
import CredibilitySection from './components/CredibilitySection';
import HowItWorksSection from './components/HowItWorksSection';
import ContactSection from './components/ContactSection';

export const metadata: Metadata = {
  title: 'Craftviva — Verified service providers across Ghana',
  description:
    'Craftviva connects households with verified service providers — book jobs, pay into escrow, and confirm when work is done.',
};

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <ServicesSection />
        <CredibilitySection />
        <HowItWorksSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}