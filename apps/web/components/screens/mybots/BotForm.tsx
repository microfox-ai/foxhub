/* eslint-disable @next/next/no-img-element */
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useBots } from "@/components/screens/mybots/providers/BotProvider";
import BotConfigUI from "@/components/screens/mybots/BotConfigUI";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ChevronLeft, Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";
import { CLIENTSECRETSTATUS, ClientSecret } from "@prisma/client";
import { useUser } from "@/utils/hooks/useUser";

// Define the form schema
const botFormSchema = z.object({
  botName: z
    .string()
    .min(3, "Bot name must be at least 3 characters long")
    .max(10, "Bot name must be less than 20 characters long"),
  keys: z.record(z.string().optional()).optional(),
  config: z.any().optional(),
});

type BotFormValues = z.infer<typeof botFormSchema>;

interface RequiredKeyInfo {
  key: string;
  displayName: string;
  type?: string;
  description?: string;
  isOptional?: boolean;
}

interface BotInfo {
  botInfoInDb: {
    id: string;
    type: string;
    variables?: Array<{ key: string; value: string }>;
  };
  botName: string;
  botImage?: string;
  botPackageName: string;
  savedBotConfig?: any[];
  otherInfos?: {
    constructors: Array<{
      requiredKeys?: RequiredKeyInfo[];
      botConfig?: any[];
    }>;
  };
}

interface PackageInfo {
  name: string;
  icon?: string;
  constructors: Array<{
    name: string;
    requiredKeys?: RequiredKeyInfo[];
    botConfig?: any[];
    auth?: string;
  }>;
}

interface BotFormProps {
  mode: "create" | "edit";
}

const BotForm = ({ mode }: BotFormProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const botId = searchParams.get("botId");
  const packageName = searchParams.get("package");
  const { bots, nonOauthPackages, refreshBots } = useBots();
  const { selectedProject } = useClientProject();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Find the bot to edit or package to create from
  const botToEdit =
    mode === "edit" && botId
      ? bots.find((bot) => bot.botInfoInDb.id === botId)
      : null;
  const packageInfo =
    mode === "create"
      ? nonOauthPackages.find((pkg: PackageInfo) => pkg.name === packageName)
      : null;
  const selectedConstructor =
    mode === "create"
      ? packageInfo?.constructors[0]
      : botToEdit?.otherInfos?.constructors[0];

  // Set initial loading to false once data is available
  useEffect(() => {
    if (mode === "edit" && (bots.length > 0 || !botId)) {
      setIsInitialLoading(false);
    } else if (
      mode === "create" &&
      (nonOauthPackages.length > 0 || !packageName)
    ) {
      setIsInitialLoading(false);
    }
  }, [bots, nonOauthPackages, mode, botId, packageName]);

  const form = useForm<BotFormValues>({
    resolver: zodResolver(botFormSchema),
    defaultValues: {
      botName: "",
      keys: {},
      config: {},
    },
    mode: "onChange",
  });

  // Pre-fill form for edit mode
  useEffect(() => {
    if (mode === "edit" && botToEdit) {
      const initialConfig = botToEdit.savedBotConfig?.reduce(
        (acc: Record<string, any>, curr: any) => ({
          ...acc,
          [curr.field]: curr.value || "",
        }),
        {} as Record<string, any>
      );

      form.reset({
        botName: botToEdit.botName,
        keys:
          botToEdit.botInfoInDb.variables?.reduce(
            (acc: Record<string, string>, curr: any) => ({
              ...acc,
              [curr.key]: curr.value || "",
            }),
            {} as Record<string, string>
          ) || {},
        config: initialConfig || {},
      });
    }
  }, [botToEdit, form, mode]);

  const handleBack = () => {
    router.back();
  };

  const handleDelete = async () => {
    if (!botToEdit?.botInfoInDb.id) {
      toast.error("Bot ID not found");
      return;
    }

    try {
      setIsDeleting(true);
      await PortalSdk.deleteData(
        `/api/client-secrets/project-secrets?id=${botToEdit.botInfoInDb.id}`,
        {}
      );
      toast.success("Bot deleted successfully!");
      refreshBots();
      router.push("/my-bots");
    } catch (error) {
      console.error("Error deleting bot:", error);
      toast.error("Failed to delete bot. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreate = async (data: BotFormValues) => {
    if (!selectedProject?.id || !selectedConstructor) {
      toast.error("Missing required information");
      return;
    }

    setIsLoading(true);
    try {
      // Format required keys into variables array
      const variables = Object.entries(data.keys || {}).map(([key, value]) => ({
        key,
        value: value || "",
        isOptional: false,
      }));

      // Transform config data
      const configToTransform = selectedConstructor.botConfig;
      const transformedConfig = configToTransform?.map((configField: any) => ({
        ...configField,
        value: data.config?.[configField.field] || "",
      }));

      const clientSecretData = {
        botProjectId: selectedProject.id,
        name: data.botName,
        type: `${packageInfo?.name}/${selectedConstructor.name}`,
        variables,
        clientRequestIds: [],
        userId: user?.id,
        status: CLIENTSECRETSTATUS.FILLED,
        botConfig: transformedConfig,
      };

      await PortalSdk.postData(
        "/api/client-secrets/project-secrets",
        clientSecretData
      );
      toast.success("Bot created successfully!");
      refreshBots();
    } catch (error) {
      console.error("Error creating bot:", error);
      toast.error("Failed to create bot. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (data: BotFormValues) => {
    if (
      !selectedProject?.id ||
      !selectedConstructor ||
      !botToEdit?.botInfoInDb.id
    ) {
      toast.error("Missing required information");
      return;
    }

    setIsLoading(true);
    try {
      // Format required keys into variables array
      const variables = Object.entries(data.keys || {}).map(([key, value]) => ({
        key,
        value: value || "",
        isOptional: false,
      }));

      // Transform config data
      const configToTransform = botToEdit.savedBotConfig;
      const transformedConfig = configToTransform?.map((configField: any) => ({
        ...configField,
        value: data.config?.[configField.field] || "",
      }));

      const clientSecretData = {
        id: botToEdit.botInfoInDb.id,
        botProjectId: selectedProject.id,
        name: data.botName,
        type: botToEdit.botInfoInDb.type,
        variables,
        botConfig: transformedConfig,
      };

      await PortalSdk.putData(
        "/api/client-secrets/project-secrets",
        clientSecretData
      );
      toast.success("Bot updated successfully!");
      refreshBots();
    } catch (error) {
      console.error("Error updating bot:", error);
      toast.error("Failed to update bot. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: BotFormValues) => {
    if (mode === "create") {
      await handleCreate(data);
    } else {
      await handleUpdate(data);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading bot information...
          </p>
        </div>
      </div>
    );
  }

  if ((mode === "edit" && !botToEdit) || (mode === "create" && !packageInfo)) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">
            {mode === "edit" ? "Bot not found" : "Package not found"}
          </h2>
          <p className="text-gray-500">
            {mode === "edit"
              ? "Please select a valid bot to edit"
              : "Please select a valid bot package"}
          </p>
        </div>
      </div>
    );
  }

  const botImage = mode === "create" ? packageInfo?.icon : botToEdit?.botImage;
  const botName = mode === "create" ? packageInfo?.name : botToEdit?.botName;
  const requiredKeys =
    mode === "create"
      ? selectedConstructor?.requiredKeys
      : botToEdit?.otherInfos?.constructors[0]?.requiredKeys;
  const botConfig =
    mode === "create"
      ? selectedConstructor?.botConfig
      : botToEdit?.savedBotConfig;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full space-y-6 pb-40 h-screen overflow-y-auto thin-scrollbar"
      >
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-none border-none">
            <CardHeader className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <CardTitle className="text-lg font-medium">
                {mode === "create" ? "Bot Information" : "Edit Bot"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6">
                <div className="h-fit rounded-2xl overflow-hidden border border-neutral-200 p-2">
                  <img
                    src={botImage || "/default-bot-avatar.png"}
                    alt={botName}
                    className="w-32 h-w-32 object-contain"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-4">
                  <FormField
                    control={form.control}
                    name="botName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {mode === "create" ? "Name your bot" : "Bot Name"}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter bot name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {requiredKeys && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-neutral-900">
                        Required Keys
                      </h3>
                      {requiredKeys.map((keyInfo: RequiredKeyInfo) => (
                        <FormField
                          key={keyInfo.key}
                          control={form.control}
                          name={`keys.${keyInfo.key}`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">
                                {keyInfo.displayName || keyInfo.key}
                                {keyInfo.isOptional && (
                                  <span className="ml-1 text-xs text-neutral-500">
                                    (Optional)
                                  </span>
                                )}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type={keyInfo.type || "text"}
                                  placeholder={`Enter ${keyInfo.displayName || keyInfo.key}`}
                                  className="bg-white"
                                />
                              </FormControl>
                              {keyInfo.description && (
                                <p className="text-xs text-neutral-500">
                                  {keyInfo.description}
                                </p>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  )}

                  {botConfig && botConfig.length > 0 && (
                    <div className="border-t border-neutral-200 pt-4">
                      <h3 className="text-sm uppercase font-medium text-neutral-900 mb-4">
                        Bot Configuration
                      </h3>
                      <div className="space-y-2">
                        <BotConfigUI
                          packageName={
                            mode === "create"
                              ? packageName?.split("/")[1]
                              : botToEdit?.botPackageName.split("/")[1]
                          }
                          config={botConfig}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={handleBack}>
              Back
            </Button>
            <div className="flex gap-2">
              {mode === "edit" && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isLoading || isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete Bot"}
                </Button>
              )}
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? mode === "create"
                    ? "Creating..."
                    : "Saving..."
                  : mode === "create"
                    ? "Create Bot"
                    : "Update Bot"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default BotForm;
