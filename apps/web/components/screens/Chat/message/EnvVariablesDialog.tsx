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
import { Key, Info, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";

interface EnvVariable {
  env: string;
  name: string;
  what: string;
}

interface EnvVariablesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  envVariables: EnvVariable[];
  onSave: (values: Record<string, string>) => Promise<void>;
  initialValues?: Record<string, string>;
}

export const EnvVariablesDialog = ({
  isOpen,
  onClose,
  envVariables,
  onSave,
  initialValues = {},
}: EnvVariablesDialogProps) => {
  const [envValues, setEnvValues] =
    useState<Record<string, string>>(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
    {}
  );
  const inputRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Reset form when dialog is closed
  useEffect(() => {
    if (!isOpen) {
      setEnvValues(initialValues);
      setValidationError(null);
      setTouchedFields({});
    }
  }, [isOpen, initialValues]);

  const handleInputChange = (key: string, value: string) => {
    setEnvValues((prev) => ({ ...prev, [key]: value }));
    setTouchedFields((prev) => ({ ...prev, [key]: true }));
  };

  const toggleVisibility = (key: string) => {
    setVisibleKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    try {
      // Mark all fields as touched when submitting
      const allFields = envVariables.reduce(
        (acc: Record<string, boolean>, env) => {
          acc[env.env] = true;
          return acc;
        },
        {}
      );
      setTouchedFields(allFields);

      // Validate that all required fields have values
      const emptyFields = envVariables.filter(
        (env) => !envValues[env.env]?.trim()
      );

      if (emptyFields.length > 0) {
        setValidationError("Please fill in all required fields");
        // Scroll to the first empty field
        const firstEmptyField = emptyFields[0]?.env;
        if (firstEmptyField && inputRefs.current[firstEmptyField]) {
          inputRefs.current[firstEmptyField]?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
        return;
      }

      setIsSubmitting(true);
      setValidationError(null);

      await onSave(envValues);
      onClose();
    } catch (error) {
      console.error("Error saving environment variables:", error);
      setValidationError(
        "Failed to save environment variables. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setValidationError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-start gap-2 text-xl font-semibold">
            <Key className="h-5 w-5 mt-1" />
            Add Information
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Please enter your information below. This information will be stored
            securely and used in your application.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pl-2 py-6 min-h-[200px] max-h-[400px] overflow-y-auto pr-4 -mr-4 scrollbar-thin">
          {envVariables.map((env) => (
            <div
              key={env.env}
              className="space-y-3"
              ref={(el) => {
                inputRefs.current[env.env] = el;
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {env.name}
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
                        <p>{env.what}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <div className="relative">
                <Input
                  id={env.env}
                  type={"text"}
                  value={envValues[env.env] || ""}
                  onChange={(e) => handleInputChange(env.env, e.target.value)}
                  onBlur={() =>
                    setTouchedFields((prev) => ({ ...prev, [env.env]: true }))
                  }
                  className={`h-11 px-4 ${envValues[env.env] ? "pr-11" : ""} ${touchedFields[env.env] && !envValues[env.env]?.trim()
                    ? "border-red-500 focus-visible:ring-red-200"
                    : ""
                    }`}
                  placeholder={`Enter value for ${env.name}`}
                  aria-label={env.name}
                />
                {/* {envValues[env.env] && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
                    onClick={() => toggleVisibility(env.env)}
                    type="button"
                  >
                    {visibleKeys[env.env] ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                )} */}
                {touchedFields[env.env] && !envValues[env.env]?.trim() && (
                  <div className="flex items-center gap-1 text-red-500 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>This field is required</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {validationError && (
            <div className="flex items-center gap-1 text-red-500 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="h-11"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} className="h-11" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Information"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
