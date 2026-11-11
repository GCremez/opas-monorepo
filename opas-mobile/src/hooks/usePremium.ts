import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import type { UsageResponse } from '../api/usage';

/** Deadline reminders are Premium; the server can turn them on for everyone (beta). */
export function canRemind(plan: string, usage: UsageResponse | null): boolean {
  return plan === 'premium' || usage?.remindersIncluded === true;
}

export function usePremium() {
  const plan = useAuthStore((s) => s.plan);
  const usage = useSubscriptionStore((s) => s.usage);
  const fetchUsage = useSubscriptionStore((s) => s.fetchUsage);
  const premiumByPlan = plan === 'premium';

  // The server decides whether drafts are included (Premium, or everyone during the
  // beta), so load it once if nothing has yet.
  useEffect(() => {
    if (!usage) fetchUsage();
  }, [usage, fetchUsage]);

  return {
    isPremium: premiumByPlan,
    isFree: plan === 'free',
    plan,
    /** Can generate reply drafts: Premium, or drafts are free for everyone (beta). */
    canDraft: premiumByPlan || usage?.draftsIncluded === true,
    /** Gets deadline reminders: Premium, or reminders are on for everyone (beta). */
    canRemind: canRemind(plan, usage),
  };
}
