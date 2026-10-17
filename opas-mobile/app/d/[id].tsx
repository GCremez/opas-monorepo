import { Redirect, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

// Short link from the "your letter is ready" email: https://opas.app/d/<id> (as a
// universal link) or opas://d/<id>. The root layout only renders routes once auth
// has hydrated, so a signed-out user is reliably sent to sign in instead.
export default function DocumentLink() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  return <Redirect href={`/document/${id}`} />;
}
