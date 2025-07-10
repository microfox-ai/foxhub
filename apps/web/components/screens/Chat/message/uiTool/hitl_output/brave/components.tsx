import { uiHitlMap } from "@/server/ui/uiHitl"


export const BraveSourceBanner = ({ output, toolName }: { output: uiHitlMap["brave"] | undefined, toolName?: string }) => {
    if (!output || !toolName) {
        return null;
    }

    if (toolName == "webSearch") {
        console.log("output", output);
        return (
            <div className="flex flex-row gap-2 bg-neutral-100 rounded-xl px-4 py-3 overflow-x-auto">
                {output.webSearch.web_sources.map((source) => (
                    <div key={source.url} className="flex flex-col min-w-[200px]">
                        <a href={source.url} className="flex flex-row gap-2 text-sm font-medium cursor-pointer line-clamp-2">
                            <img src={source.meta_url?.favicon ?? ""} alt={source.title} className="w-4 h-4 rounded-full" />
                            <span className="line-clamp-1">{source.title}</span>
                        </a>
                    </div>
                ))}
            </div>
        )
    }
}