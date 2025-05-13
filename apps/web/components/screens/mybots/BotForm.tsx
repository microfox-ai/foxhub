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
import SettingsTab from "./tabs/SettingsTab";
import { useSecretForm } from "./providers/SecretFormProvider";
import { useSecret } from "./providers/SecretProvider";

interface BotFormProps {
  mode: "create" | "edit";
}

const BotForm = ({ mode }: BotFormProps) => {
  const searchParams = useSearchParams();
  const botId = searchParams.get("botId");
  const packageName = searchParams.get("package");
  const { bots, stableBotPackages, refreshBots, botToEdit, isLoadingBotToEdit } = useBots();
  const { form, onSubmit, isDeleting, isUpdating, handleDelete, setPackageInfo, setSelectedConstructor } = useSecretForm();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("general");
  const router = useRouter();

  // Set initial loading to false once data is available
  useEffect(() => {
    if (mode === "edit" && (bots.length > 0 || !botId || botToEdit)) {
      setIsInitialLoading(false);
    } else if (
      mode === "create" &&
      (stableBotPackages.length > 0 || !packageName)
    ) {
      setIsInitialLoading(false);
    }
  }, [bots, stableBotPackages, mode, botId, packageName, botToEdit]);

  const packageInfo =
    mode === "create"
      ? stableBotPackages.find((pkg: Package) => pkg.name === packageName)
      : botToEdit?.packageInfo;

  const selectedConstructor =
    mode === "create"
      //TODO: make this selectable in UI instead of auto setting to 0 index
      ? packageInfo?.constructors[0]
      : botToEdit?.packageInfo?.constructors?.find((constructor: Constructor) => constructor.name === botToEdit?.packageConstructor);

  useEffect(() => {
    if (packageInfo) {
      setPackageInfo(packageInfo)
    }
    if (selectedConstructor) {
      setSelectedConstructor(selectedConstructor)
    }
  }, [packageInfo, selectedConstructor])


  if (isInitialLoading || isLoadingBotToEdit) {
    return (
      <div className="flex h-screen items-center justify-center">
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
        onSubmit={(e) => {
          try {
            form.handleSubmit(onSubmit)(e)
            refreshBots()
          } catch (error) {
            console.error("Error submitting form:", error);
          }
        }}
        className="max-w-3xl mx-auto space-y-6 overflow-y-auto thin-scrollbar max-h-[85vh] relative"
      >
        <div className="flex flex-col items-start gap-2 fixed top-30">
          <div className="rounded-2xl overflow-hidden border border-neutral-200 p-2">
            <img
              src={botImage ?? "/images/default-bot-avatar.png"}
              alt={botName}
              className="w-24 h-24 object-cover"
            />
          </div>
          <h3 className="text-sm font-medium text-neutral-900">
            {botName}
          </h3>

          <div className="flex gap-2 ml-auto">
            {(form.formState.isDirty || mode === "create") && (
              <Button
                type="submit"
                disabled={isUpdating}
                variant="ghost"
                className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border border-green-200 hover:border-green-300"
              >
                {isUpdating ? (
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
        </div>
        <div className="ml-[125px] flex gap-6 px-10 py-10">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="sticky top-0 bg-white">
              <TabsList className="flex flex-row justify-start gap-2 mb-4 ">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="jobs">Jobs</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="general">
              <GeneralTab
                form={form}
                requiredKeys={requiredKeys}
                packageName={packageInfo?.name || ""}
                packageInfo={packageInfo}
                selectedConstructor={selectedConstructor}
              />
            </TabsContent>
            <TabsContent value="settings">
              <SettingsTab
                mode={mode}
                onDeleteBot={async () => {
                  try {
                    await handleDelete()
                    router.push("/my-bots");
                  } catch (error) {
                    console.error("Error deleting bot:", error);
                  }
                }}
                isDeleting={isDeleting}
                botToEdit={botToEdit}
              />
            </TabsContent>
            <TabsContent value="jobs">
              <JobsTab clientRequestIds={botToEdit?.clientRequestIds} />
            </TabsContent>
          </Tabs>
        </div>
      </form>
    </Form>
  );
};

export default BotForm;
