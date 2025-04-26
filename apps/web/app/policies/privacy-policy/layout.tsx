import { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
    title: "Privacy Policy - Microfox",
    description: "Learn about how we collect, use, and protect your data at Microfox",
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    themeColor: "#FFFFFF"
};

export default function PrivacyPolicyLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
} 