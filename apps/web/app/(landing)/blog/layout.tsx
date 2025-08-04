import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { Metadata, Viewport } from "next";

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    themeColor: "#FFFFFF"
};

export const metadata: Metadata = {
    metadataBase: new URL(APP_BASE_URL),
    title: "Microfox",
    description: "Blog & Resources - Industry Insights, Trends, Tips, and Stories collected, collated & curated by Microfox & Team.",
    keywords: ["AI", "Microfox", "chatbots", "automation", "branded bots"],
    authors: [{ name: "Microfox AI" }],
    creator: "Microfox AI",
    publisher: "Microfox AI",
    robots: "index, follow",
    openGraph: {
        type: "website",
        locale: "en_US",
        url: "https://microfox.app",
        title: "Microfox - Blog & Resources",
        description: "Blog & Resources - Industry Insights, Trends, Tips, and Stories collected, collated & curated by Microfox & Team.",
        siteName: "Microfox",
        images: [
            {
                url: "/og-image.png",
                width: 1200,
                height: 630,
                alt: "Microfox - Blog & Resources",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Microfox - Blog & Resources",
        description: "Blog & Resources - Industry Insights, Trends, Tips, and Stories collected, collated & curated by Microfox & Team.",
        images: ["/og-image.png"],
        creator: "@microfoxai",
    },
    icons: {
        icon: "/favicon.ico",
        shortcut: "/favicon-16x16.png",
        apple: "/apple-touch-icon.png",
    },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
    return (
        <div >
            {children}
        </div>
    )
}