import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, BoxIcon, ChevronLeft, ChevronRight, HelpCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { useTaskInstanceMetaContext } from "../../providers/TaskInstanceMetaProvider";
import { ExtraEnvVariable, taskRequiredInfo } from "@/server/convertfox/helpers/types";
import { cn } from "@/lib/utils";
import { EnvVariableInput } from "./EnvVariableInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { EnvConfigurationEditor } from "./EnvConfigurationEditor";


interface EnvVariablesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  envVariables: ExtraEnvVariable[];
  onSave: (values: Record<string, string>) => Promise<void>;
  initialValues?: Record<string, string>;
  encryptByDefault?: boolean;
  initialStep?: number;
}

const StepIndicator = ({
  totalSteps,
  currentStep,
  onStepClick,
  completedSteps
}: {
  totalSteps: number;
  currentStep: number;
  onStepClick: (step: number) => void;
  completedSteps: number[];
}) => {
  return (
    <div className="relative flex items-center justify-center mb-2">
      <div className="absolute w-full h-[1px] bg-gray-200" />
      <div className="relative flex items-center justify-center w-full px-4 gap-2">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <button
            key={index}
            onClick={() => onStepClick(index)}
            className={cn(
              "relative z-10 w-1.5 h-1.5 rounded-full transition-all duration-200",
              currentStep === index ? "scale-150" : "scale-100",
              completedSteps.includes(index) ? "bg-green-500" : "bg-black",
              "hover:scale-125"
            )}
            aria-label={`Go to step ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export const EnvVariablesDialog = ({
  isOpen,
  onClose,
  envVariables,
  onSave,
  initialValues = {},
  encryptByDefault = true,
  initialStep = 0,
}: EnvVariablesDialogProps) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [envValues, setEnvValues] = useState<Record<string, string>>(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const inputRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [showHowTo, setShowHowTo] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const { taskInstanceMeta, updateTaskInstanceMeta } = useTaskInstanceMetaContext();

  const existingEnvKeys = envVariables.map(v => v.env.trim().toUpperCase());

  // Reset state when dialog opens/closes or initialStep changes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(initialStep);
      setEnvValues(initialValues);
      setValidationError(null);
      setTouchedFields({});
      setIsAddingNew(false);
      setIsEditing(false);
      setEditingIndex(null);
    }
  }, [isOpen, initialStep, initialValues]);

  // Update completed steps when envValues change
  useEffect(() => {
    const newCompletedSteps = envVariables
      .map((env, index) => ({ index, env: env.env }))
      .filter(({ env }) => envValues[env]?.trim())
      .map(({ index }) => index);
    setCompletedSteps(newCompletedSteps);
  }, [envValues, envVariables]);

  let currentEnv = envVariables[currentStep];
  const progress = ((currentStep + 1) / envVariables.length) * 100;

  // Early return if no env variables
  if (!currentEnv) {
    currentEnv = {
      env: "",
      name: "",
      what: "",
      how: "",
      why: "",
    }
  }

  if (!currentEnv) {
    return null;
  }

  const handleInputChange = (key: string, value: string) => {
    setEnvValues((prev) => ({ ...prev, [key]: value }));
    setTouchedFields((prev) => ({ ...prev, [key]: true }));
  };

  const handleConfigurationSubmit = async (values: ExtraEnvVariable) => {
    if (!taskInstanceMeta) {
      toast.error("Task instance meta not found");
      return;
    }

    setIsSubmitting(true);

    try {
      const updatedEnvVariables = [...envVariables];
      if (isEditing && editingIndex !== null) {
        updatedEnvVariables[editingIndex] = values;
      } else {
        updatedEnvVariables.push(values);
      }

      await updateTaskInstanceMeta({
        ...taskInstanceMeta,
        taskRequiredInfo: {
          ...taskInstanceMeta?.taskRequiredInfo,
          customEnvVariables: updatedEnvVariables,
        }
      });

      toast.success(isEditing ? "Variable updated successfully" : "New variable added successfully");

      if (!isEditing) {
        setCurrentStep(updatedEnvVariables.length - 1);
      }

      setIsAddingNew(false);
      setIsEditing(false);
      setEditingIndex(null);
    } catch (error) {
      toast.error(isEditing ? "Failed to update variable" : "Failed to add new variable");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      setValidationError(null);
      await onSave(envValues);
      onClose();
      //toast.success("Environment variables saved successfully");
    } catch (error) {
      console.error("Error saving environment variables:", error);
      setValidationError("Failed to save environment variables. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStepClick = (step: number) => {
    if (step <= Math.max(...completedSteps) + 1) {
      setCurrentStep(step);
    }
  };

  const handleNext = () => {
    if (!envValues[currentEnv.env]?.trim()) {
      setValidationError("Please fill in this field before proceeding");
      return;
    }
    setValidationError(null);
    if (currentStep < envVariables.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    setValidationError(null);
    setCurrentStep((prev) => prev - 1);
  };

  const handleCancel = (_open: boolean) => {
    setValidationError(null);
    onClose();
    if (!_open) {
      setEnvValues(initialValues);
      setValidationError(null);
      setTouchedFields({});
      setCurrentStep(0);
      setIsAddingNew(false);
      setIsEditing(false);
      setEditingIndex(null);
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

  const handleDeleteConfiguration = async () => {
    if (!taskInstanceMeta || editingIndex === null) {
      toast.error("Task instance meta not found");
      return;
    }

    setIsSubmitting(true);

    try {
      const updatedEnvVariables = [...envVariables];
      updatedEnvVariables.splice(editingIndex, 1);

      await updateTaskInstanceMeta({
        ...taskInstanceMeta,
        taskRequiredInfo: {
          ...taskInstanceMeta?.taskRequiredInfo,
          customEnvVariables: updatedEnvVariables,
        }
      });

      toast.success("Configuration deleted successfully");
      setIsEditing(false);
      setEditingIndex(null);
    } catch (error) {
      toast.error("Failed to delete configuration");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[600px]">
        {envVariables.length > 0 && (
          <DialogHeader className="space-y-2">
            <div className="flex items-center justify-start gap-6">
              <DialogTitle className="text-xl font-semibold">
                {(isAddingNew || isEditing) ? "" : `Step ${currentStep + 1} of ${envVariables.length}`}
              </DialogTitle>
              {!isAddingNew && !isEditing && (
                <div className="text-sm text-gray-500 ml-4">
                  {Math.round(progress)}% Complete
                </div>
              )}
            </div>
            {!isAddingNew && !isEditing && (
              <>
                {/* <StepIndicator
                  totalSteps={envVariables.length}
                  currentStep={currentStep}
                  onStepClick={handleStepClick}
                  completedSteps={completedSteps}
                /> */}
                <Progress value={progress} className="h-1 " />
              </>
            )}
          </DialogHeader>
        )}

        <div className="py-0 min-h-[300px]">
          {isAddingNew || isEditing ? (
            <EnvConfigurationEditor
              initialValues={isEditing && editingIndex !== null ? envVariables[editingIndex] : undefined}
              onSubmit={handleConfigurationSubmit}
              onCancel={() => {
                setIsAddingNew(false);
                setIsEditing(false);
                setEditingIndex(null);
              }}
              isSubmitting={isSubmitting}
              mode={isEditing ? 'edit' : 'add'}
              onDelete={isEditing ? handleDeleteConfiguration : undefined}
              existingEnvKeys={existingEnvKeys}
            />
          ) : currentEnv.env === "" ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <BoxIcon className="w-10 h-10 text-gray-500 my-4" />
                <h3 className="text-2xl font-medium text-gray-900">
                  Add New Configuration
                </h3>
                <p className="text-gray-600">Create a new custom environment variable for your project.</p>
                <Button onClick={() => setIsAddingNew(true)} className="my-8">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Variable
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-medium text-gray-900">
                    {currentEnv.name}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(currentStep)}
                  >
                    Edit
                  </Button>
                </div>
                <p className="text-gray-600">{currentEnv.what}</p>
                {currentEnv.why && (
                  <p className="text-sm text-gray-500 italic">{currentEnv.why}</p>
                )}
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <EnvVariableInput
                    type={currentEnv.ui?.type || "input"}
                    value={envValues[currentEnv.env] || currentEnv.ui?.defaultValue || ""}
                    onChange={(value) => handleInputChange(currentEnv.env, value)}
                    options={currentEnv.ui?.options}
                    placeholder={currentEnv.ui?.placeholder || `Enter your ${currentEnv.name.toLowerCase()}`}
                    className={cn(
                      "h-11 px-4",
                      touchedFields[currentEnv.env] && !envValues[currentEnv.env]?.trim()
                        ? "border-red-500 focus-visible:ring-red-200"
                        : ""
                    )}
                    defaultValue={currentEnv.ui?.defaultValue}
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
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-3 pt-2">
          {!isAddingNew && !isEditing && currentEnv.env !== "" && (
            <>
              <Button
                variant="outline"
                onClick={() => handleCancel(false)}
                disabled={isSubmitting}
                className="mr-auto"
              >
                Cancel
              </Button>
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={isSubmitting}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setIsAddingNew(true)}
                disabled={isSubmitting}
              >
                <Plus className="h-4 w-4" />
                Add New
              </Button>

              {currentStep != envVariables.length - 1 && (
                <Button
                  variant="outline"
                  onClick={handleSave}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              )}
              {currentStep === envVariables.length - 1 ? (
                <Button onClick={handleSave} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save & Finish"
                  )}
                </Button>
              ) : (
                <Button onClick={() => handleStepClick(currentStep + 1)} disabled={isSubmitting}>
                  Continue
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
