"use client";

export const MODULE_ROUTE_MAP = {
  super_lead_tracking: "/leads",
};

export const MODULE_ROUTE_ORDER = ["super_lead_tracking"];

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
