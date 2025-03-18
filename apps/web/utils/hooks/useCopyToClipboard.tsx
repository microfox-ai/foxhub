import { useState } from "react";
const useCopyToClipboard = () => {
  const [copied, setCopied] = useState(false);
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  };
  return { copied, copyToClipboard };
};
export default useCopyToClipboard;
