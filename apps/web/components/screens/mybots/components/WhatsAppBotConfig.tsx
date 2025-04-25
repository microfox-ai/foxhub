import { useAuth } from "@/components/auth/AuthProvider";
import { ClientSecretVariable } from "@/server/types"
import { useFormContext } from "react-hook-form";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Constructor } from "../../Chat/message/types";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UploadIcon, XIcon, ArrowRight, ArrowLeft, Check, Copy, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { APP_BASE_FOR_SHARD } from "@/utils/constants/appInfo";
import { useBots } from "../providers/BotProvider";
import { cn } from "@/lib/utils";

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
    const totalSteps = 5;

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
                "WHATSAPP_BUSINESS_ACCOUNT_ID": form.getValues("config.WHATSAPP_BUSINESS_ACCOUNT_ID"),
                "WHATSAPP_BUSINESS_ACCESS_TOKEN": form.getValues("config.WHATSAPP_BUSINESS_ACCESS_TOKEN"),
            }
            const response = await fetch(`https://graph.facebook.com/v22.0/${handshake["WHATSAPP_BUSINESS_ACCOUNT_ID"]}/subscribed_apps`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${handshake["WHATSAPP_BUSINESS_ACCESS_TOKEN"]}`,
                },
            });
            if (!response.ok) {
                throw new Error("Setup handshake failed");
            }
            const data = await response.json();
            if (data.success) {
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
            form.setValue("config.WHATSAPP_WEBHOOK_URL", `${APP_BASE_FOR_SHARD}/webhooks/${botToEdit.id}/whatsapp`);
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

    if (!botToEdit?.id) {
        return null;
    }

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
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="config.WHATSAPP_WEBHOOK_URL"
                                        defaultValue={`${APP_BASE_FOR_SHARD}/webhooks/${botToEdit.id}/whatsapp`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Webhook URL</FormLabel>
                                                <FormControl>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            placeholder="https://your-webhook-url.com"
                                                            {...field}
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
                                                <FormDescription>The URL where WhatsApp will send webhook events</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="config.WHATSAPP_WEBHOOK_VERIFY_TOKEN"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Webhook Verify Token</FormLabel>
                                                <div className="flex gap-2">
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
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
                                                <FormDescription>Token used to verify webhook requests</FormDescription>
                                                <FormMessage />
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

                        {/* Step 2: Business Information */}
                        {currentStep === 3 && (
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
                                                        <FormMessage />
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
                                                        <FormDescription>Used in URLs and API endpoints</FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 3: Agent Chat Configuration */}
                        {currentStep === 4 && (
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