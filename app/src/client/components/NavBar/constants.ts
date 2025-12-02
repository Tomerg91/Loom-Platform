import { routes } from "wasp/client/router";
import { BlogUrl, DocsUrl } from "../../../shared/common";
import type { NavigationItem } from "./NavBar";
import type { User } from "wasp/entities";

const staticNavigationItems: NavigationItem[] = [
  { name: "Documentation", to: DocsUrl },
  { name: "Blog", to: BlogUrl },
];

export const marketingNavigationItems: NavigationItem[] = [
  { name: "Features", to: "/#features" },
  { name: "Pricing", to: routes.PricingPageRoute.to },
  ...staticNavigationItems,
] as const;

export const coachNavigationItems: NavigationItem[] = [
  { name: "Coach Dashboard", to: routes.CoachDashboardRoute.to },
  { name: "Resources", to: routes.CoachResourcesRoute.to },
  { name: "File Upload", to: routes.FileUploadRoute.to },
  { name: "Contact Admin", to: routes.ContactAdminRoute.to },
  ...staticNavigationItems,
] as const;

export const clientNavigationItems: NavigationItem[] = [
  { name: "Client Dashboard", to: routes.ClientDashboardRoute.to },
  { name: "Resources", to: routes.ClientResourcesRoute.to },
  { name: "Contact Admin", to: routes.ContactAdminRoute.to },
  ...staticNavigationItems,
] as const;

// Default to coach navigation for backwards compatibility
export const demoNavigationitems: NavigationItem[] = coachNavigationItems;

/**
 * Get navigation items based on user's role
 */
export function getNavigationItemsForUser(user: User | undefined): NavigationItem[] {
  if (!user) {
    return demoNavigationitems;
  }

  // Check if user has a coach profile (using type assertion to access the relation)
  const userWithProfiles = user as any;
  if (userWithProfiles.coachProfile) {
    return coachNavigationItems;
  }

  // Check if user has a client profile
  if (userWithProfiles.clientProfile) {
    return clientNavigationItems;
  }

  // Default to coach items if no profile found
  return coachNavigationItems;
}
