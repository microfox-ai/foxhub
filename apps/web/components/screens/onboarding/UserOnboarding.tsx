"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Code2,
  Palette,
  Rocket,
  User,
  Building2,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Form, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import React from "react";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const UserType = {
  FOUNDER: "founder",
  DEVELOPER: "developer",
  DESIGNER: "designer",
  PRODUCT_MANAGER: "product_manager",
  OTHER: "other",
  EMPTY: "",
} as const;

const onboardingSchema = z.object({
  userType: z.string().refine((val) => val !== UserType.EMPTY, {
    message: "Please select a role",
  }),
  companyName: z
    .string()
    .min(2, { message: "Company name must be at least 2 characters long" })
    .max(50, { message: "Company name must be less than 50 characters" })
    .regex(/^[a-zA-Z0-9\s-]+$/, {
      message:
        "Company name can only contain letters, numbers, spaces, and hyphens",
    })
    .default(""),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

type StepProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  isValid: boolean;
  showBack: boolean;
  isLastStep: boolean;
  onboardingStatus: "loading" | "success" | "error" | null;
};

const roleIcons = {
  founder: <Rocket className="h-5 w-5" />,
  developer: <Code2 className="h-5 w-5" />,
  designer: <Palette className="h-5 w-5" />,
  product_manager: <User className="h-5 w-5" />,
  other: <Building2 className="h-5 w-5" />,
} as const;

const motionProps = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 },
};

const StepWrapper = ({
  title,
  description,
  children,
  onBack,
  onNext,
  onSkip,
  isValid,
  showBack,
  isLastStep,
  onboardingStatus,
}: StepProps) => (
  <motion.div {...motionProps} className="space-y-4 w-full">
    <div className="space-y-1.5">
      <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      <p className="text-gray-500 text-sm">{description}</p>
    </div>

    {children}

    <div className="flex flex-col items-center gap-4">
      <div className="flex justify-between w-full">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={!showBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Skip
          </button>
          <Button
            type={isLastStep ? "submit" : "button"}
            onClick={!isLastStep ? onNext : undefined}
            disabled={!isValid || onboardingStatus === "loading"}
            className="px-8"
          >
            {onboardingStatus === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isLastStep ? (
              "Complete"
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </div>
    </div>
  </motion.div>
);

const RoleSelector = ({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) => (
  <div className="space-y-3">
    {Object.entries(roleIcons).map(([roleValue, icon]) => (
      <div
        key={roleValue}
        className={`cursor-pointer transition-all rounded-lg border-2 ${value === roleValue
            ? "border-[1.5px] border-primary bg-primary/5"
            : "hover:border-gray-300"
          }`}
        onClick={() => onChange(roleValue)}
      >
        <div className="flex items-center p-3">
          <div
            className={`rounded-lg p-1.5 ${value === roleValue
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-500"
              }`}
          >
            {icon}
          </div>
          <span className="ml-3 text-base font-medium capitalize">
            {roleValue.replace("_", " ")}
          </span>
          {value === roleValue && (
            <div className="ml-auto">
              <div className="h-4 w-4 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">
                ✓
              </div>
            </div>
          )}
        </div>
      </div>
    ))}
    {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
  </div>
);

const stepConfig = {
  1: { field: "userType", defaultValue: UserType.EMPTY },
  2: { field: "companyName", defaultValue: "" },
} as const;

const UserOnboarding = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState<
    "loading" | "success" | "error" | null
  >(null);
  const totalSteps = Object.keys(stepConfig).length;
  const { user } = useAuth();
  const router = useRouter();

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      userType: UserType.EMPTY,
      companyName: "",
    },
    mode: "onChange",
  });

  const {
    watch,
    formState: { errors },
  } = form;
  const userType = watch("userType");
  const companyName = watch("companyName");

  const onSubmit = async (data: OnboardingFormValues) => {
    setOnboardingStatus("loading");
    try {
      const response = await PortalSdk.putData("/api/users", {
        ...user,
        onboardingData: data,
        isOnboarded: true,
      });
      setOnboardingStatus("success");
      toast.success(
        "Thanks for completing the onboarding! 🎉 We'll use this information to personalize your experience."
      );
      setTimeout(() => {
        router.push("/new-project");
      }, 3000);
    } catch (error) {
      setOnboardingStatus("error");
      toast.error(
        "We couldn't save your onboarding responses. Please try again or contact support if the issue persists."
      );
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    setShowSkipDialog(true);
  };

  const handleSkipConfirm = () => {
    // Here you would typically navigate to the main app or close the onboarding
    console.log("Skipping onboarding");
    router.push("/dashboard");
  };

  const isStepValid = () => {
    if (currentStep === 1) {
      return userType !== UserType.EMPTY;
    }
    if (currentStep === 2) {
      return (companyName?.trim()?.length ?? 0) >= 2;
    }
    return false;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-full rounded-lg p-8 min-h-[500px] flex flex-col items-center justify-center relative overflow-hidden border max-w-xl mx-auto">
        <div className="mb-8 absolute top-0 left-0 w-full">
          <Progress
            value={(currentStep / totalSteps) * 100}
            className="h-1 bg-gray-100"
          />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <StepWrapper
                  title="What best describes you?"
                  description="Please choose one."
                  onBack={handleBack}
                  onNext={handleNext}
                  onSkip={handleSkip}
                  isValid={isStepValid()}
                  showBack={false}
                  isLastStep={false}
                  onboardingStatus={onboardingStatus}
                >
                  <FormField
                    control={form.control}
                    name="userType"
                    render={({ field }) => (
                      <FormItem>
                        <RoleSelector
                          value={userType}
                          onChange={field.onChange}
                          error={errors.userType?.message}
                        />
                      </FormItem>
                    )}
                  />
                </StepWrapper>
              )}

              {currentStep === 2 && (
                <StepWrapper
                  title="What's your company name?"
                  description="Enter the name of your company or organization."
                  onBack={handleBack}
                  onNext={handleNext}
                  onSkip={handleSkip}
                  isValid={isStepValid()}
                  showBack={true}
                  isLastStep={true}
                  onboardingStatus={onboardingStatus}
                >
                  <FormField
                    control={form.control}
                    name="companyName"
                    defaultValue=""
                    render={({ field }) => (
                      <FormItem>
                        <Input
                          placeholder="Enter company name"
                          {...field}
                          value={companyName}
                          className="h-11 text-base"
                        />
                        {errors.companyName && (
                          <p className="text-sm text-red-500 mt-2">
                            {errors.companyName.message}
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                </StepWrapper>
              )}
            </AnimatePresence>
          </form>
        </Form>
      </div>

      <Dialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skip Onboarding?</DialogTitle>
            <DialogDescription>
              Are you sure you want to skip the onboarding process? You can
              always complete it later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSkipDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSkipConfirm}>
              Skip Onboarding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserOnboarding;
