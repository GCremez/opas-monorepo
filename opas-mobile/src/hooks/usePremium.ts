import { useAuthStore } from '../store/authStore';

export function usePremium() {
  const plan = useAuthStore((s) => s.plan);
  const premiumByPlan = plan === 'premium';
  return {
    isPremium: premiumByPlan,
    isFree: plan === 'free',
    plan,
  };
}
