'use client';

import useSWR from 'swr';
import { useParams } from 'next/navigation';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function BlogPage() {
    const params = useParams();
    const articleId = params?.article_id as string;

    const { data, error, isLoading } = useSWR(
        articleId ? `/api/landing/blog/articles/${articleId}` : null,
        fetcher
    );

    if (isLoading) {
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

    if (!data) {
        return null;
    }

    const { page, content } = data;

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <article className="prose prose-lg dark:prose-invert">
                <h1 className="text-4xl font-bold mb-4">{page.properties.title?.title[0]?.plain_text}</h1>
                <div className="mt-8">
                    {content.map((block: any) => (
                        <div key={block.id} className="mb-4">
                            {block.type === 'paragraph' && (
                                <p>{block.paragraph.rich_text[0]?.plain_text}</p>
                            )}
                            {block.type === 'heading_1' && (
                                <h1>{block.heading_1.rich_text[0]?.plain_text}</h1>
                            )}
                            {block.type === 'heading_2' && (
                                <h2>{block.heading_2.rich_text[0]?.plain_text}</h2>
                            )}
                            {block.type === 'heading_3' && (
                                <h3>{block.heading_3.rich_text[0]?.plain_text}</h3>
                            )}
                            {block.type === 'bulleted_list_item' && (
                                <ul>
                                    <li>{block.bulleted_list_item.rich_text[0]?.plain_text}</li>
                                </ul>
                            )}
                            {block.type === 'numbered_list_item' && (
                                <ol>
                                    <li>{block.numbered_list_item.rich_text[0]?.plain_text}</li>
                                </ol>
                            )}
                            {block.type === 'image' && (
                                <img
                                    src={block.image.file?.url || block.image.external?.url}
                                    alt={block.image.caption?.[0]?.plain_text || 'Image'}
                                    className="rounded-lg"
                                />
                            )}
                        </div>
                    ))}
                </div>
            </article>
        </div>
    );
}
