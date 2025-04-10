import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Key,
  AlertCircle,
  Eye,
  EyeOff,
  Info,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { useParams } from "next/navigation";
import { useUser } from "@/utils/hooks/useUser";
import { toast } from "sonner";

interface ClientSecret {
  id: string;
  name: string;
  type: string;
  variables: Array<{
    key: string;
    value: string;
    isOptional: boolean;
  }>;
}

interface APIKeyDialogProps {
  isOpen: boolean;
  onClose: (submitted?: boolean) => void;
  pkg: {
    name: string;
    type: string | undefined;
    requiredKeys: Array<{
      key: string;
      displayName: string;
      description: string;
      documentation?: string;
    }>;
    packageDocumentation?: string;
  };
  platformName: string;
  existingSecret?: ClientSecret;
  projectId?: string;
  requestId?: string;
  mutateSecrets?: () => void;
}

export const APIKeyDialog = ({
  mutateSecrets,
  isOpen,
  onClose,
  platformName,
  pkg,
  existingSecret,
  projectId,
  requestId,
}: APIKeyDialogProps) => {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<
    Record<string, boolean>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { user } = useUser();

  // Populate form with existing values when secret is found
  useEffect(() => {
    if (existingSecret) {
      const keyMap: Record<string, string> = {};
      existingSecret.variables.forEach((variable) => {
        keyMap[variable.key] = variable.value;
      });
      setApiKeys(keyMap);
    }
  }, [existingSecret]);

  const handleInputChange = (key: string, value: string) => {
    setApiKeys((prev) => ({ ...prev, [key]: value }));
    setValidationErrors((prev) => ({ ...prev, [key]: false }));
  };

  const toggleVisibility = (key: string) => {
    setVisibleKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    const errors: Record<string, boolean> = {};
    let hasError = false;
    let firstErrorKey: string | null = null;

    pkg.requiredKeys.forEach((keyInfo) => {
      if (!apiKeys[keyInfo.key]?.trim()) {
        errors[keyInfo.key] = true;
        hasError = true;
        if (!firstErrorKey) firstErrorKey = keyInfo.key;
      }
    });

    if (hasError) {
      setValidationErrors(errors);
      if (firstErrorKey && inputRefs.current[firstErrorKey]) {
        inputRefs.current[firstErrorKey]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      // Format the variables as per schema requirement
      const variables = pkg.requiredKeys.map((keyInfo) => ({
        key: keyInfo.key,
        value: apiKeys[keyInfo.key],
        isOptional: false,
      }));

      const endpoint = "/api/client-secrets";
      const method = existingSecret ? "PUT" : "POST";

      const body = existingSecret
        ? {
          id: existingSecret.id,
          variables,
          clientRequestId: requestId,
          botProjectId: projectId,
          userId: user?.id,
          name: pkg.name,
          type: pkg.type,
        }
        : {
          botProjectId: projectId,
          clientRequestId: requestId,
          userId: user?.id,
          name: pkg.name,
          type: pkg.type,
          variables,
        };

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to save API keys");
      }

      toast.success(
        existingSecret
          ? "API keys updated successfully"
          : "API keys saved successfully"
      );
      onClose(true);
      mutateSecrets?.();
    } catch (error) {
      console.error("Failed to save API keys:", error);
      toast.error("Failed to save API keys. Please try again.");
      onClose(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose(false)}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-start gap-2 text-xl font-semibold">
            <Key className="h-5 w-5 mt-1" />
            {existingSecret ? "Update" : "Configure"} API Keys for{" "}
            {platformName}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {existingSecret
              ? "Update your existing API keys below."
              : "Enter your API keys below. These will be stored securely and used to authenticate your requests."}
          </DialogDescription>
          <DialogDescription className="text-sm text-gray-500 w-fit">
            <Link
              href={pkg.packageDocumentation ?? ""}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 text-xs flex gap-1 items-center"
            >
              <span>View Package Documentation</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pl-2 py-6 min-h-[200px] max-h-[400px] overflow-y-auto pr-4 -mr-4 scrollbar-thin">
          {pkg.requiredKeys.map((keyInfo) => (
            <div
              key={keyInfo.key}
              className="space-y-3"
              ref={(el) => {
                inputRefs.current[keyInfo.key] = el;
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {keyInfo.displayName}
                  </span>
                  <TooltipProvider delayDuration={3000}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="max-w-[250px] text-xs bg-blue-50 text-blue-900 border border-blue-100 shadow-sm px-3 py-2 [&>svg]:hidden"
                        showArrow={false}
                      >
                        <p>{keyInfo.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <div className="relative">
                <Input
                  id={keyInfo.key}
                  type={visibleKeys[keyInfo.key] ? "text" : "password"}
                  value={apiKeys[keyInfo.key] || ""}
                  onChange={(e) =>
                    handleInputChange(keyInfo.key, e.target.value)
                  }
                  className={`h-11 px-4 ${apiKeys[keyInfo.key] ? "pr-11" : ""} ${validationErrors[keyInfo.key]
                      ? "border-red-500 focus-visible:ring-red-200"
                      : ""
                    }`}
                  placeholder={`Enter your ${keyInfo.displayName}`}
                  aria-label={keyInfo.displayName}
                />
                {apiKeys[keyInfo.key] && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
                    onClick={() => toggleVisibility(keyInfo.key)}
                    type="button"
                  >
                    {visibleKeys[keyInfo.key] ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                )}
              </div>
              {validationErrors[keyInfo.key] && (
                <div className="flex items-center gap-1 text-red-500 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>This field is required</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              onClose(false);
            }}
            className="h-11"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} className="h-11" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {existingSecret ? "Updating..." : "Saving..."}
              </>
            ) : existingSecret ? (
              "Update"
            ) : (
              "Save"
            )}{" "}
            API Keys
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
