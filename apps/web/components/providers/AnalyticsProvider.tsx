"use client";

import { analytics } from "@/utils/services/analytics/client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Initialize analytics
    analytics.init({
      mixpanelToken: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN,
      debug: process.env.NODE_ENV === "development",
    });
  }, []);

  // Track page views
  useEffect(() => {
    analytics.page(pathname);
  }, [pathname, searchParams]);

  return children;
}
