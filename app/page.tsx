import HeroSection from "@/components/landingPage/hero-section-3";
// import Features from "@/components/landingPage/features-3";
import Content from "@/components/landingPage/content-3";
// import Stats from "@/components/landingPage/stats-2";
// import Testimonials from "@/components/landingPage/testimonials-1";
// import Pricing from "@/components/landingPage/pricing-1";
import FAQs from "@/components/landingPage/faqs-3";
import CallToAction from "@/components/landingPage/call-to-action-4";
// import Footer from "@/components/landingPage/footer-5";
import FeaturesSection from "@/components/landingPage/features-six";
import HowItWorks from "@/components/landingPage/how-it-works";
import ComingSoon from "@/components/landingPage/coming-soon";

export default function Page() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <HowItWorks />
      <Content />
      <FAQs />
      <CallToAction />
      <ComingSoon />
    </>
  );
}
