import { LayoutDashboard, Mail, Settings, Shield } from "lucide-react";
import { routes } from "wasp/client/router";

export const userMenuItems = [
  {
    name: "Coach Dashboard",
    to: routes.CoachDashboardRoute.to,
    icon: LayoutDashboard,
    isAdminOnly: false,
    isAuthRequired: true,
  },
  {
    name: "Account Settings",
    to: routes.AccountRoute.to,
    icon: Settings,
    isAuthRequired: false,
    isAdminOnly: false,
  },
  {
    name: "Contact Admin",
    to: routes.ContactAdminRoute.to,
    icon: Mail,
    isAuthRequired: true,
    isAdminOnly: false,
  },
  {
    name: "Admin Dashboard",
    to: routes.AdminRoute.to,
    icon: Shield,
    isAuthRequired: false,
    isAdminOnly: true,
  },
] as const;
