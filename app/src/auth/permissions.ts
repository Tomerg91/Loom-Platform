import type { User } from "wasp/entities";
import { PaymentPlanId } from "../payment/plans";

// ============================================
// PERMISSION CONSTANTS
// ============================================

export const CLIENT_LIMITS = {
  [PaymentPlanId.Starter]: 5,
  [PaymentPlanId.Pro]: Infinity,
  [PaymentPlanId.Clinic]: Infinity,
  // Default fallback
  default: 5,
};

export const HISTORY_RETENTION_DAYS = {
  [PaymentPlanId.Starter]: 7,
  [PaymentPlanId.Pro]: Infinity,
  [PaymentPlanId.Clinic]: Infinity,
  // Default fallback
  default: 7,
};

// ============================================
// HELPER FUNCTIONS (Server & Client)
// ============================================

/**
 * Returns the maximum number of clients a user is allowed to have.
 */
export function getMaxClients(user: User | null): number {
  if (!user || !user.subscriptionPlan) {
    return CLIENT_LIMITS.default;
  }

  // Normalize plan string to lowercase just in case
  const plan = user.subscriptionPlan.toLowerCase();

  if (plan === PaymentPlanId.Starter)
    return CLIENT_LIMITS[PaymentPlanId.Starter];
  if (plan === PaymentPlanId.Pro) return CLIENT_LIMITS[PaymentPlanId.Pro];
  if (plan === PaymentPlanId.Clinic) return CLIENT_LIMITS[PaymentPlanId.Clinic];

  // If user has some legacy plan or unknown plan, fallback to default
  return CLIENT_LIMITS.default;
}

/**
 * Returns the number of days of history a user can access.
 * Infinity means unlimited.
 */
export function getHistoryRetentionDays(user: User | null): number {
  if (!user || !user.subscriptionPlan) {
    return HISTORY_RETENTION_DAYS.default;
  }

  const plan = user.subscriptionPlan.toLowerCase();

  if (plan === PaymentPlanId.Starter)
    return HISTORY_RETENTION_DAYS[PaymentPlanId.Starter];
  if (plan === PaymentPlanId.Pro)
    return HISTORY_RETENTION_DAYS[PaymentPlanId.Pro];
  if (plan === PaymentPlanId.Clinic)
    return HISTORY_RETENTION_DAYS[PaymentPlanId.Clinic];

  return HISTORY_RETENTION_DAYS.default;
}

/**
 * Checks if the user is allowed to invite other coaches (Clinic tier feature).
 */
export function canInviteCoaches(user: User | null): boolean {
  if (!user || !user.subscriptionPlan) return false;
  return user.subscriptionPlan.toLowerCase() === PaymentPlanId.Clinic;
}

/**
 * Checks if the user is allowed to access advanced analytics (Pro & Clinic).
 */
export function canAccessAdvancedAnalytics(user: User | null): boolean {
  if (!user || !user.subscriptionPlan) return false;
  const plan = user.subscriptionPlan.toLowerCase();
  return plan === PaymentPlanId.Pro || plan === PaymentPlanId.Clinic;
}

// ============================================
// REACT HOOK (Client Only)
// ============================================
// Note: We can't use 'wasp/client/auth' here directly if this file is shared with server.
// Instead, we'll export a hook that expects the user object to be passed in,
// or the consumer can just use the helper functions directly with the user object from useAuth().

export function usePermissions(user: User | null) {
  return {
    maxClients: getMaxClients(user),
    historyRetentionDays: getHistoryRetentionDays(user),
    canInviteCoaches: canInviteCoaches(user),
    canAccessAdvancedAnalytics: canAccessAdvancedAnalytics(user),
    isClinic: user?.subscriptionPlan === PaymentPlanId.Clinic,
    isPro: user?.subscriptionPlan === PaymentPlanId.Pro,
    isStarter: user?.subscriptionPlan === PaymentPlanId.Starter,
  };
}
