import { Redirect } from 'expo-router';

// The welcome pitch now lives in onboarding, which opens on its last slide (with
// "Create free account" and "I already have an account") for people who have seen it.
// Kept as a redirect so old links and deep links still land somewhere sensible.
export default function WelcomeScreen() {
  return <Redirect href="/(onboarding)" />;
}
