import { useEffect, useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { routes } from "wasp/client/router";
import { useAuth } from "wasp/client/auth";
import { Toaster } from "../components/ui/toaster";
import "./Main.css";
import i18nInstance from "./i18n";
import NavBar from "./components/NavBar/NavBar";
import {
  demoNavigationitems,
  marketingNavigationItems,
} from "./components/NavBar/constants";
import CookieConsentBanner from "./components/cookie-consent/Banner";

/**
 * use this component to wrap all child components
 * this is useful for templates, themes, and context
 */
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

  const isMarketingPage = useMemo(() => {
    return (
      location.pathname === "/" || location.pathname.startsWith("/pricing")
    );
  }, [location]);

  const navigationItems = isMarketingPage
    ? marketingNavigationItems
    : demoNavigationitems;

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
    <>
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
    </>
  );
}
