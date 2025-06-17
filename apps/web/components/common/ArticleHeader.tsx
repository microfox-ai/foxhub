'use client'
import { GetPageResponse } from '@microfox/notion';

interface Category {
    id: string;
    name: string;
    color: string;
}

interface ArticleHeaderProps {
    page: GetPageResponse & {
        properties: Record<string, any>,
        icon: { type: string, emoji: string, file: { url: string } } | null,
        cover?: { type: "external", external: { url: string } } | { type: "file", file: { url: string } }
    };
}

export default function ArticleHeader({ page }: ArticleHeaderProps) {
    const title = page.properties['Doc name']?.title[0]?.plain_text;
    const coverUrl = page?.cover?.type === "external" ? page.cover.external.url : page?.cover?.file?.url;
    const iconUrl = page.icon?.file?.url || (page.icon?.type === 'emoji' ? page.icon.emoji : null);
    const author = page.properties['Created by']?.created_by?.name;
    const createdDate = page.properties['Created time']?.created_time;
    const lastUpdatedDate = page.properties['Last updated time']?.last_edited_time;
    const categories = page.properties.Category?.multi_select || [];
    const description = page.properties.Description?.rich_text[0]?.plain_text;
    return (
        <div className="mt-20 mb-8">
            {coverUrl ? (
                <div className="relative h-96 rounded-lg overflow-hidden">
                    <img
                        src={coverUrl}
                        alt={title || 'Article cover image'}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-white text-center bg-gradient-to-t from-black/60 to-black/0">
                        {iconUrl && (page.icon?.type === 'emoji' ?
                            <span className="text-5xl mb-4">{iconUrl}</span> :
                            <img src={iconUrl} alt="icon" className="w-16 h-16 mb-4 rounded-full" />)
                        }
                        <h1 className="text-3xl md:text-5xl font-bold">
                            {title}
                        </h1>
                        {description && <p className="mt-2 text-lg md:text-xl max-w-2xl">{description}</p>}
                        <div className="mt-4 flex items-center space-x-4 text-sm">
                            {author && <span>By {author}</span>}
                            {createdDate && <span>{new Date(createdDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>}
                        </div>
                        <div className="mt-2 text-sm">
                            {lastUpdatedDate && <span>Last updated on {new Date(lastUpdatedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>}
                        </div>
                        <div className="mt-4 flex flex-wrap justify-center gap-2">
                            {categories.map((category: Category) => (
                                <span key={category.id} className="bg-gray-700 bg-opacity-70 rounded-full px-3 py-1 text-sm font-semibold">
                                    {category.name}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center my-8">
                    {iconUrl && (page.icon?.type === 'emoji' ?
                        <span className="text-6xl">{iconUrl}</span> :
                        <img src={iconUrl} alt="icon" className="w-20 h-20 mx-auto mb-4 rounded-full" />)
                    }
                    <h1 className="text-3xl md:text-5xl font-bold">
                        {title}
                    </h1>
                    {description && <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">{description}</p>}
                    <div className="mt-6 flex items-center justify-center space-x-4 text-gray-500">
                        {author && <span>By {author}</span>}
                        {createdDate && <span>{new Date(createdDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>}
                    </div>
                    <div className="mt-2 text-gray-500">
                        {lastUpdatedDate && <span>Last updated on {new Date(lastUpdatedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>}
                    </div>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {categories.map((category: Category) => (
                            <span key={category.id} className="bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700">
                                {category.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
} 