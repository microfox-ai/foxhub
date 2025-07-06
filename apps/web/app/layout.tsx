import { Metadata, Viewport } from "next";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { AnalyticsProvider } from "@/components/providers/AnalyticsProvider";
import "./globals.css";
import { serverAnalytics } from "@/utils/services/analytics/server";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { APP_BASE_URL } from "@/utils/constants/appInfo";
import FeatureBase from "@/components/auth/FeatureBase";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FFFFFF"
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_BASE_URL),
  title: "Microfox",
  description: "Enter the new age of AI-first, custom made, branded bots",
  keywords: ["AI", "Microfox", "chatbots", "automation", "branded bots"],
  authors: [{ name: "Microfox AI" }],
  creator: "Microfox AI",
  publisher: "Microfox AI",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://microfox.app",
    title: "Microfox",
    description: "Enter the new age of AI-first, custom made, branded bots",
    siteName: "Microfox",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Microfox - Custom AI Bots",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Microfox",
    description: "Enter the new age of AI-first, custom made, branded bots",
    images: ["/og-image.png"],
    creator: "@microfoxai",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
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
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.fbAsyncInit = function() {
                FB.init({
                  appId      : '2061594424315808',
                  xfbml      : true,
                  version    : 'v23.0'
                });
                FB.AppEvents.logPageView();
              };

              (function(d, s, id){
                 var js, fjs = d.getElementsByTagName(s)[0];
                 if (d.getElementById(id)) {return;}
                 js = d.createElement(s); js.id = id;
                 js.src = "https://connect.facebook.net/en_US/sdk.js";
                 fjs.parentNode.insertBefore(js, fjs);
               }(document, 'script', 'facebook-jssdk'));
            `
          }}
        />
      </head>
      <body>
        <Suspense
          fallback={
            <div className="flex justify-center items-center overflow-hidden h-screen">
              <Loader2 className="w-full h-6 animate-spin" />
            </div>
          }
        >
          <AuthProvider>
            <AnalyticsProvider>
              <FeatureBase />
              <div className="flex-1">{children}</div>
            </AnalyticsProvider>
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  );
}
