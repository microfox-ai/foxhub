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
import { Key, Info, AlertCircle, Loader2, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface EnvVariable {
  env: string;
  name: string;
  what?: string;
  how?: string;
  why?: string;
}

interface EnvVariablesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  envVariables: EnvVariable[];
  onSave: (values: Record<string, string>) => Promise<void>;
  initialValues?: Record<string, string>;
  encryptByDefault?: boolean;
}

export const EnvVariablesDialog = ({
  isOpen,
  onClose,
  envVariables,
  onSave,
  initialValues = {},
  encryptByDefault = true,
}: EnvVariablesDialogProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [envValues, setEnvValues] = useState<Record<string, string>>(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const inputRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [showHowTo, setShowHowTo] = useState(false);

  const currentEnv = envVariables[currentStep];
  const progress = ((currentStep + 1) / envVariables.length) * 100;

  // Early return if no env variables
  if (!currentEnv) {
    return null;
  }

  const handleInputChange = (key: string, value: string) => {
    setEnvValues((prev) => ({ ...prev, [key]: value }));
    setTouchedFields((prev) => ({ ...prev, [key]: true }));
  };

  const handleNext = () => {
    if (!envValues[currentEnv.env]?.trim()) {
      setValidationError("Please fill in this field before proceeding");
      return;
    }
    setValidationError(null);
    if (currentStep < envVariables.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSave();
    }
  };

  const handlePrevious = () => {
    setValidationError(null);
    setCurrentStep((prev) => prev - 1);
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      setValidationError(null);
      await onSave(envValues);
      onClose();
    } catch (error) {
      console.error("Error saving environment variables:", error);
      setValidationError("Failed to save environment variables. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = (_open: boolean) => {
    setValidationError(null);
    onClose();
    if (!_open) {
      setEnvValues(initialValues);
      setValidationError(null);
      setTouchedFields({});
      setCurrentStep(0);
    }
  };

  const renderHowToSteps = () => {
    if (!currentEnv.how) return null;

    return (
      <div className="space-y-3 mt-4 bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center gap-2 text-blue-900 font-medium">
          <HelpCircle className="h-4 w-4" />
          <span>How to set this up:</span>
        </div>
        <div className="space-y-2">
          {currentEnv.how.split("\n").map((step, index) => (
            <div key={index} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium">
                {index + 1}
              </span>
              <p className="text-sm text-blue-900">{step}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Step {currentStep + 1} of {envVariables.length}
            </DialogTitle>
            <div className="text-sm text-gray-500">
              {Math.round(progress)}% Complete
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </DialogHeader>

        <div className="py-6 min-h-[300px]">
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-medium text-gray-900">
                {currentEnv.name}
              </h3>
              <p className="text-gray-600">{currentEnv.what}</p>
              {currentEnv.why && (
                <p className="text-sm text-gray-500 italic">{currentEnv.why}</p>
              )}
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Input
                  id={currentEnv.env}
                  type="text"
                  value={envValues[currentEnv.env] || ""}
                  onChange={(e) => handleInputChange(currentEnv.env, e.target.value)}
                  onBlur={() =>
                    setTouchedFields((prev) => ({ ...prev, [currentEnv.env]: true }))
                  }
                  className={`h-11 px-4 ${touchedFields[currentEnv.env] && !envValues[currentEnv.env]?.trim()
                    ? "border-red-500 focus-visible:ring-red-200"
                    : ""
                    }`}
                  placeholder={`Enter your ${currentEnv.name.toLowerCase()}`}
                  aria-label={currentEnv.name}
                />
                {touchedFields[currentEnv.env] && !envValues[currentEnv.env]?.trim() && (
                  <div className="flex items-center gap-1 text-red-500 text-sm mt-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>This field is required</span>
                  </div>
                )}
              </div>

              {renderHowToSteps()}
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handlePrevious}
            className="h-11"
            disabled={currentStep === 0 || isSubmitting}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => handleCancel(false)}
              className="h-11"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleNext} className="h-11" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : currentStep === envVariables.length - 1 ? (
                "Save Information"
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
