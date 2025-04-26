import { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
    title: "Terms of Service - Microfox",
    description: "Read our terms of service and usage conditions at Microfox",
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    themeColor: "#FFFFFF"
};

export default function TermsOfServiceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
} 