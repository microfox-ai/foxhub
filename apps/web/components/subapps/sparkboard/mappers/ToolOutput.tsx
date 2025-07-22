import { MediaGrid } from "@/components/screens/Chat/message/uiTool/hitl_output/common/media";
import { operations } from "@/components/subapps/sparkboard/sparkboard.d";
import { mapSearchResults } from "./searchResults";

export default function ToolOutputMapper(toolName: keyof operations, data: any) {
    switch (toolName) {
        case "searchStocksearchImages":
            return <MediaGrid images={mapSearchResults(data)} />
        default:
            return null;
    }
}