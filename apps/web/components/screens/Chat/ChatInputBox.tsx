import { ButtonSCN } from "@/components/elements/Button";
import {
  FilePlus,
  Search,
  Lightbulb,
  Send,
  RefreshCw,
  FileText,
  Plus,
} from "lucide-react";
import { useRef } from "react";
import { useFileUpload } from "../providers/FileUploadProvider";
import { useClientSecrets } from "../providers/ClientSecretProvider";

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
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files) {
      await handleFileChange(
        e.target.files,
        userId,
        "customBots/clientMessages"
      );
      e.target.value = "";
    }
  };

  const handleCustomInputChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    handleInputChange(e);
    if (e.target.value?.startsWith("/")) {
      setShowSlashModal(true);
    } else {
      setShowSlashModal(false);
    }
  };

  return (
    <div className="absolute bottom-0 right-0 w-full overflow-visible  px-4 py-3">
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
      <div className="flex flex-col gap-2 rounded-4xl shadow-md bg-gray-100 p-3 relative">
        <textarea
          placeholder="Ask anything"
          className="flex-1 resize-none overflow-hidden overflow-y-auto bg-transparent px-2 py-2 text-gray-800 placeholder-gray-500 outline-none min-h-[56px]"
          value={input}
          rows={1}
          onChange={handleCustomInputChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
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
        <div className="flex w-full items-center justify-between">
          <button
            className="p-2 h-fit ml-2 border border-gray-300 rounded-full text-gray-500 hover:text-gray-700"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            onClick={sendMessage}
            disabled={
              (!input.trim() && attachedMedia.length === 0) ||
              messageStatus === "pending" ||
              messageStatus === "streaming" ||
              mediaUploadStatus === "UPLOADING" ||
              mediaUploadStatus === "ERROR"
            }
            className="rounded-full mr-2 bg-black p-2 text-white disabled:bg-gray-400  hover:bg-black/80"
          >
            {!(
              messageStatus === "streaming" ||
              messageStatus === "pending" ||
              mediaUploadStatus === "UPLOADING"
            ) ? (
              <Send className="h-5 w-5" />
            ) : (
              <RefreshCw className="h-5 w-5 animate-spin" />
            )}
          </button>
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
