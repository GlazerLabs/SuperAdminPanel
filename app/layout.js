"use client";

import { useEffect } from "react";
import { Outfit } from "next/font/google";
import { usePathname, useRouter } from "next/navigation";
import "./globals.css";
import { useAuthStore } from "@/zustand/auth";
import { useModuleAccessStore } from "@/zustand/moduleAccess";
import SuperAdminLogin from "@/components/Auth/SuperAdminLogin";
import Sidebar from "@/components/Main/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import AppLoader from "@/components/ui/loader/AppLoader";
import { getFirstAllowedRoute } from "@/lib/frontendAccess";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loggedIn, hasHydrated } = useAuthStore();
  const myAccess = useModuleAccessStore((state) => state.myAccess);

  const isLoginRoute = pathname === "/login";

  useEffect(() => {
    if (!hasHydrated || !loggedIn) return;
    if (pathname !== "/") return;
    if (!myAccess) return;

    const firstAllowedRoute = getFirstAllowedRoute(myAccess);
    if (firstAllowedRoute && firstAllowedRoute !== "/") {
      router.replace(firstAllowedRoute);
    }
  }, [hasHydrated, loggedIn, myAccess, pathname, router]);

  return (
    <html lang="en">
      <body className={`${outfit.variable} antialiased`}>
        {isLoginRoute ? (
          <div className="bg-[#121212]">
            <SuperAdminLogin />
          </div>
        ) : !hasHydrated ? (
          <AppLoader />
        ) : loggedIn ? (
          <div className="flex h-screen overflow-hidden bg-zinc-50">
            <div className="w-64 shrink-0 border-r border-white/5 bg-slate-900 lg:w-72">
              <Sidebar />
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50">
              <AppHeader />
              <div className="px-6 pb-6 pt-4">{children}</div>
            </div>
          </div>
        ) : (
          <div className="bg-[#121212]">
            <SuperAdminLogin />
          </div>
        )}
      </body>
    </html>
  );
}

