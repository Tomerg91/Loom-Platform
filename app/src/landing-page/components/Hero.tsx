import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { Button } from "../../components/ui/button";
import BodyMapSelector from "../../client/components/BodyMapSelector";
import { useTranslation } from "react-i18next";

export default function Hero() {
  const { t } = useTranslation();

  return (
    <div className="relative w-full pt-14 overflow-hidden grain">
      <TopGradient />
      <BottomGradient />
      <div className="md:p-24">
        <div className="max-w-8xl mx-auto px-6 lg:px-8">
          <div className="lg:mb-18 mx-auto max-w-3xl text-center reveal-stagger">
            <h1 className="text-foreground text-5xl font-display font-bold sm:text-6xl leading-tight">
              {t("landing.hero.mainTitle")}
            </h1>
            <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg leading-8 font-body">
              {t("landing.hero.mainSubtitle")}
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button size="lg" variant="outline" asChild className="hover-lift">
                <WaspRouterLink to={routes.PricingPageRoute.to}>
                  {t("landing.hero.seePricingBtn")}
                </WaspRouterLink>
              </Button>
              <Button size="lg" variant="default" asChild className="hover-lift">
                <WaspRouterLink to={routes.SignupRoute.to}>
                  {t("landing.hero.startTrialBtn")} <span aria-hidden="true">→</span>
                </WaspRouterLink>
              </Button>
            </div>
          </div>
          <div className="mt-14 flow-root sm:mt-14">
            <div className="m-2 hidden justify-center rounded-2xl md:flex lg:-m-4 lg:rounded-3xl lg:p-4 reveal" style={{ animationDelay: '0.4s' }}>
              <div className="w-full max-w-2xl p-8 bg-card rounded-2xl shadow-lg ring-1 ring-border hover-scale-subtle">
                <BodyMapSelector
                  mode="readonly"
                  highlightedZones={[
                    { zone: "CHEST", intensity: 9 },
                    { zone: "ARMS", intensity: 6 },
                    { zone: "THROAT", intensity: 5 },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopGradient() {
  return (
    <div
      className="absolute right-0 top-0 -z-10 w-full transform-gpu overflow-hidden blur-3xl sm:top-0"
      aria-hidden="true"
    >
      <div
        className="aspect-[1020/880] w-[70rem] flex-none bg-gradient-to-tr from-primary to-accent opacity-[0.08] sm:right-1/4 sm:translate-x-1/2 dark:opacity-[0.06]"
        style={{
          clipPath:
            "polygon(80% 20%, 90% 55%, 50% 100%, 70% 30%, 20% 50%, 50% 0)",
        }}
      />
    </div>
  );
}

function BottomGradient() {
  return (
    <div
      className="absolute inset-x-0 top-[calc(100%-40rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-65rem)]"
      aria-hidden="true"
    >
      <div
        className="relative aspect-[1020/880] w-[90rem] bg-gradient-to-br from-primary via-secondary to-accent opacity-[0.05] sm:-left-3/4 sm:translate-x-1/4 dark:opacity-[0.04]"
        style={{
          clipPath: "ellipse(80% 30% at 80% 50%)",
        }}
      />
    </div>
  );
}
