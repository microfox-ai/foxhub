import { useClientProject } from "@/components/screens/providers/ClientProjectProvider"
import { UiComponentProps } from "@/server/ui/UiComponentProps"
import { HitlInput, MyUiTool } from "@/server/ui/uiTool"
import useSWR from "swr"
import { Package } from "../types"
import { Button } from "@mui/material"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronDown, HelpCircleIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { Identity } from "@microfox/oauth-kit"
import { ClientSecret } from "@prisma/client"
import { Badge } from "@/components/ui/badge"
import { ClientSecretVariable } from "@/server/types"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useHitl } from "../uiTool/hitl/HitlProvider"
import { TaskIntegrations } from "../uiTool/card/task_integrations/TaskIntegrations"


export const HitlAuthWrapper = ({ tool, lastMessage, lastAnnotationIndices, messageIndex, children }: {
    tool: MyUiTool & {
        type: `tool-ui-${keyof UiComponentProps}` | `tool-${string}`
    },
    lastMessage: boolean
    lastAnnotationIndices: Map<string, number>,
    messageIndex: number
    children: React.ReactNode
}) => {
    const { selectedProject } = useClientProject();
    const auth = (tool.output as HitlInput).auth;
    const { auth: stateAuth, setAuth, selectSecret, refetchHitlAuth } = useHitl();
    const [popoverOpen, setPopoverOpen] = useState(false);

    const { data: packageInfos, mutate: mutatePackageInfos } = useSWR<Package[]>(
        auth ? `/api/packages/infos?packageNames=${auth?.secrets?.map(s => s.packageName).join(",")}` : null,
        async (url: string) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch packages");
            return res.json();
        }, {
        revalidateOnFocus: false,
    });

    const isSinglePackage = stateAuth?.secrets?.length === 1;
    const singlePackageSecret = stateAuth?.secrets[0];
    const singlePackage = packageInfos?.find(p => p.name === singlePackageSecret?.packageName);
    const selectedSinglePackageSecret = singlePackageSecret?.secrets.find(s => s.id === singlePackageSecret?.selectedSecretId);

    const missingSecrets = stateAuth?.secrets?.filter(s => !s.selectedSecretId && s.isAuthNeeded);

    useEffect(() => {
        if (auth) {
            setAuth(auth);
        }
    }, [auth?.secrets]);

    if (!stateAuth) {
        return <div>{children}</div>
    };


    const fetchDisplayName = (secret: ClientSecret | undefined) => {
        if (!secret) {
            return "Unknown";
        }
        if (secret.identityMetadata as Identity) {
            const identity = secret.identityMetadata as Identity;
            return identity.teamInfo?.name ?? identity.organisationInfo?.name ?? identity.userInfo?.name;
        }
        if (secret.name) {
            return secret.name;
        }
        return "Unknown";
    }

    const fetchDisplayIcon = (secret: ClientSecret | undefined) => {
        if (!secret) {
            return "/favicon_io/favicon.ico";
        }
        if (secret.identityMetadata as Identity) {
            const identity = secret.identityMetadata as Identity;
            return identity.teamInfo?.icon ?? identity.organisationInfo?.icon ?? identity.userInfo?.avatarUrl;
        }
        const botConfigVariables = secret.botConfig as any[] as ClientSecretVariable[];
        const botConfigIcon = botConfigVariables.find(v => v.key.toLowerCase().includes("icon") || v.key.toLowerCase().includes("logo"));
        if (botConfigIcon) {
            return botConfigIcon.value;
        }
        return "/favicon_io/favicon.ico";
    }

    const fetchTooltipContent = (secret: ClientSecret | undefined): string => {
        if (!secret) {
            return "No secret is selected. Please select a secret to proceed.";
        }
        let content = "";
        if (secret.packageType === "oauth2") {
            const identity = secret.identityMetadata as Identity;
            if (!identity) {
                return "No identity is selected. Please select a secret to proceed.";
            }
            const name = identity.teamInfo?.name ?? identity.organisationInfo?.name ?? identity.userInfo?.name;
            if (identity.teamInfo?.name && identity?.userInfo?.name) {
                content += `This will use the connected account for team "${identity.teamInfo?.name}" which was first made by user "${identity.userInfo?.name}".`;
            } else if (name) {
                content += `This will use the connected account for "${name}".`;
            } else {
                content += "This will use the selected connected account.";
            }
        }
        else if (secret.name) {
            content += `This will use the API Key which was configured for bot nickname "${secret.name}".`;
        }
        else {
            content += "This will use the selected secret.";
        }
        return content;
    }


    if (missingSecrets && missingSecrets?.length > 0) {
        return (
            <div className="flex flex-col my-2 bg-white shadow-md rounded-xl border border-gray-200">
                <div className="flex flex-row items-end gap-2 justify-start gap-2 border-b border-gray-200 pt-3 px-3">
                    <img src="/logo-mini-color.png" alt="Secret Icon" className="w-18 h-18" />
                    <div className="flex flex-col justify-end py-2 pl-4">
                        <div className="flex flex-row items-center gap-2 mb-1">
                            <h2 className="text-xl font-bold">Connect me.</h2>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <HelpCircleIcon className="w-4 h-4 text-gray-500 cursor-pointer" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[300px]">
                                        <p>Microfox will always ask you permission before doing any action.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <h3 className="text-sm text-gray-500">Hey ! Can you give me access,<br /> i need it to finish your request.</h3>
                    </div>
                </div>
                <div className="p-4">
                    <TaskIntegrations
                        buttons={[]}
                        object={{
                            objectType: "task_integrations",
                            object: {
                                platforms: missingSecrets.map(s => ({
                                    name: packageInfos?.find(p => p.name === s.packageName)?.title ?? s.packageName,
                                    reason: "",
                                    optional: false,
                                    package: s.packageName,
                                    scopes: [],
                                })),
                            },
                        }}
                        onAllSecretsFilled={() => {
                            refetchHitlAuth();
                        }}
                        hideMetaInfo={true}
                        hideButtons={true}
                        text=""
                        isLastInQueue={true}
                        lastMessage={false}
                    />
                </div>
            </div>
        )
    }


    return <div className="flex flex-col my-2 bg-white shadow-md rounded-xl border border-gray-200">
        {isSinglePackage && (
            <div className="flex flex-row items-start justify-between gap-2 border-b border-gray-200 py-3 px-3">
                <div className="flex flex-row gap-2">
                    <img src={singlePackage?.icon ?? "/favicon_io/favicon.ico"} alt="Project Logo" className="w-6 h-6 rounded-full" />
                    <h3 className="text-md">{singlePackage?.title}</h3>
                </div>
                {selectedSinglePackageSecret && (
                    <div className="flex flex-row gap-2 items-center">
                        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                            <PopoverTrigger asChild>
                                <div className="flex flex-row gap-2 text-black border border-gray-200 rounded-xl px-3 py-0 items-center cursor-pointer">
                                    <img src={fetchDisplayIcon(selectedSinglePackageSecret)} alt="Secret Icon" className="w-6 h-6 rounded-full" />
                                    <h3 className="text-md">{fetchDisplayName(selectedSinglePackageSecret)}</h3>
                                    <ChevronDown className="min-w-4 min-h-4 text-gray-500 mr-2" />
                                </div>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 rounded-xl">
                                <div className="flex flex-col max-h-[250px] overflow-y-auto rounded-xl">
                                    {singlePackageSecret?.secrets.map(s => (
                                        <div
                                            onClick={() => {
                                                selectSecret(s, singlePackageSecret.packageName);
                                                setPopoverOpen(false);
                                            }}
                                            key={s.id} className={cn("flex flex-row gap-2 items-center hover:bg-gray-100 p-2 rounded-xl cursor-pointer", s.id === singlePackageSecret.selectedSecretId && "bg-gray-100")}>
                                            <img src={fetchDisplayIcon(s)} alt="Secret Icon" className="w-6 h-6 rounded-full" />
                                            <h3 className="text-md">{fetchDisplayName(s)}</h3>
                                            <Badge variant="outline" className="ml-2">
                                                <span className="text-[0.8em]">{s.packageType === "oauth2" ? "Connected" : "API Key"}</span>
                                            </Badge>
                                            {
                                                s.id === singlePackageSecret.selectedSecretId && (
                                                    <Check className="ml-auto w-4 h-4 text-green-500" />
                                                )
                                            }
                                        </div>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <HelpCircleIcon className="w-4 h-4 text-gray-500 cursor-pointer" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[300px]">
                                    <p>{fetchTooltipContent(selectedSinglePackageSecret)}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                )}
            </div>
        )}
        {/* <h4 className="text-lg font-bold">{auth.metadata.summary}</h4>
        <div className="text-sm text-gray-500">
            {auth.metadata.description} So, can i call the tool {Object.keys(auth.args)?.length > 0 ? "with the below args?" : "?"}
        </div>
        {Object.keys(auth.args)?.length > 0 &&
            (<div className="font-mono bg-gray-200 p-2 rounded text-xs">
                {JSON.stringify(auth.args, null, 2)}
            </div>
            )} */}
        <div className="flex">
            {children}
        </div>
    </div >
}