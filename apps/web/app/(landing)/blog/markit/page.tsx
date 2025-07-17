import ArticlePage from '@/components/common/ArticlePage';
import { getArticleData } from '@/lib/notion/articles';
import { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';

// Revalidate every 5 minutes (300 seconds)
export const revalidate = 300;

type Props = {
    params: Promise<{ article_id: string }>;
};

export async function generateMetadata(
    { params }: Props
): Promise<Metadata> {
    const { article_id } = await params;
    const articleData = await getArticleData(article_id);

    if (!articleData.page) {
        return {
            title: 'Article not found',
        };
    }

    const page = articleData.page as any;

    const category = page.properties.Category?.multi_select?.[0]?.name;
    const title = (page.properties['Doc name']?.title[0]?.plain_text || 'Untitled Article') + ` - Microfox ${category}`;
    const description =
        page.properties.Description?.rich_text[0]?.plain_text ||
        '';
    const keywords = page.properties.keywords?.multi_select?.map(
        (c: any) => c.name,
    );
    const coverUrl =
        page.cover?.type === 'external'
            ? page.cover.external.url
            : page.cover?.file?.url;
    const author = page.properties['Created by']?.created_by?.name;
    const publishedTime = page.properties['Created time']?.created_time;
    const modifiedTime = page.properties['Last updated time']?.last_edited_time;
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const url = `${siteUrl}/blog/${article_id}`;

    return {
        title,
        description,
        keywords,
        authors: author ? [{ name: author, url: siteUrl }] : [],
        creator: author,
        publisher: 'Microfox AI',
        metadataBase: new URL(siteUrl),
        alternates: {
            canonical: url,
        },
        openGraph: {
            title,
            description,
            url,
            siteName: 'Microfox AI Blog',
            images: coverUrl
                ? [
                    {
                        url: coverUrl,
                        width: 1200,
                        height: 630,
                        alt: title,
                    },
                ]
                : [],
            locale: 'en_US',
            type: 'article',
            publishedTime,
            modifiedTime,
            authors: author ? [author] : [],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: coverUrl ? [coverUrl] : [],
            creator: author ? `@${author.replace(/\s+/g, '')}` : '@microfox_ai',
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
    };
}

export default async function BlogPage({
    params,
}: {
    params: Promise<{ article_id: string }>;
}) {
    const { article_id } = await params;
    try {
        const articleData = await getArticleData(article_id, process.env.NOTION_MARKIT_TOKEN);

        if (!articleData.page || !articleData.content) {
            notFound();
        }

        return <ArticlePage articleData={articleData} />;
    } catch (error) {
        console.error('Failed to load article:', error);
        notFound();
    }
}
