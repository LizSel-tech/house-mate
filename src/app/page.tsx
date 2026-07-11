import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSection from './components/HeroSection';
import ServicesSection from './components/ServicesSection';
import CredibilitySection from './components/CredibilitySection';
import HowItWorksSection from './components/HowItWorksSection';
import ContactSection from './components/ContactSection';

export const metadata: Metadata = {
  title: 'HandyPro — Trusted Local Handyman Services',
  description: 'HandyPro delivers reliable handyman services to local homeowners — from plumbing and carpentry to painting and repairs, all in one call.',
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