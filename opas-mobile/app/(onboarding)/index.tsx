import { OnboardingFlow } from '../../src/components/onboarding/OnboardingFlow';

// The front door for anyone signed out. The slides live in OnboardingFlow so the same
// story can be replayed as a tour from Home (app/tour.tsx).
export default function OnboardingScreen() {
  return <OnboardingFlow />;
}
