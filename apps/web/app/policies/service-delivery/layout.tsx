import { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
    title: "Service Delivery Policy - Microfox",
    description: "Learn about our service delivery standards and commitments at Microfox",
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    themeColor: "#FFFFFF"
};

export default function ServiceDeliveryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
} 