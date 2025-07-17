export default function Loading() {
    return (
        <div className="animate-pulse opacity-20">
            <div className="fixed top-24 left-0 w-full h-1 z-50">

            </div>
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Skeleton for ArticleHeader */}
                <div className="mt-20 mb-8">
                    <div className="relative h-96 rounded-lg bg-gray-300" />
                    <div className="text-center my-8">
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-8">
                    {/* Skeleton for TableOfContents */}
                    <aside className="hidden lg:block lg:col-span-2 sticky top-40 h-fit self-start">
                        <div className="space-y-4">
                            <div className="h-6 bg-gray-300 rounded w-3/4" />
                            <div className="h-4 bg-gray-300 rounded w-1/2 ml-4" />
                            <div className="h-4 bg-gray-300 rounded w-1/2 ml-4" />
                            <div className="h-6 bg-gray-300 rounded w-3/4" />
                            <div className="h-4 bg-gray-300 rounded w-1/2 ml-4" />
                        </div>
                    </aside>

                    {/* Skeleton for Article Content */}
                    <div className="col-span-12 lg:col-span-8">
                        <article className="space-y-8">
                            <div className="h-8 bg-gray-300 rounded w-5/6" />
                            <div className="space-y-4">
                                <div className="h-4 bg-gray-300 rounded w-full" />
                                <div className="h-4 bg-gray-300 rounded w-full" />
                                <div className="h-4 bg-gray-300 rounded w-11/12" />
                            </div>
                            <div className="h-8 bg-gray-300 rounded w-4/6" />
                            <div className="space-y-4">
                                <div className="h-4 bg-gray-300 rounded w-full" />
                                <div className="h-4 bg-gray-300 rounded w-10/12" />
                            </div>
                            <div className="space-y-4">
                                <div className="h-4 bg-gray-300 rounded w-full" />
                                <div className="h-4 bg-gray-300 rounded w-full" />
                                <div className="h-4 bg-gray-300 rounded w-11/12" />
                            </div>
                        </article>
                    </div>
                </div>
            </div>
        </div>
    );
} 