import { useAuth } from "@/components/auth/AuthProvider";
import { ClientSecretVariable } from "@/server/types"
import { useFormContext } from "react-hook-form";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Constructor } from "../../../Chat/message/types";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UploadIcon, XIcon, ArrowRight, ArrowLeft, Check, Copy, Loader2, InfoIcon, CodeIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { APP_BASE_FOR_SHARD } from "@/utils/constants/appInfo";
import { useBots } from "../../providers/BotProvider";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TooltipProvider } from "@/components/ui/tooltip";
import { generateWidgetCode } from "./generateWidgetCode";

const whatsappRequiredKeys = [
    "WHATSAPP_BUSINESS_ACCOUNT_ID",
    "WHATSAPP_BUSINESS_ACCESS_TOKEN",
    "WHATSAPP_BUSINESS_PHONE_NUMBER_ID",
    "WHATSAPP_BUSINESS_PHONE_NUMBER",
]

const whatsappConfigFields = [
    "WHATSAPP_WEBHOOK_URL",
    "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
    "WHATSAPP_BUSINESS_NAME",
    "WHATSAPP_ICON_URL",
    "WHATSAPP_BUSINESS_SLUG",
    "WHATSAPP_AGENTCHAT_API_KEY",
    "WHATSAPP_AGENTCHAT_ENDPOINT",
    "WHATSAPP_WEBHOOK_VERIFIED",
]

export const WhatsAppBotConfig = ({ config, packageConstructor }: { config: ClientSecretVariable[], packageConstructor: Constructor }) => {
    const { botToEdit, refreshBotToEdit } = useBots();
    const form = useFormContext();
    const [imagePreview, setImagePreview] = useState<Record<string, string>>({});
    const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<string>("for_agents");
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 6;

    const generateSecureToken = () => {
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        return btoa(String.fromCharCode(...Array.from(array)))
            .replace(/[+/]/g, "")
            .substring(0, 32);
    };

    const uploadImage = async (file: File, fieldKey: string) => {
        try {
            setIsUploading((prev) => ({ ...prev, [fieldKey]: true }));
            const formData = new FormData();
            formData.append("file", file);
            formData.append("userId", user?.id || "");
            formData.append("folderName", "customBots/botConfigs");

            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Upload failed");
            }

            const data = await response.json();

            if (!data.success || !data.media || data.media.length === 0) {
                throw new Error("Invalid response format");
            }

            const uploadedUrl = data.media[0].mediaUrl;
            form.setValue(`config.${fieldKey}`, uploadedUrl);
            toast.success("Image uploaded successfully");
            return uploadedUrl;
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Failed to upload image");
            return null;
        } finally {
            setIsUploading((prev) => ({ ...prev, [fieldKey]: false }));
        }
    };

    const handleNext = () => {
        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSave = () => {
        toast.success(`Step ${currentStep} configuration saved successfully`);
    };

    const handleSetupHandshake = async () => {
        try {
            const handshake = {
                "WHATSAPP_BUSINESS_ACCOUNT_ID": form.getValues("keys.WHATSAPP_BUSINESS_ACCOUNT_ID"),
                "WHATSAPP_BUSINESS_ACCESS_TOKEN": form.getValues("keys.WHATSAPP_BUSINESS_ACCESS_TOKEN"),
            }
            console.log(handshake);
            const response = await fetch(`https://graph.facebook.com/v22.0/${handshake["WHATSAPP_BUSINESS_ACCOUNT_ID"]}/subscribed_apps`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${handshake["WHATSAPP_BUSINESS_ACCESS_TOKEN"]}`,
                },
                body: JSON.stringify({
                }),
            });
            if (!response.ok) {
                throw new Error("Setup handshake failed");
            }
            const data = await response.json();
            if (data.success) {
                handleNext();
                toast.success("Setup handshake completed successfully");
            } else {
                throw new Error("Setup handshake failed");
            }
        } catch (error) {
            console.error("Setup handshake failed:", error);
            toast.error("Setup handshake failed");
        }
    }

    useEffect(() => {
        if (botToEdit?.id) {
            form.setValue("config.WHATSAPP_WEBHOOK_URL", `${APP_BASE_FOR_SHARD}/api/webhooks/${botToEdit.id}/whatsapp`);
        }
    }, [botToEdit]);

    // Add polling effect for webhook verification
    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        if (currentStep === 2 && !botToEdit?.botConfigMapped?.WHATSAPP_WEBHOOK_VERIFIED) {
            intervalId = setInterval(() => {
                refreshBotToEdit();
            }, 1000);
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [currentStep, botToEdit?.botConfigMapped?.WHATSAPP_WEBHOOK_VERIFIED, refreshBotToEdit]);

    // console.log(botToEdit);
    useEffect(() => {
        if (botToEdit?.botConfigMapped?.WHATSAPP_ICON_URL) {
            setImagePreview((prev) => ({
                ...prev,
                WHATSAPP_ICON_URL: botToEdit?.botConfigMapped?.WHATSAPP_ICON_URL,
            }));
        }
    }, [botToEdit?.botConfigMapped]);

    if (!botToEdit?.id) {
        return null;
    }

    const isWhatsappWebhookVerified = botToEdit?.botConfigMapped?.WHATSAPP_WEBHOOK_VERIFIED;

    return (
        <div>
            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
            >
                <TabsList className="flex flex-row justify-start gap-2 mb-8 px-2">
                    <TabsTrigger value="for_agents"
                        className={`py-2 px-4 rounded-md ${activeTab === "for_agents" ? "bg-green-300 text-white" : " text-gray-600"}`}
                    >For Agents</TabsTrigger>
                    <TabsTrigger value="configuration"
                        className={`py-2 px-4 rounded-md ${activeTab === "configuration" ? "bg-green-300 text-white" : " text-gray-600"}`}
                    >
                        General
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="for_agents">
                    <div className="space-y-6">
                        {/* Progress Bar */}
                        <div className="w-full space-y-2">
                            <Progress value={(currentStep / totalSteps) * 100} />
                            <div className="text-sm text-gray-500">
                                Step {currentStep} of {totalSteps}
                            </div>
                        </div>

                        {/* Step 1: Webhook Configuration */}
                        {currentStep === 1 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Webhook Configuration</CardTitle>
                                    <CardDescription>Configure your WhatsApp webhook settings</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 py-4 px-8">
                                    <FormField
                                        control={form.control}
                                        name="config.WHATSAPP_WEBHOOK_URL"
                                        defaultValue={`${APP_BASE_FOR_SHARD}/api/webhooks/${botToEdit.id}/whatsapp`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Webhook Callback URL

                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <InfoIcon className="h-4 w-4" />
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                The URL where WhatsApp will send webhook events
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </FormLabel>
                                                <FormControl>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            placeholder="https://your-webhook-url.com"
                                                            {...field}
                                                            disabled={isWhatsappWebhookVerified}
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(form.getValues("config.WHATSAPP_WEBHOOK_URL"))
                                                                toast.success("Webhook URL copied to clipboard");
                                                            }}
                                                        >
                                                            <Copy className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="config.WHATSAPP_WEBHOOK_VERIFY_TOKEN"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Webhook Verify Token
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <InfoIcon className="h-4 w-4" />
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                The token used to verify webhook requests
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </FormLabel>
                                                <div className="flex gap-2">
                                                    <FormControl>
                                                        <Input {...field}
                                                            disabled={isWhatsappWebhookVerified}
                                                        />
                                                    </FormControl>
                                                    {!isWhatsappWebhookVerified && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => {
                                                                const token = generateSecureToken();
                                                                form.setValue("config.WHATSAPP_WEBHOOK_VERIFY_TOKEN", token);
                                                            }}
                                                        >
                                                            Generate Token
                                                        </Button>
                                                    )}
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(form.getValues("config.WHATSAPP_WEBHOOK_VERIFY_TOKEN"));
                                                            toast.success("Verify token copied to clipboard");
                                                        }}
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>
                        )}

                        {/** Step 2: Check if the webhook is verified */}
                        {currentStep === 2 && (
                            <Card className={cn(
                                "transition-all duration-500",
                                botToEdit?.botConfigMapped?.WHATSAPP_WEBHOOK_VERIFIED ? "bg-green-50" : ""
                            )}>
                                <CardContent>
                                    <div className="flex flex-col items-center justify-center gap-6 ">
                                        <div className={cn(
                                            "w-full p-6 rounded-lg text-center transition-all duration-500",
                                            botToEdit?.botConfigMapped?.WHATSAPP_WEBHOOK_VERIFIED
                                                ? "bg-green-100 scale-105"
                                                : "bg-gray-50"
                                        )}>
                                            {botToEdit?.botConfigMapped?.WHATSAPP_WEBHOOK_VERIFIED ? (
                                                <div className="space-y-4">
                                                    <Check className="h-12 w-12 text-green-500 mx-auto animate-bounce" />
                                                    <h3 className="text-lg font-semibold text-green-700">
                                                        Webhook Successfully Verified!
                                                    </h3>
                                                    <p className="text-green-600">
                                                        Your WhatsApp webhook is now active and ready to receive messages.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <Loader2 className="h-12 w-12 text-green-500 mx-auto animate-spin" />
                                                    <h3 className="text-lg font-semibold text-gray-700">
                                                        Waiting for Webhook Verification...
                                                    </h3>
                                                    <p className="text-gray-600">
                                                        Please complete the webhook verification process in your WhatsApp {">"} Configuration {">"} Verify & Save
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/** Step 3: handshake */}
                        {currentStep === 3 && (
                            <Card className={cn(
                                "transition-all duration-500", ""
                            )}>
                                <CardHeader>
                                    <CardTitle>Activate Webhook</CardTitle>
                                    <CardDescription>Enable message subscriptions for your WhatsApp webhook</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className=" py-2 text-neutral-800">
                                        <ol className="list-decimal list-inside space-y-2 text-sm">
                                            <li>Go to your WhatsApp Business Platform</li>
                                            <li>Navigate to Configuration {">"} Webhooks</li>
                                            <li>Enable "Messages" subscription</li>
                                            <li>Return here and click "Activate Webhook" below</li>
                                        </ol>
                                    </div>

                                    <div className={cn(
                                        "w-full flex flex-col items-end justify-end rounded-lg text-center transition-all duration-500", ""
                                    )}>
                                        <Button
                                            onClick={handleSetupHandshake}
                                            size="lg"
                                            className="gap-2"
                                        >
                                            <Check className="h-5 w-5" />
                                            Activate Webhook
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 2: Business Information */}
                        {currentStep === 4 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Business Information</CardTitle>
                                    <CardDescription>Set up your WhatsApp business profile</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex flex-row items-start gap-6">
                                        <div className="w-1/3">
                                            <FormField
                                                control={form.control}
                                                name="config.WHATSAPP_ICON_URL"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Business Icon</FormLabel>
                                                        <FormControl>
                                                            <div className="space-y-2">
                                                                {imagePreview["WHATSAPP_ICON_URL"] ? (
                                                                    <div className="mt-2 border rounded-md p-2">
                                                                        <img
                                                                            src={imagePreview["WHATSAPP_ICON_URL"]}
                                                                            alt="Business Icon Preview"
                                                                            className="max-h-40 object-contain"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div className="mt-2 border rounded-md p-2">
                                                                        <img
                                                                            src={"/images/default-bot-avatar.png"}
                                                                            alt="Business Icon Preview"
                                                                            className="max-h-40 object-contain"
                                                                        />
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center gap-2">
                                                                    <Input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={async (e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) {
                                                                                const reader = new FileReader();
                                                                                reader.onloadend = () => {
                                                                                    setImagePreview((prev) => ({
                                                                                        ...prev,
                                                                                        WHATSAPP_ICON_URL: reader.result as string,
                                                                                    }));
                                                                                };
                                                                                reader.readAsDataURL(file);

                                                                                const uploadedUrl = await uploadImage(file, "WHATSAPP_ICON_URL");
                                                                                if (uploadedUrl) {
                                                                                    field.onChange(uploadedUrl);
                                                                                    form.setValue("config.WHATSAPP_ICON_URL", uploadedUrl);
                                                                                }
                                                                            }
                                                                        }}
                                                                        className="hidden"
                                                                        id="whatsapp-icon-upload"
                                                                    />
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        onClick={() => document.getElementById('whatsapp-icon-upload')?.click()}
                                                                        disabled={isUploading["WHATSAPP_ICON_URL"]}
                                                                    >
                                                                        {isUploading["WHATSAPP_ICON_URL"] ? (
                                                                            <>Uploading...</>
                                                                        ) : (
                                                                            <>
                                                                                <UploadIcon className="h-4 w-4 mr-2" />
                                                                                Upload Icon
                                                                            </>
                                                                        )}
                                                                    </Button>

                                                                    {imagePreview["WHATSAPP_ICON_URL"] && (
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => {
                                                                                setImagePreview((prev) => {
                                                                                    const newState = { ...prev };
                                                                                    delete newState["WHATSAPP_ICON_URL"];
                                                                                    return newState;
                                                                                });
                                                                                field.onChange("");
                                                                            }}
                                                                        >
                                                                            <XIcon className="h-4 w-4" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <div className="flex-1 space-y-4">
                                            <FormField
                                                control={form.control}
                                                name="config.WHATSAPP_BUSINESS_NAME"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Business Name</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Your Business Name" {...field} />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="config.WHATSAPP_BUSINESS_SLUG"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Business Slug</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="your-business-slug"
                                                                pattern="^[a-z_-]*$"
                                                                onChange={(e) => {
                                                                    const value = e.target.value.toLowerCase().replace(/[^a-z_-]/g, '');
                                                                    field.onChange(value);
                                                                }}
                                                                value={field.value || ''}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />


                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/** Step 5: Agent User Registering Configuration */}
                        {currentStep === 5 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Widget Popup</CardTitle>
                                    <CardDescription>Open this widget URL as a popup for When users first connect their whatsapp number, link it to a particular userId in your database, so you can process their whatsapp messages later on.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 w-full">
                                            <h4 className="text-sm font-medium">Widget URL</h4>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <InfoIcon className="h-4 w-4" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        Share this URL as a popup in your web app to let your users connect with your web app / agent.
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="ml-auto"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(generateWidgetCode(form.getValues("config.WHATSAPP_BUSINESS_SLUG") || '[business-slug]', botToEdit.id, form.getValues("config.WHATSAPP_BUSINESS_NAME") || '[business-name]'))
                                                    toast.success("Widget URL copied to clipboard");
                                                }}
                                            >
                                                Copy Widget Code
                                                <CodeIcon className="h-4 w-4 ml-2" />
                                            </Button>
                                        </div>
                                        <div className="relative">
                                            <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg font-mono text-sm overflow-x-auto whitespace-pre-wrap break-all">
                                                <code>{`${APP_BASE_FOR_SHARD}/widget/${form.getValues("config.WHATSAPP_BUSINESS_SLUG") || '[business-slug]'}/whatsapp?clientSecretId=${botToEdit.id}&businessUserId=[YOUR_INNER_USER_ID]&callbackUri=[YOUR_CALLBACK_URL_TO_LINK_NUMBER_TO_USER_ID]`}</code>
                                            </pre>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="absolute top-2 right-2 bg-gray-800 hover:bg-gray-700 border-gray-700"
                                                onClick={() => {
                                                    const widgetUrl = `${APP_BASE_FOR_SHARD}/widget/${form.getValues("config.WHATSAPP_BUSINESS_SLUG")}/whatsapp?clientSecretId=${botToEdit.id}&businessUserId=[YOUR_INNER_USER_ID]&callbackUri=[YOUR_CALLBACK_URL_TO_LINK_NUMBER_TO_USER_ID]`;
                                                    navigator.clipboard.writeText(widgetUrl);
                                                    toast.success("Widget URL copied to clipboard");
                                                }}
                                            >
                                                <Copy className="h-4 w-4 text-gray-300" />
                                            </Button>
                                        </div>
                                        <p className="text-sm text-gray-500">
                                            Callback URL cannot be a localhost URL, please use a publicly accesible https URL - as it gets called from the whatsapp webhook.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}


                        {/* Step 6: Agent Chat Configuration */}
                        {currentStep === 6 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Agent Chat Configuration</CardTitle>
                                    <CardDescription>Configure your agent chat settings</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="config.WHATSAPP_AGENTCHAT_API_KEY"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Agent Chat API Key</FormLabel>
                                                <FormControl>
                                                    <Input type="password" {...field} />
                                                </FormControl>
                                                <FormDescription>Your agent chat API key for authentication</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="config.WHATSAPP_AGENTCHAT_ENDPOINT"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Agent Chat Endpoint</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="https://api.agentchat.com" {...field} />
                                                </FormControl>
                                                <FormDescription>The endpoint URL for your agent chat service</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex justify-between pt-4">
                            <Button
                                variant="outline"
                                onClick={handlePrevious}
                                disabled={currentStep === 1}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Previous
                            </Button>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={handleSave}
                                    type="submit"
                                >
                                    <Check className="mr-2 h-4 w-4" />
                                    Save Progress
                                </Button>
                                {currentStep < totalSteps ? (
                                    <Button
                                        onClick={handleNext}
                                        type="submit"
                                    >
                                        Next
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleSave}
                                        variant="default"
                                    >
                                        <Check className="mr-2 h-4 w-4" />
                                        Complete Setup
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="configuration">
                    {/* Add your general configuration content here */}
                </TabsContent>
            </Tabs>
        </div>
    );
};