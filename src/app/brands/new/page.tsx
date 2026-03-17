import { Navbar } from '@/components/ui/Navbar';
import { OnboardingWizard } from './OnboardingWizard';

export default function NewBrandPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <OnboardingWizard />
      </main>
    </>
  );
}
