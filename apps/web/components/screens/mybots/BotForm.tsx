/* eslint-disable @next/next/no-img-element */
"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useBots } from "@/components/screens/mybots/providers/BotProvider";
import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientSecretVariable } from "@/server/types";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { zodResolver } from "@hookform/resolvers/zod";
import { CLIENTSECRETSTATUS } from "@prisma/client";
import { ArrowLeft, CheckIcon, Loader2, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Constructor, Package } from "../Chat/message/types";
import GeneralTab from "./tabs/GeneralTab";
import JobsTab from "./tabs/JobsTab";
import { botFormSchema, BotFormValues } from "./types";

interface BotFormProps {
  mode: "create" | "edit";
}

const BotForm = ({ mode }: BotFormProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const botId = searchParams.get("botId");
  const packageName = searchParams.get("package");
  const { bots, stableBotPackages, refreshBots, botToEdit, packageInfo, selectedConstructor, refreshBotToEdit } = useBots();
  const { selectedProject } = useClientProject();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>(
    {}
  );
  const [activeTab, setActiveTab] = useState("general");


  // Set initial loading to false once data is available
  useEffect(() => {
    if (mode === "edit" && (bots.length > 0 || !botId)) {
      setIsInitialLoading(false);
    } else if (
      mode === "create" &&
      (stableBotPackages.length > 0 || !packageName)
    ) {
      setIsInitialLoading(false);
    }
  }, [bots, stableBotPackages, mode, botId, packageName]);

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
      const initialConfig = (botToEdit.botConfig as any[])?.reduce(
        (acc: Record<string, any>, curr: ClientSecretVariable) => ({
          ...acc,
          [curr.key]: curr.value || curr.defaultValue || "",
        }),
        {} as Record<string, any>
      );

      form.reset({
        botName: botToEdit?.name,
        keys:
          botToEdit.variables?.reduce(
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
    if (!botToEdit?.id) {
      toast.error("Bot ID not found");
      return;
    }

    if (botToEdit.clientRequestIds.length > 0) {
      toast.error("Bot has running jobs. Please delete them first.");
      return;
    }

    if (botToEdit.clientDeploymentIds.length > 0) {
      toast.error("Bot has running deployments. Please delete them first.");
      return;
    }

    try {
      setIsDeleting(true);
      await PortalSdk.deleteData(
        `/api/client-secrets/project-secrets?id=${botToEdit.id}`,
        {}
      );
      toast.success("Bot deleted successfully!");
      refreshBots();
      refreshBotToEdit();
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
      const defaultConfig = selectedConstructor.botConfig || [];
      let botConfig: ClientSecretVariable[] = [];

      defaultConfig.forEach((configField: ClientSecretVariable) => {
        if (data.config?.[configField.key]) {
          botConfig.push({
            ...configField,
            value: data.config?.[configField.key] || "",
          });
        }
      });

      const clientSecretData = {
        botProjectId: selectedProject.id,
        name: data.botName,
        type: `${packageInfo?.name}/${selectedConstructor.name}`,
        variables,
        clientRequestIds: [],
        userId: user?.id,
        status: CLIENTSECRETSTATUS.FILLED,
        packageName: packageInfo?.name,
        packageConstructor: (selectedConstructor as Constructor).name,
        packageType: (selectedConstructor as Constructor).auth,
        botConfig,
      };

      await PortalSdk.postData(
        "/api/client-secrets/project-secrets",
        clientSecretData
      );
      toast.success("Bot created successfully!");
      refreshBots();
      refreshBotToEdit();
    } catch (error) {
      console.error("Error creating bot:", error);
      toast.error("Failed to create bot. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (data: BotFormValues) => {
    if (!selectedProject?.id || !selectedConstructor || !botToEdit?.id) {
      toast.error("Missing required information");
      return;
    }

    setIsLoading(true);
    console.log("data", data);
    try {
      // Format required keys into variables array
      const variables = Object.entries(data.keys || {}).map(([key, value]) => ({
        key,
        value: value || "",
        isOptional: false,
      }));

      // Transform config data
      let botConfig = botToEdit.botConfig as any[] as ClientSecretVariable[];
      const defaultConfig = botToEdit.defaultConfig;
      defaultConfig.forEach((configField: ClientSecretVariable) => {
        if (data.config?.[configField.key]) {
          if (
            botConfig.find(
              (c: ClientSecretVariable) => c.key === configField.key
            )
          ) {
            botConfig = botConfig.map((c: ClientSecretVariable) =>
              c.key === configField.key
                ? { ...c, value: data.config?.[configField.key] }
                : c
            );
          } else {
            botConfig.push({
              ...configField,
              value: data.config?.[configField.key],
            });
          }
        }
      });

      // TODO: also update changed values accroos client deployments if needed.
      const clientSecretData = {
        id: botToEdit.id,
        name: data.botName,
        variables,
        botConfig,
      };

      await PortalSdk.putData("/api/client-secrets", clientSecretData);
      toast.success("Bot updated successfully!");
      refreshBots();
      refreshBotToEdit();
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

  const toggleVisibility = (key: string) => {
    setVisibleFields((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const copyToClipboard = (value: string, fieldName: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${fieldName} copied to clipboard`);
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

  const botImage = mode === "create" ? packageInfo?.icon : botToEdit?.image;
  const botName = mode === "create" ? packageInfo?.name : botToEdit?.name;
  const requiredKeys =
    mode === "create"
      ? selectedConstructor?.requiredKeys
      : botToEdit?.packageInfo?.constructors[0]?.requiredKeys;

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
              <div className="flex gap-2 ml-auto">
                {(form.formState.isDirty || mode === "create") && (
                  <Button
                    type="submit"
                    disabled={isLoading}
                    variant="ghost"
                    className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border border-green-200 hover:border-green-300"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {mode === "create" ? "Creating..." : "Saving..."}
                      </>
                    ) : (
                      <>
                        {mode === "create" ? (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Bot
                          </>
                        ) : (
                          <>
                            <CheckIcon className="h-4 w-4 mr-2" />
                            Update Bot
                          </>
                        )}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6">
                <div className="flex flex-col items-start gap-2">
                  <div className="h-fit rounded-2xl overflow-hidden border border-neutral-200 p-2">
                    <img
                      src={botImage ?? "/images/default-bot-avatar.png"}
                      alt={botName}
                      className="w-24 h-24 object-cover"
                    />
                  </div>
                  <h3 className="text-sm font-medium text-neutral-900">
                    {botName}
                  </h3>
                </div>
                <div className="flex-1">
                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full"
                  >
                    <TabsList className="w-full flex flex-row justify-start gap-2">
                      <TabsTrigger value="general">General</TabsTrigger>
                      <TabsTrigger value="configuration">
                        Configuration
                      </TabsTrigger>
                      <TabsTrigger value="jobs">Jobs</TabsTrigger>
                    </TabsList>
                    <TabsContent value="general">
                      <GeneralTab
                        form={form}
                        requiredKeys={requiredKeys}
                        visibleFields={visibleFields}
                        toggleVisibility={toggleVisibility}
                        copyToClipboard={copyToClipboard}
                        mode={mode}
                        onDeleteBot={handleDelete}
                        isDeleting={isDeleting}
                        packageName={packageInfo?.name || ""}
                        botToEdit={botToEdit}
                        selectedConstructor={selectedConstructor}
                        packageInfo={packageInfo}
                      />
                    </TabsContent>
                    <TabsContent value="configuration">
                      <div></div>
                    </TabsContent>
                    <TabsContent value="jobs">
                      <JobsTab clientRequestIds={botToEdit?.clientRequestIds} />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={handleBack}>
              Back
            </Button>
            <div className="flex gap-2">
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
          </div> */}
        </div>
      </form>
    </Form>
  );
};

export default BotForm;
