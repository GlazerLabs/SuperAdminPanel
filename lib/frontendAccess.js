"use client";

export const SUPER_ADMIN_MODULE_NAV = {
  super_dashboard: { label: "Dashboard", href: "/", icon: "grid" },
  super_member: { label: "Members", href: "/members", icon: "org", matchPrefix: true },
  super_role_manage: {
    label: "Role Management",
    href: "/roles",
    icon: "shield",
    matchPrefix: true,
  },
  super_tournament: { label: "Tournaments", href: "/tournaments", icon: "trophy" },
  super_lead_tracking: {
    label: "Lead Tracking",
    href: "/leads",
    icon: "activity",
    matchPrefix: true,
  },
  // super_app_analytics: {
  //   label: "App Analytics",
  //   href: "/app-analytics",
  //   icon: "analytics",
  //   matchPrefix: true,
  //   children: [
  //     {
  //       label: "User Details",
  //       href: "/app-analytics/user-details/dau",
  //       icon: "users",
  //       matchPrefix: true,
  //     },
  //     {
  //       label: "Install",
  //       href: "/app-analytics/installs",
  //       icon: "download",
  //       matchPrefix: true,
  //     },
  //     {
  //       label: "Link Creation",
  //       href: "/app-analytics/link-creation",
  //       icon: "link",
  //       matchPrefix: true,
  //     },
  //     {
  //       label: "All Events",
  //       href: "/app-analytics/events",
  //       icon: "events",
  //       matchPrefix: true,
  //     },
  //   ],
  // },
  super_activity_log: { label: "Activity Logs", href: "/tracking", icon: "logs" },
};

export const SUPER_ADMIN_SECONDARY_MODULE_NAV = {
  super_setting: { label: "Settings", href: "/settings", icon: "settings" },
  super_help_center: {
    label: "Help & Support",
    href: "/help",
    icon: "help",
    matchPrefix: true,
    children: [
      { label: "Tickets", href: "/help", icon: "ticket", matchPrefix: false },
      { label: "FAQ", href: "/help/faq", icon: "faq", matchPrefix: true },
    ],
  },
};

export const MODULE_ROUTE_ORDER = Object.keys(SUPER_ADMIN_MODULE_NAV);

export const MODULE_ROUTE_MAP = Object.fromEntries(
  Object.entries(SUPER_ADMIN_MODULE_NAV).map(([key, config]) => [key, config.href])
);

export const buildNavFromModules = (modules, navConfig, order) => {
  return order
    .filter((moduleKey) => modules?.[moduleKey]?.read && navConfig[moduleKey])
    .map((moduleKey) => {
      const config = navConfig[moduleKey];
      return {
        label: config.label,
        href: config.href,
        icon: config.icon,
        matchPrefix: config.matchPrefix || false,
        ...(config.children ? { children: config.children } : {}),
      };
    });
};

export const getFirstAllowedRoute = (myAccessResponse) => {
  const accessData = myAccessResponse?.data?.[0];
  if (!accessData) return "/";

  if (accessData?.implicit_full_access_frontend) {
    return "/";
  }

  const modules = accessData?.frontend_modules || {};
  for (const moduleKey of MODULE_ROUTE_ORDER) {
    if (modules?.[moduleKey]?.read && MODULE_ROUTE_MAP[moduleKey]) {
      return MODULE_ROUTE_MAP[moduleKey];
    }
  }

  return "/";
};
