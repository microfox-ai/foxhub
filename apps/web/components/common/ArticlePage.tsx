'use client';

import { useState, useEffect } from 'react';
import TiptapRenderer from '@/components/common/Tiptap/TiptapRenderer';
import TableOfContents from '@/components/common/Tiptap/TableOfContents';
import { useNotionTiptap } from '@/lib/notion/useNotionTiptap';
import ArticleHeader from './ArticleHeader';

export default function ArticlePage({ articleData }: { articleData: any }) {
    const [scrollProgress, setScrollProgress] = useState(0);

    const { page, content } = articleData;

    const editor = useNotionTiptap(content || []);

    useEffect(() => {
        const handleScroll = () => {
            const totalHeight =
                document.documentElement.scrollHeight -
                document.documentElement.clientHeight;
            if (totalHeight > 0) {
                const progress = (window.scrollY / totalHeight) * 100;
                setScrollProgress(progress);
            } else {
                setScrollProgress(0);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <>
            <div className="fixed bottom-0 left-0 w-full h-1 z-50">
                <div
                    className="h-1 bg-black"
                    style={{ width: `${scrollProgress}%` }}
                />
            </div>
            <div className="max-w-7xl mx-auto px-4 py-8">
                <ArticleHeader page={page} />
                <div className="grid grid-cols-12 gap-8">
                    <aside className="hidden lg:block lg:col-span-2 sticky top-40 h-fit self-start">
                        <TableOfContents editor={editor} />
                    </aside>
                    <div className="col-span-12 lg:col-span-8">
                        <article>
                            <div className="">
                                <TiptapRenderer editor={editor} />
                            </div>
                        </article>
                    </div>
                </div>
            </div>
        </>
    );
}
