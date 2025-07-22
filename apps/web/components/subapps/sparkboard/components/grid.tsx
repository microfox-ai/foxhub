import { MediaGrid } from "@/components/screens/Chat/message/uiTool/hitl_output/common/media";
import { useSparkboard } from "../provider";

export default function SparkBoardGrid() {
    const { results, isLoading, error } = useSparkboard();

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-[200px]">Loading...</div>;
    }

    if (error) {
        return <div className="text-red-500">Error: {error.message}</div>;
    }

    if (!results || results.length === 0) {
        return <div className="text-neutral-500">No results found</div>;
    }

    return (
        <div className="p-4">
            <MediaGrid images={results} />
        </div>
    );
}