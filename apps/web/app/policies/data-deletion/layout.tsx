import { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
    title: "Data Deletion Policy - Microfox",
    description: "Learn about our data deletion and retention policies at Microfox",
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    themeColor: "#FFFFFF"
};

export default function DataDeletionLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
} 