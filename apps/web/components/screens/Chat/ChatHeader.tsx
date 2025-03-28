import { ButtonSCN } from "@/components/elements/Button";
import { ClientRequest } from "@prisma/client";
import { RefreshCw } from "lucide-react";
import { useMicrofox } from "../providers/MicrofoxProvider";

interface IChatHeaderProps {
  clientRequest?: ClientRequest;
  mutate: () => void;
  isLoading: boolean;
  isValidating: boolean;
}
const ChatHeader = ({
  clientRequest,
  mutate,
  isLoading,
  isValidating,
}: IChatHeaderProps) => {
  const { minionType } = useMicrofox();
  return (
    <div className="flex w-full items-center justify-between gap-2 p-4">
      <div className="w-fit">
        <h2 className="line-clamp-1 flex flex-wrap items-center justify-start gap-2 text-sm font-semibold">
          {clientRequest?.title}
        </h2>
        <p className="text-xs text-gray-500">Request ID: {clientRequest?.id}</p>
        <p className="text-xs text-gray-500">Minion: {minionType}</p>
      </div>
      <ButtonSCN
        variant="outline"
        size="sm"
        onClick={() => mutate()}
        disabled={isLoading}
      >
        <RefreshCw
          className={`my-auto h-4 w-4 ${isValidating ? "animate-spin" : ""}`}
        />
        {/* {isValidating ? 'Refreshing...' : 'Refresh'} */}
      </ButtonSCN>
    </div>
  );

  {
    /* Button to open Add ClientSecret modal manually (if not using slash) */
  }
  {
    /* <div className="border-b px-4 py-2">
    <ButtonSCN onClick={() => setShowAddBotModal(true)}>
      + Add New ClientSecret
    </ButtonSCN>
  </div> */
  }
};

export default ChatHeader;
