'use client';

import useSWR from 'swr';
import { useParams } from 'next/navigation';
import TiptapRenderer from '@/components/common/Tiptap/TiptapRenderer';
import TableOfContents from '@/components/common/Tiptap/TableOfContents';
import { useNotionTiptap } from '@/lib/notion/useNotionTiptap';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function BlogPage() {
    const params = useParams();
    const articleId = params?.article_id as string;

    const { data, error, isLoading } = useSWR(
        articleId ? `/api/landing/blog/articles/${articleId}` : null,
        fetcher
    );

    const editor = useNotionTiptap(data?.content || []);

    if (isLoading || !data) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-red-500">Failed to load article</div>
            </div>
        );
    }

    const { page } = data;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="grid grid-cols-12 gap-8">
                <aside className="hidden lg:block lg:col-span-2 sticky top-40 h-fit self-start">
                    <TableOfContents editor={editor} />
                </aside>
                <div className="col-span-12 lg:col-span-8">
                    <article>
                        <h1 className="text-4xl font-bold mb-4">{page.properties.title?.title[0]?.plain_text}</h1>
                        <div className="mt-8">
                            <TiptapRenderer editor={editor} />
                        </div>
                    </article>
                </div>
            </div>
        </div>
    );
}
