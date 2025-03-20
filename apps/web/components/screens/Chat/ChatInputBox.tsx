import { ButtonSCN } from "@/components/elements/Button";
import { FilePlus, FileText, RefreshCw, Send } from "lucide-react";
import { useRef } from "react";
import { useFileUpload } from "../providers/FileUploadProvider";
import { useClientSecrets } from "../providers/ClientSecretProvider";
import { ChatUIMessageWithTypes } from "../hooks/convertors";

interface ChatInputBoxProps {
  input: string;
  messageStatus: "pending" | "streaming" | "submitted" | "ready" | "error";
  userId: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  sendMessage: () => void;
}

export default function ChatInputBox({
  input,
  messageStatus,
  userId,
  handleInputChange,
  sendMessage,
}: ChatInputBoxProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { attachedMedia, mediaUploadStatus, handleFileChange, removeMedia } =
    useFileUpload();
  const { setShowSlashModal } = useClientSecrets();

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files) {
      await handleFileChange(
        e.target.files,
        userId,
        "customBots/clientMessages",
      );
      e.target.value = "";
    }
  };

  const handleCustomInputChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    handleInputChange(e);
    if (e.target.value?.startsWith("/")) {
      setShowSlashModal(true);
    } else {
      setShowSlashModal(false);
    }
  };

  return (
    <div className="absolute bottom-0 right-0 w-full bg-white px-4 py-1">
      {attachedMedia.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachedMedia.map((media, index) => (
            <div key={index} className="relative">
              {media.file.type.startsWith("image/") ? (
                <img
                  src={media.preview}
                  alt={media.file.name}
                  className="h-16 w-16 rounded object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded bg-gray-100">
                  <FileText className="h-6 w-6 text-gray-600" />
                </div>
              )}
              <button
                onClick={() => removeMedia(index)}
                className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1 text-xs text-white"
              >
                X
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          placeholder="Type your message... (start with '/' to choose a ClientSecret)"
          className="w-full resize-none rounded-lg border p-3 outline-none"
          value={input}
          onChange={handleCustomInputChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              sendMessage();
            }
          }}
          disabled={
            messageStatus === "pending" ||
            messageStatus === "streaming" ||
            mediaUploadStatus === "UPLOADING" ||
            mediaUploadStatus === "ERROR"
          }
        />
        <div className="flex flex-col-reverse gap-1">
          <ButtonSCN
            onClick={sendMessage}
            disabled={
              (!input.trim() && attachedMedia.length === 0) ||
              messageStatus === "pending" ||
              messageStatus === "streaming" ||
              mediaUploadStatus === "UPLOADING" ||
              mediaUploadStatus === "ERROR"
            }
            className="py-1"
          >
            {!(
              messageStatus === "streaming" ||
              messageStatus === "pending" ||
              mediaUploadStatus === "UPLOADING"
            ) ? (
              <Send className="my-auto h-4 w-4" />
            ) : (
              <RefreshCw className="my-auto h-4 w-4 animate-spin" />
            )}
          </ButtonSCN>
          <ButtonSCN
            onClick={() => fileInputRef.current?.click()}
            className="py-1"
          >
            <FilePlus className="my-auto h-4 w-4" />
          </ButtonSCN>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileInputChange}
        />
      </div>
    </div>
  );
}
