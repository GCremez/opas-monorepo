import { useAuthStore } from '../store/authStore';

export function usePremium() {
  const plan = useAuthStore((s) => s.plan);
  const isDemo = useAuthStore((s) => s.isDemo);
  const premiumByPlan = plan === 'premium';
  return {
    isPremium: isDemo || premiumByPlan,
    isFree: !isDemo && plan === 'free',
    plan,
  };
}
