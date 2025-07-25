import { Metadata } from 'next';

// Revalidate every 5 minutes (300 seconds)
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
    const mcpData = await getApiMcpsByPackageName(["sparkboard"]);
    const agentData = mcpData?.[0];

    // You will handle the actual mapping, this is just the structure
    const siteUrl = `https://${agentData?.package_name}.${APP_DOMAIN}`;
    const url = `${APP_DOMAIN}/subdomain/sparkboard`;
    const agentInfo = agentData?.metadata?.docs_data?.info as AgentInfo;

    return {
        title: `${agentInfo.title} - Microfox AI`,
        description: agentInfo.description,
        keywords: agentInfo.agentCard?.skills?.map((skill) => skill.name),
        authors: [{ name: "Microfox AI", url: siteUrl }],
        metadataBase: new URL(siteUrl),
        alternates: {
            canonical: url,
        },
        icons: agentInfo.iconUrl ? [agentInfo.iconUrl] : undefined,
        openGraph: {
            title: `${agentInfo.title} - Microfox AI`,
            description: agentInfo.description,
            url,
            siteName: `${agentInfo.title} by Microfox AI`,
            // images: [
            //     {
            //         url: `${siteUrl}/logo/sparkboard.svg`,
            //         width: 1200,
            //         height: 630,
            //         alt: "Sparkboard by Microfox AI",
            //     }
            // ],
            locale: "en_US",
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: `${agentInfo.title} - Microfox AI`,
            description: agentInfo.description,
            images: agentInfo.iconUrl ? [agentInfo.iconUrl] : undefined,
            creator: "@microfox_ai",
        },
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                'max-video-preview': -1,
                'max-image-preview': 'large',
                'max-snippet': -1,
            },
        },
        //category: "Technology",
    };
}

import SparkBoardMainPage from "@/components/subapps/sparkboard/mainPage";
import { getApiMcpsByPackageName } from '@/utils/services/embeddings/packageSearch';
import { APP_DOMAIN } from '@/utils/constants/appInfo';
import { AgentInfo } from '@microfox/types';

export default function Page() {
    return <SparkBoardMainPage />;
}