import type { PrismaClient } from "@prisma/client";
import type { SubscriptionStatus } from "../plans";
import type { PaymentPlanId } from "../plans";

export const updateUserLemonSqueezyPaymentDetails = async (
  {
    lemonSqueezyId,
    userId,
    subscriptionPlan,
    subscriptionStatus,
    datePaid,
    numOfCreditsPurchased,
    lemonSqueezyCustomerPortalUrl,
  }: {
    lemonSqueezyId: string;
    userId: string;
    subscriptionPlan?: PaymentPlanId;
    subscriptionStatus?: SubscriptionStatus;
    numOfCreditsPurchased?: number;
    lemonSqueezyCustomerPortalUrl?: string;
    datePaid?: Date;
  },
  prismaUserDelegate: PrismaClient["user"],
) => {
  const data: Record<string, any> = {
    paymentProcessorUserId: lemonSqueezyId,
  };

  if (lemonSqueezyCustomerPortalUrl !== undefined) {
    data["lemonSqueezyCustomerPortalUrl"] = lemonSqueezyCustomerPortalUrl;
  }
  if (subscriptionPlan !== undefined) {
    data["subscriptionPlan"] = subscriptionPlan;
  }
  if (subscriptionStatus !== undefined) {
    data["subscriptionStatus"] = subscriptionStatus;
  }
  if (datePaid !== undefined) {
    data["datePaid"] = datePaid;
  }
  if (numOfCreditsPurchased !== undefined) {
    data["credits"] = { increment: numOfCreditsPurchased };
  }

  return prismaUserDelegate.update({
    where: {
      id: userId,
    },
    data,
  });
};
