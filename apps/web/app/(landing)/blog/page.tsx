'use client';

import { MAIN_BLOG_DATABASE } from '@/components/screens/landing/Blog/blogConstants';
import BlogHero from '@/components/screens/landing/Blog/BlogHero';
import IndustryCarousel from '@/components/screens/landing/Blog/IndustryCarousel';
import { APP_BASE_URL } from '@/utils/constants/appInfo';
import { ListDatabasesResponse } from '@microfox/notion';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function BlogPage() {

    const { data, error, isLoading } = useSWR<ListDatabasesResponse>(
        `/api/landing/blog/articles?databaseId=${MAIN_BLOG_DATABASE.databaseId}`,
        fetcher
    );

    if (isLoading) {
        return (
            <div className="px-0 ">
                <BlogHero categories={[]} />
                <section className="w-full bg-black py-12">
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                </section>
            </div>
        );
    }

    if (error) {
        return (
            <div className="px-0 ">
                <BlogHero categories={[]} />
                <section className="w-full bg-black py-12">
                    <div className="flex items-center justify-center">
                        <div className="text-red-500">Failed to load article</div>
                    </div>
                </section>
            </div>
        );
    }

    if (!data) {
        return null;
    }

    const { results, has_more, next_cursor } = data;

    const articles = results.map((page: any) => {
        const category = page.properties.Category?.multi_select?.[0]?.name;
        const title = (page.properties['Doc name']?.title[0]?.plain_text || 'Untitled Article');
        const description = page.properties.Description?.rich_text?.map((item: any) => item.plain_text).join(' ');
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
        const siteUrl = APP_BASE_URL;
        const url = `${siteUrl}/blog/${page.id}`;
        return {
            ...page,
            title,
            description,
            keywords,
            coverUrl,
            author,
            publishedTime,
            modifiedTime,
            url,
            category,
            id: page.id,
            link: APP_BASE_URL + "/blog/" + page.id,
            type: "article" as const,
            image_url: coverUrl,
            last_edited_time: modifiedTime,
            created_time: publishedTime,
            isHot: true,
        }
    })

    articles.sort((a, b) => {
        if (a.publishedTime && !b.publishedTime) return -1;
        if (!a.publishedTime && b.publishedTime) return 1;
        if (!a.publishedTime && !b.publishedTime) return 0;
        return new Date(b.publishedTime).getTime() - new Date(a.publishedTime).getTime();
    });

    const articlesByCategory = articles.reduce((acc, article) => {
        const category = article.category || 'Uncategorized';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(article);
        return acc;
    }, {} as Record<string, typeof articles>);


    const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    return (
        <div className="px-0 ">
            <BlogHero categories={Object.keys(articlesByCategory)} />
            {Object.entries(articlesByCategory).map(([category, categoryArticles], _index) => (
                <section id={slugify(category)} key={category} className={`w-full ${_index % 2 === 0 ? 'bg-black' : 'bg-white'} py-12`}>
                    <IndustryCarousel
                        theme={_index % 2 === 0 ? 'dark' : 'light'}
                        industryArticles={categoryArticles as any[]}
                        industryName={category}
                        containerClassName="py-4"
                        slidesToScroll={3}
                        hotLimit={2}
                        showHotSection={true}
                        viewType="list"
                    />
                </section>
            ))}
        </div>
    );
}
