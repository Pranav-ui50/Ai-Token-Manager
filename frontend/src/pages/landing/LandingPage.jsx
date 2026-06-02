/**
 * Landing Page
 *
 * Complete landing page combining all sections.
 * Default entry point for unauthenticated users.
 */

import Navbar from './components/Navbar.jsx';
import HeroSection from './components/HeroSection.jsx';
import FeaturesSection from './components/FeaturesSection.jsx';
import PricingSection from './components/PricingSection.jsx';
import AnalyticsSection from './components/AnalyticsSection.jsx';
import ProvidersSection from './components/ProvidersSection.jsx';
import HowItWorksSection from './components/HowItWorksSection.jsx';
import TestimonialsSection from './components/TestimonialsSection.jsx';
import FAQSection from './components/FAQSection.jsx';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <Navbar />

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <HeroSection />

        {/* Features Section */}
        <div id="features">
          <FeaturesSection />
        </div>

        {/* Analytics Section */}
        <AnalyticsSection />

        {/* Pricing Section */}
        <div id="pricing">
          <PricingSection />
        </div>

        {/* Providers Section */}
        <ProvidersSection />

        {/* How It Works Section */}
        <HowItWorksSection />

        {/* Testimonials Section */}
        <TestimonialsSection />

        {/* FAQ Section */}
        <FAQSection />
      </main>
    </div>
  );
};

export default LandingPage;