/* eslint-disable @next/next/no-img-element */
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
import { useEffect, useRef } from "react";
import { useFileUpload } from "../providers/FileUploadProvider";
import { useClientSecrets } from "../providers/ClientSecretProvider";
import { ChatUIMessageWithTypes } from "../hooks/convertors";
import { useMicrofox } from "../providers/MicrofoxProvider";
import { cn } from "@/lib/utils";
import { UIMessage } from "ai";
interface ChatInputBoxProps {
  input: string;
  messageStatus: "pending" | "streaming" | "submitted" | "ready" | "error";
  userId: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
  lastMessage?: UIMessage;
}

export default function ChatInputBox({
  input,
  messageStatus,
  userId,
  lastMessage,
  handleInputChange,
  className,
}: ChatInputBoxProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { attachedMedia, mediaUploadStatus, handleFileChange, removeMedia } =
    useFileUpload();
  const { setShowSlashModal } = useClientSecrets();
  const { handleSubmit } = useMicrofox();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    console.log("textareaRef", textareaRef.current);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"; // Reset height
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; // Expand to fit content
    }
  }, [input]); // Runs when input changes

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
    <div className={cn("w-full overflow-visible", className)}>
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
      <div className="flex flex-col gap-2 !rounded-4xl shadow-md border border-gray-200 bg-white p-3 relative">
        <textarea
          ref={textareaRef}
          placeholder="Ask anything"
          className="flex-1 overflow-hidden bg-transparent px-2 py-2 text-gray-800 placeholder-gray-500 outline-none resize-none min-h-[42px]"
          value={input}
          rows={1}
          onChange={handleCustomInputChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              handleSubmit(e);
            }
          }}
          disabled={
            (
              lastMessage?.annotations?.[
                lastMessage.annotations.length - 1
              ] as any
            )?.type === "ui" ||
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
            onClick={() => handleSubmit()}
            disabled={
              (
                lastMessage?.annotations?.[
                  lastMessage.annotations.length - 1
                ] as any
              )?.type === "ui" ||
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
