import { Metadata } from "next";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { AnalyticsProvider } from "@/components/providers/AnalyticsProvider";
import "./globals.css";
import { serverAnalytics } from "@/utils/services/analytics/server";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Custom Bots",
  description: `Enter the new age 
      of Ai-first, custom made, 
      branded bots`,
};

// Initialize analytics once on the server side
if (typeof window === "undefined") {
  serverAnalytics.init({
    mixpanelToken: process.env.MIXPANEL_SERVER_TOKEN!,
    debug: process.env.NODE_ENV !== "production",
  });
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons&display=block"
          rel="stylesheet"
        ></link>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined&display=block"
          rel="stylesheet"
        ></link>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,100..700,0,0&display=block"
        ></link>
      </head>
      <body>
        <Suspense>
          <AnalyticsProvider>
            <AuthProvider>
              <div className="flex-1">{children}</div>
            </AuthProvider>
          </AnalyticsProvider>
        </Suspense>
      </body>
    </html>
  );
}
