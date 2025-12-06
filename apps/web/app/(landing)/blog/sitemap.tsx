import { MAIN_BLOG_DATABASE } from '@/components/screens/landing/Blog/blogConstants';
import { APP_BASE_URL } from '@/utils/constants/appInfo'
import { NotionClient } from '@microfox/notion';
import type { MetadataRoute } from 'next'

export const revalidate = 86400 // revalidate every day

const DATA_SOURCE_ID = MAIN_BLOG_DATABASE.data_source_id

export async function generateSitemaps() {


    // const client = new NotionClient({
    //     auth: process.env.NOTION_BOT_TOKEN ?? "",
    //     notionVersion: '2025-09-03',
    // });

    // const pages = await client.dataSources.query({
    //     data_source_id: DATA_SOURCE_ID,
    //     page_size: 50000,
    //     filter: {
    //         property: "Status",
    //         select: {
    //             equals: "Published",
    //         },
    //     },
    // });

    // Fetch the total number of products and calculate the number of sitemaps needed
    return [{ id: 0 }]
}

export default async function sitemap({
    id,
}: {
    id: number
}): Promise<MetadataRoute.Sitemap> {
    // Google's limit is 50,000 URLs per sitemap
    const start = id * 50000
    const end = start + 50000

    console.log("process.env.NOTION_BOT_TOKEN", process.env.NOTION_BOT_TOKEN);
    const client = new NotionClient({
        auth: process.env.NOTION_BOT_TOKEN ?? "",
        notionVersion: '2025-09-03',
    });


    const pages = await client.dataSources.query({
        data_source_id: DATA_SOURCE_ID,
        page_size: 50000,
        filter: {
            property: "Status",
            select: {
                equals: "Published",
            },
        },
    });
    return pages?.results?.map((page) => ({
        url: `${APP_BASE_URL}/blog/${page.id}`,
        lastModified: (page as any)?.last_edited_time,
    }))
}