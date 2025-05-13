import { useAuth } from "@/components/auth/AuthProvider";
import { SecretProvider } from "@/components/screens/mybots/providers/SecretProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ClientSecretPackageType, ClientSecretVariable } from "@/server/types";
import { CLIENTSECRETSTATUS, ClientSecret } from "@prisma/client";
import {
  ArrowUpRight,
  CheckIcon,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { KeyedMutator } from "swr";
import { Constructor, KeyVariableConfig, Package } from "../types";
import { SecretFormProvider, useSecretForm } from "@/components/screens/mybots/providers/SecretFormProvider";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { KeyForms } from "./KeyForms";

interface APIKeyDialogProps {
  isOpen: boolean;
  onClose: (submitted?: boolean) => void;
  pkg: Package;
  platformName: string;
  apiKeySecret?: ClientSecret;
  mutateSecrets?: KeyedMutator<{
    clientSecrets: ClientSecret[];
  }>;
}

export const APIKeyDialog = ({
  mutateSecrets,
  isOpen,
  onClose,
  platformName,
  pkg,
  apiKeySecret,
}: APIKeyDialogProps) => {
  const params = useParams<{
    project_id?: string;
    request_id?: string;
  }>();
  const projectParamId = params?.project_id;
  const requestParamId = params?.request_id;

  const constructor = pkg.constructors.find(
    (c: Constructor) => c.auth === ClientSecretPackageType.APIKEY
  );
  const packageInfo = pkg;
  const selectedConstructor = constructor;
  const requiredKeys = constructor?.requiredKeys;
  const packageName = pkg.name;

  const { form, setPackageInfo, setSelectedConstructor, onSubmit, isUpdating } = useSecretForm();

  useEffect(() => {
    if (packageInfo) {
      setPackageInfo(packageInfo)
    }
    if (selectedConstructor) {
      setSelectedConstructor(selectedConstructor)
    }
  }, [packageInfo, selectedConstructor])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => onClose(open)}>
      <DialogContent className="sm:max-w-xl">
        <Form {...form}>
          <form
            onSubmit={(e) => {
              try {
                form.handleSubmit((data) => {
                  onSubmit(data)
                    .finally(() => {
                      onClose(true)
                    })
                })(e)
              } catch (error) {
                console.error("Error submitting form:", error);
              }
            }}
            className="space-y-6 overflow-y-auto thin-scrollbar max-h-[85vh] relative"
          >
            <DialogHeader className="space-y-2">
              <DialogTitle className="flex items-center gap-4 mb-4 text-xl font-semibold">
                <img src={pkg.icon} className="h-8 w-8" />
                <div className="flex flex-col">
                  <span className="text-xl font-medium">
                    {apiKeySecret ? "Update" : "Setup"} your {platformName} Bot
                  </span>
                  <span className="text-xs text-gray-500">
                    {apiKeySecret
                      ? `Update your ${platformName} Bot configurations below`
                      : "All secrets are stored securely and used to authenticate your requests."}
                  </span>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pl-2 min-h-[200px] max-h-[400px] overflow-y-auto scrollbar-thin">
              <KeyForms
                packageInfo={packageInfo}
                packageName={packageName}
                selectedConstructor={selectedConstructor}
                onClose={onClose}
              />
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}


// {constructor?.requiredKeys?.map((keyInfo) => (
//   <div
//     key={keyInfo.key}
//     className=""
//     ref={(el) => {
//       inputRefs.current[keyInfo.key] = el;
//     }}
//   >
//     <div className="flex items-center justify-start">
//       <Key className="h-4 w-4 mr-2" />
//       <div className="flex items-center gap-2">
//         <span className="text-sm font-medium text-gray-700">
//           {keyInfo.displayName}
//         </span>
//         <TooltipProvider delayDuration={3000}>
//           <Tooltip>
//             <TooltipTrigger asChild>
//               <button
//                 type="button"
//                 className="text-gray-400 hover:text-gray-600 transition-colors"
//               >
//                 <Info className="h-4 w-4" />
//               </button>
//             </TooltipTrigger>
//             <TooltipContent
//               side="right"
//               className="max-w-[250px] text-xs bg-blue-50 text-blue-900 border border-blue-100 shadow-sm px-3 [&>svg]:hidden"
//               showArrow={false}
//             >
//               <p>{keyInfo.description}</p>
//             </TooltipContent>
//           </Tooltip>
//         </TooltipProvider>
//       </div>
//     </div>
//     <div className="relative mt-2">
//       <Input
//         id={keyInfo.key}
//         type={visibleKeys[keyInfo.key] ? "text" : "password"}
//         value={apiKeys[keyInfo.key] || ""}
//         onChange={(e) =>
//           handleInputChange(keyInfo.key, e.target.value)
//         }
//         className={`h-11 px-4 ${apiKeys[keyInfo.key] ? "pr-11" : ""} ${
//           validationErrors[keyInfo.key]
//             ? "border-red-500 focus-visible:ring-red-200"
//             : ""
//         }`}
//         placeholder={`Enter your ${keyInfo.displayName}`}
//         aria-label={keyInfo.displayName}
//       />
//       {apiKeys[keyInfo.key] && (
//         <Button
//           variant="ghost"
//           size="sm"
//           className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
//           onClick={() => toggleVisibility(keyInfo.key)}
//           type="button"
//         >
//           {visibleKeys[keyInfo.key] ? (
//             <EyeOff className="h-4 w-4 text-gray-500" />
//           ) : (
//             <Eye className="h-4 w-4 text-gray-500" />
//           )}
//         </Button>
//       )}
//     </div>
//     {validationErrors[keyInfo.key] && (
//       <div className="flex items-center gap-1 text-red-500 text-sm">
//         <AlertCircle className="h-4 w-4" />
//         <span>This field is required</span>
//       </div>
//     )}
//   </div>
// ))}