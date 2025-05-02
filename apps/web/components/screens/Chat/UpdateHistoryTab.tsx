import { Skeleton } from "@mui/material";
import { ChatUIMessageWithTypes } from "../hooks/convertors";

interface UpdateHistoryProps {
  messages: ChatUIMessageWithTypes[];
  isLoading: boolean;
}

export default function UpdateHistoryTab({
  messages,
  isLoading,
}: UpdateHistoryProps) {
  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {isLoading ? (
        <Skeleton variant="rectangular" width="100%" height={200} />
      ) : (
        <div className="text-center text-gray-500">No system updates yet.</div>
      )}
    </div>
  );
}
