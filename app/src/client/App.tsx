import { useEffect, useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { routes } from "wasp/client/router";
import { useAuth } from "wasp/client/auth";
import { createSomaticLog } from "wasp/client/operations";
import { Toaster } from "../components/ui/toaster";
import "./Main.css";
import i18nInstance from "./i18n";
import NavBar from "./components/NavBar/NavBar";
import {
  marketingNavigationItems,
  getNavigationItemsForUser,
} from "./components/NavBar/constants";
import CookieConsentBanner from "./components/cookie-consent/Banner";

/**
 * use this component to wrap all child components
 * this is useful for templates, themes, and context
 */
import { ErrorBoundary } from "react-error-boundary";

function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-6 text-center">
      <div className="max-w-md space-y-4">
        <h2 className="text-2xl font-serif font-bold text-destructive">
          Something went wrong
        </h2>
        <p className="text-muted-foreground">
          We apologize for the inconvenience. The application encountered an
          unexpected error.
        </p>
        <pre className="bg-muted p-4 rounded text-xs text-left overflow-auto max-h-40">
          {error.message}
        </pre>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const { data: user } = useAuth();

  // Initialize i18n with user's preferred language
  useEffect(() => {
    if (user?.preferredLanguage) {
      i18nInstance.changeLanguage(user.preferredLanguage);
      const dir = user.preferredLanguage === "he" ? "rtl" : "ltr";
      document.documentElement.dir = dir;
      document.documentElement.lang = user.preferredLanguage;
    } else {
      // Default to Hebrew if no preference
      i18nInstance.changeLanguage("he");
      document.documentElement.dir = "rtl";
      document.documentElement.lang = "he";
    }
  }, [user?.preferredLanguage]);

  // Update document direction when language changes
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      const dir = lng === "he" ? "rtl" : "ltr";
      document.documentElement.dir = dir;
      document.documentElement.lang = lng;
    };

    i18nInstance.on("languageChanged", handleLanguageChanged);

    return () => {
      i18nInstance.off("languageChanged", handleLanguageChanged);
    };
  }, []);

  // Handle pending somatic log from landing page sessionStorage
  // This runs after user authenticates (user changes from null to authenticated)
  useEffect(() => {
    if (!user) return;

    const pendingLog = sessionStorage.getItem("pending_somatic_log");
    if (!pendingLog) return;

    try {
      const { zone, sensation, timestamp } = JSON.parse(pendingLog);

      // Save to database
      createSomaticLog({
        bodyZone: zone,
        sensation,
        intensity: 5, // Default intensity for landing page saves
        note: `Saved from landing page on ${new Date(
          timestamp,
        ).toLocaleString()}`,
        sharedWithCoach: true,
      })
        .then(() => {
          sessionStorage.removeItem("pending_somatic_log");
          console.log("Somatic log saved successfully");
        })
        .catch((error) => {
          console.error("Failed to save somatic log:", error);
        });
    } catch (error) {
      console.error("Failed to parse pending somatic log:", error);
      sessionStorage.removeItem("pending_somatic_log");
    }
  }, [user]);

  const isMarketingPage = useMemo(() => {
    return (
      location.pathname === "/" || location.pathname.startsWith("/pricing")
    );
  }, [location]);

  const navigationItems = isMarketingPage
    ? marketingNavigationItems
    : getNavigationItemsForUser(user || undefined);

  const shouldDisplayAppNavBar = useMemo(() => {
    return (
      location.pathname !== routes.LoginRoute.build() &&
      location.pathname !== routes.SignupRoute.build()
    );
  }, [location]);

  const isAdminDashboard = useMemo(() => {
    return location.pathname.startsWith("/admin");
  }, [location]);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView();
      }
    }
  }, [location]);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => window.location.reload()}
    >
      <div className="bg-background text-foreground min-h-screen">
        {isAdminDashboard ? (
          <Outlet />
        ) : (
          <>
            {shouldDisplayAppNavBar && (
              <NavBar navigationItems={navigationItems} />
            )}
            <div className="mx-auto max-w-screen-2xl">
              <Outlet />
            </div>
          </>
        )}
      </div>
      <Toaster position="bottom-right" />
      <CookieConsentBanner />
    </ErrorBoundary>
  );
}
