import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { Button } from "../../components/ui/button";
import { Users, UserCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function PersonaCallouts() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto my-16 max-w-7xl px-4 sm:px-6 lg:my-24 lg:px-8">
      <div className="grid gap-8 md:grid-cols-2">
        {/* Coach CTA */}
        <div className="relative overflow-hidden rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 p-8 transition-all duration-300 hover:shadow-lg dark:border-amber-900/20 dark:from-amber-950/30 dark:to-amber-900/20">
          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-amber-300/20" />
          <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-amber-200/20" />

          <div className="relative z-10">
            <div className="mb-4 inline-flex rounded-lg bg-amber-200/30 p-3 dark:bg-amber-900/30">
              <UserCheck className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>

            <h3 className="mb-2 text-2xl font-bold text-amber-950 dark:text-amber-50">
              {t("landing.personas.coach.title")}
            </h3>

            <p className="mb-6 text-sm text-amber-900/70 dark:text-amber-200/70">
              {t("landing.personas.coach.description")}
            </p>

            <ul className="mb-8 space-y-2 text-sm text-amber-900/60 dark:text-amber-200/60">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 dark:bg-amber-600" />
                {t("landing.personas.coach.feature1")}
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 dark:bg-amber-600" />
                {t("landing.personas.coach.feature2")}
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 dark:bg-amber-600" />
                {t("landing.personas.coach.feature3")}
              </li>
            </ul>

            <Button size="lg" className="w-full bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800" asChild>
              <WaspRouterLink to={routes.SignupRoute.to}>
                {t("landing.personas.coach.cta")}
                <span aria-hidden="true"> →</span>
              </WaspRouterLink>
            </Button>
          </div>
        </div>

        {/* Client CTA */}
        <div className="relative overflow-hidden rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 p-8 transition-all duration-300 hover:shadow-lg dark:border-purple-900/20 dark:from-purple-950/30 dark:to-purple-900/20">
          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-purple-300/20" />
          <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-purple-200/20" />

          <div className="relative z-10">
            <div className="mb-4 inline-flex rounded-lg bg-purple-200/30 p-3 dark:bg-purple-900/30">
              <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>

            <h3 className="mb-2 text-2xl font-bold text-purple-950 dark:text-purple-50">
              {t("landing.personas.client.title")}
            </h3>

            <p className="mb-6 text-sm text-purple-900/70 dark:text-purple-200/70">
              {t("landing.personas.client.description")}
            </p>

            <ul className="mb-8 space-y-2 text-sm text-purple-900/60 dark:text-purple-200/60">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400 dark:bg-purple-600" />
                {t("landing.personas.client.feature1")}
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400 dark:bg-purple-600" />
                {t("landing.personas.client.feature2")}
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400 dark:bg-purple-600" />
                {t("landing.personas.client.feature3")}
              </li>
            </ul>

            <Button size="lg" className="w-full bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800" asChild>
              <WaspRouterLink to={routes.SignupRoute.to}>
                {t("landing.personas.client.cta")}
                <span aria-hidden="true"> →</span>
              </WaspRouterLink>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
