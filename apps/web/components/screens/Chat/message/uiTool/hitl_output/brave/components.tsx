import { uiHitlMap } from "@/server/ui/uiHitl"
import { InfiniteMovingCards } from "@/components/ui/infinite-moving-cards";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";


export const BraveSourceBanner = ({ output, toolName }: { output: uiHitlMap["brave"] | undefined, toolName?: string }) => {
    if (!output || !toolName) {
        return null;
    }

    if (toolName == "webSearch") {

        const webSources = output.webSearch.web_sources.map((source, idx) => (
            <HoverCard openDelay={0} key={source.url + idx}>
                <HoverCardTrigger asChild>
                    <div className="flex min-w-[200px] bg-neutral-100 rounded-xl px-4 py-1 items-center justify-center">
                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="flex flex-row gap-2 cursor-pointer items-center">
                            <img src={source.meta_url?.favicon ?? ""} alt={source.title} className="w-4 h-4 rounded-full" />
                            <span className="line-clamp-1 text-xs font-regular text-neutral-500">{source.title}</span>
                        </a>
                    </div>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                    <div className="flex flex-col gap-2 p-1">
                        <div className="flex items-center gap-2">
                            <img src={source.meta_url?.favicon ?? ""} alt={source.title} className="w-5 h-5 rounded-full" />
                            <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-sm line-clamp-1 hover:underline">{source.title}</a>
                        </div>

                        {source.thumbnail?.src && (
                            <div className="w-full aspect-video rounded-lg overflow-hidden">
                                <img src={source.thumbnail.src} alt={source.title} className="w-full h-full object-cover" />
                            </div>
                        )}

                        <p className="text-sm text-neutral-600 line-clamp-3">
                            {source.description}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-neutral-200 mt-1">
                            <span className="text-xs text-neutral-500">
                                {new URL(source.url).hostname}
                            </span>
                        </div>
                    </div>
                </HoverCardContent>
            </HoverCard>
        ));

        return (
            <InfiniteMovingCards
                items={webSources}
                direction="left"
                speed="normal"
                pauseOnHover={true}
                className="max-w-full [mask-image:linear-gradient(to_right,transparent,white_10%,white_90%,transparent)]"
            />
        )
    }

    if (toolName == "mcp") {
        return (
            <div>

            </div>
        )
    }

    return null;
}