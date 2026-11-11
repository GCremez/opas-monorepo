import { OnboardingFlow } from '../src/components/onboarding/OnboardingFlow';

// Home → "See how Opas works": the onboarding slides as a tour for signed-in people,
// with Close and Done instead of the sign-up buttons.
export default function TourScreen() {
  return <OnboardingFlow replay />;
}
