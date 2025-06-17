import ArticlePage from '@/components/common/ArticlePage';
import { getArticleData } from '@/lib/notion/articles';
import { notFound } from 'next/navigation';

export default async function BlogPage({
    params,
}: {
    params: { article_id: string };
}) {
    const { article_id } = params;
    try {
        const articleData = await getArticleData(article_id);

        if (!articleData.page || !articleData.content) {
            notFound();
        }

        return <ArticlePage articleData={articleData} />;
    } catch (error) {
        console.error('Failed to load article:', error);
        notFound();
    }
}
