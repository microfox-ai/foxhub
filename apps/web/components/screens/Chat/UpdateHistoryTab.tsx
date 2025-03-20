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
      ) : messages.filter((update) => (update.role as any) === "system")
          .length > 0 ? (
        messages
          .filter((update) => (update.role as any) === "system")
          .map((update) => (
            <a
              key={update.id}
              href={(update?.metadata as any)?.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-lg bg-gray-100 p-4 hover:bg-gray-200"
            >
              <p className="font-semibold">System Update</p>
              <p>{update.content}</p>
            </a>
          ))
      ) : (
        <div className="text-center text-gray-500">No system updates yet.</div>
      )}
    </div>
  );
}
