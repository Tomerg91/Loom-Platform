import { CheckCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "wasp/client/auth";
import {
  generateCheckoutSession,
  getCustomerPortalUrl,
  useQuery,
} from "wasp/client/operations";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardTitle,
} from "../components/ui/card";
import { cn } from "../lib/utils";
import {
  PaymentPlanId,
  paymentPlans,
  prettyPaymentPlanName,
  SubscriptionStatus,
} from "./plans";

const bestDealPaymentPlanId: PaymentPlanId = PaymentPlanId.Pro;

interface PaymentPlanCard {
  name: string;
  price: string;
  description: string;
  features: string[];
}

const getPricingPageCards = (): Record<PaymentPlanId, PaymentPlanCard> => ({
  [PaymentPlanId.Starter]: {
    name: prettyPaymentPlanName(PaymentPlanId.Starter),
    price: "₪99",
    description: "The Digital Journal",
    features: [
      "Unlimited somatic logs",
      "7-day history retention",
      "Up to 5 clients",
    ],
  },
  [PaymentPlanId.Pro]: {
    name: prettyPaymentPlanName(PaymentPlanId.Pro),
    price: "₪169",
    description: "The Somatic Explorer",
    features: ["Unlimited history", "Unlimited clients", "Advanced Analytics"],
  },
  [PaymentPlanId.Clinic]: {
    name: prettyPaymentPlanName(PaymentPlanId.Clinic),
    price: "₪399",
    description: "The Anchor",
    features: [
      "Everything in Pro",
      "Invite up to 5 coaches",
      "Clinic Dashboard",
    ],
  },
  [PaymentPlanId.Credits10]: {
    name: prettyPaymentPlanName(PaymentPlanId.Credits10),
    price: "₪39",
    description: "One-time purchase of 10 credits for your account",
    features: ["Use credits for AI features", "No expiration date"],
  },
});

export const paymentPlanCards: Record<PaymentPlanId, PaymentPlanCard> = {
  [PaymentPlanId.Starter]: {
    name: prettyPaymentPlanName(PaymentPlanId.Starter),
    price: "₪99",
    description: "The Digital Journal",
    features: ["Unlimited somatic logs", "7-day history", "Up to 5 clients"],
  },
  [PaymentPlanId.Pro]: {
    name: prettyPaymentPlanName(PaymentPlanId.Pro),
    price: "₪169",
    description: "The Somatic Explorer",
    features: ["Unlimited history", "Unlimited clients", "Advanced Analytics"],
  },
  [PaymentPlanId.Clinic]: {
    name: prettyPaymentPlanName(PaymentPlanId.Clinic),
    price: "₪399",
    description: "The Anchor",
    features: [
      "Everything in Pro",
      "Invite up to 5 coaches",
      "Clinic Dashboard",
    ],
  },
  [PaymentPlanId.Credits10]: {
    name: prettyPaymentPlanName(PaymentPlanId.Credits10),
    price: "₪39",
    description: "One-time purchase of 10 credits for your account",
    features: ["Use credits for AI features", "No expiration date"],
  },
};

const PricingPage = () => {
  const { t } = useTranslation();
  const [isPaymentLoading, setIsPaymentLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pricingCards = getPricingPageCards();

  const { data: user } = useAuth();
  const isUserSubscribed =
    !!user &&
    !!user.subscriptionStatus &&
    user.subscriptionStatus !== SubscriptionStatus.Deleted;

  const {
    data: customerPortalUrl,
    isLoading: isCustomerPortalUrlLoading,
    error: customerPortalUrlError,
  } = useQuery(getCustomerPortalUrl, { enabled: isUserSubscribed });

  const navigate = useNavigate();

  async function handleBuyNowClick(paymentPlanId: PaymentPlanId) {
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      setIsPaymentLoading(true);

      const checkoutResults = await generateCheckoutSession(paymentPlanId);

      if (checkoutResults?.sessionUrl) {
        window.open(checkoutResults.sessionUrl, "_self");
      } else {
        throw new Error("Error generating checkout session URL");
      }
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Error processing payment. Please try again later.");
      }
      setIsPaymentLoading(false); // We only set this to false here and not in the try block because we redirect to the checkout url within the same window
    }
  }

  const handleCustomerPortalClick = () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (customerPortalUrlError) {
      setErrorMessage("Error fetching Customer Portal URL");
      return;
    }

    if (!customerPortalUrl) {
      setErrorMessage(`Customer Portal does not exist for user ${user.id}`);
      return;
    }

    window.open(customerPortalUrl, "_blank");
  };

  return (
    <div className="py-10 lg:mt-10">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div id="pricing" className="mx-auto max-w-4xl text-center">
          <h2 className="text-foreground mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            {t("pricing.title")}
          </h2>
        </div>
        {errorMessage && (
          <Alert variant="destructive" className="mt-8">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8">
          {Object.values(PaymentPlanId).map((planId) => (
            <Card
              key={planId}
              className={cn(
                "relative flex grow flex-col justify-between overflow-hidden transition-all duration-300 hover:shadow-lg",
                {
                  "ring-primary !bg-transparent ring-2":
                    planId === bestDealPaymentPlanId,
                  "ring-border ring-1 lg:my-8":
                    planId !== bestDealPaymentPlanId,
                },
              )}
            >
              {planId === bestDealPaymentPlanId && (
                <div
                  className="absolute right-0 top-0 -z-10 h-full w-full transform-gpu blur-3xl"
                  aria-hidden="true"
                >
                  <div
                    className="from-primary/40 via-primary/20 to-primary/10 absolute h-full w-full bg-gradient-to-br opacity-30"
                    style={{
                      clipPath: "circle(670% at 50% 50%)",
                    }}
                  />
                </div>
              )}
              <CardContent className="h-full justify-between p-8 xl:p-10">
                <div className="flex items-center justify-between gap-x-4">
                  <CardTitle
                    id={planId}
                    className="text-foreground text-lg font-semibold leading-8"
                  >
                    {pricingCards[planId].name}
                  </CardTitle>
                </div>
                <p className="text-muted-foreground mt-4 text-sm leading-6">
                  {pricingCards[planId].description}
                </p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-foreground text-4xl font-bold tracking-tight">
                    {pricingCards[planId].price}
                  </span>
                  <span className="text-muted-foreground text-sm font-semibold leading-6">
                    {paymentPlans[planId].effect.kind === "subscription" &&
                      "/month"}
                  </span>
                </p>
                <ul className="text-muted-foreground mt-8 space-y-3 text-sm leading-6">
                  {pricingCards[planId].features.map((feature) => (
                    <li key={feature} className="flex gap-x-3">
                      <CheckCircle
                        className="text-primary h-5 w-5 flex-none"
                        aria-hidden="true"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {isUserSubscribed ? (
                  <Button
                    onClick={handleCustomerPortalClick}
                    disabled={isCustomerPortalUrlLoading}
                    aria-describedby="manage-subscription"
                    variant={
                      planId === bestDealPaymentPlanId ? "default" : "outline"
                    }
                    className="w-full"
                  >
                    {t("pricing.manageSubscription")}
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleBuyNowClick(planId)}
                    aria-describedby={planId}
                    variant={
                      planId === bestDealPaymentPlanId ? "default" : "outline"
                    }
                    className="w-full"
                    disabled={isPaymentLoading}
                  >
                    {user ? t("pricing.buyPlan") : t("pricing.loginToBuyPlan")}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
      <div className="mx-auto mt-24 max-w-4xl divide-y divide-gray-900/10">
        <h2 className="text-2xl font-bold leading-10 tracking-tight text-foreground">
          Frequently asked questions
        </h2>
        <dl className="mt-10 space-y-6 divide-y divide-gray-900/10">
          <div className="pt-6">
            <dt>
              <button className="flex w-full items-start justify-between text-left text-foreground">
                <span className="text-base font-semibold leading-7">
                  Can I switch plans later?
                </span>
              </button>
            </dt>
            <dd className="mt-2 pr-12">
              <p className="text-base leading-7 text-muted-foreground">
                Yes, you can upgrade or downgrade your plan at any time. Changes
                take effect immediately, and we&apos;ll prorate the difference.
              </p>
            </dd>
          </div>
          <div className="pt-6">
            <dt>
              <button className="flex w-full items-start justify-between text-left text-foreground">
                <span className="text-base font-semibold leading-7">
                  What happens to my data if I downgrade?
                </span>
              </button>
            </dt>
            <dd className="mt-2 pr-12">
              <p className="text-base leading-7 text-muted-foreground">
                If you downgrade to the Starter plan, you will only be able to
                view the last 7 days of history. However, your older data is
                safely stored and will become accessible again if you upgrade
                back to Pro.
              </p>
            </dd>
          </div>
          <div className="pt-6">
            <dt>
              <button className="flex w-full items-start justify-between text-left text-foreground">
                <span className="text-base font-semibold leading-7">
                  How does the Clinic plan work?
                </span>
              </button>
            </dt>
            <dd className="mt-2 pr-12">
              <p className="text-base leading-7 text-muted-foreground">
                The Clinic plan allows you to invite up to 5 other coaches to
                your organization. You get a centralized dashboard to view
                analytics across your entire clinic.
              </p>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
};

export default PricingPage;
