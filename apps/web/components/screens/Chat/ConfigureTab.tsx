import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
    Package,
    Key,
    Trash2,
    Eye,
    EyeOff,
    Edit,
    LayoutDashboard,
    Clock,
    CheckCircle,
    XCircle,
    Loader2,
    ArrowRight,
    Split,
} from "lucide-react";
import useSWR from "swr";
import { toast } from "sonner";
import { EnvVariablesDialog } from "./message/EnvVariablesDialog";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ClientDeployment, TaskInstanceMeta } from "@prisma/client";
import { PortalSdk } from "@/utils/services/PortalSdk";
import dayjs from "dayjs";
import { useTaskInstanceMetaContext } from "../providers/TaskInstanceMetaProvider";
import { useClientProject } from "../providers/ClientProjectProvider";
import { prettyPrintDuration } from "@/utils/helpers/prettyprint";
import { getMethodColor } from "../PreviewWindow/utils";
import { HttpMethod } from "../PreviewWindow/types";
import { useLayout } from "../providers/LayoutProvider";
import { useApiDoc } from "../providers/ApiDocProvider";
import { APIKeyDialog } from "./message/secrets/APIKeyDialog";

interface ClientSecret {
    id: string;
    name: string;
    type: string;
    variables: Array<{
        key: string;
        value: string;
        isOptional: boolean;
    }>;
}

interface ActionButtonProps {
    icon: React.ReactNode;
    onClick: () => void;
    tooltip: string;
    className?: string;
}

interface DeployStep {
    status: string;
    metadata: {
        [key: string]: string;
    };
    startTime: string;
    endTime: string;
}

const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
        case "success":
            return {
                bg: "bg-green-50",
                border: "border-green-100",
                text: "text-green-700",
                badge: "bg-green-50 text-green-700 border-green-100",
                icon: "text-green-500",
            };
        case "failed":
            return {
                bg: "bg-red-50",
                border: "border-red-100",
                text: "text-red-700",
                badge: "bg-red-50 text-red-700 border-red-100",
                icon: "text-red-500",
            };
        case "in_progress":
            return {
                bg: "bg-blue-50",
                border: "border-blue-100",
                text: "text-blue-700",
                badge: "bg-blue-50 text-blue-700 border-blue-100",
                icon: "text-blue-500",
            };
        default:
            return {
                bg: "bg-gray-50",
                border: "border-gray-100",
                text: "text-gray-700",
                badge: "bg-gray-50 text-gray-700 border-gray-100",
                icon: "text-gray-500",
            };
    }
};

const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
        case "success":
            return <CheckCircle className="w-5 h-5" />;
        case "failed":
            return <XCircle className="w-5 h-5" />;
        case "in_progress":
            return <Loader2 className="w-5 h-5 animate-spin" />;
        default:
            return <Clock className="w-5 h-5 " />;
    }
};

const DeployStatus = ({
    deployStep,
    clientDeployment,
}: {
    deployStep: DeployStep | null;
    clientDeployment: ClientDeployment | null;
}) => {
    if (!deployStep)
        return (
            <div className="mb-8 p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all ">
                <div className="flex flex-col space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 border border-gray-100">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Deployment Pending
                                </h3>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );

    const startTime = dayjs(deployStep.startTime);
    const endTime = deployStep.endTime ? dayjs(deployStep.endTime) : null;
    const duration = prettyPrintDuration(
        deployStep.startTime,
        deployStep.endTime
    );

    const status = deployStep.status?.toLowerCase();
    const statusColors = getStatusColor(status || "");
    const StatusIcon = () => getStatusIcon(status || "");
    console.log(clientDeployment, "clientDeployment");
    return (
        <div className="mb-8 p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex flex-col space-y-6">
                {/* Header Section */}
                <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                        <div
                            className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center",
                                statusColors.bg
                            )}
                        >
                            <div className={statusColors.icon}>
                                <StatusIcon />
                            </div>
                        </div>
                        <div className={cn(status !== "success" && "self-center")}>
                            <h3 className="text-lg font-semibold text-gray-900">
                                {status === "failed" && "Deployment Failed"}
                                {status === "success" && "Successfully Deployed 🎉"}
                                {status === "in_progress" && "Deployment Pending"}
                            </h3>
                            {status === "success" && duration && (
                                <p className="text-sm text-gray-500">Completed in {duration}</p>
                            )}
                        </div>
                    </div>
                    {/* <div className="flex items-center gap-2">
            <div
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium capitalize",
                statusColors.badge
              )}
            >
              {status}
            </div>
          </div> */}
                    {clientDeployment?.stage && (
                        <div className="px-3 w-fit py-1 first-letter:capitalize self-start  rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            {clientDeployment.stage}
                        </div>
                    )}
                </div>

                {/* Timeline Section */}
                <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                        <div className="min-w-[120px] text-sm font-medium text-gray-500">
                            Start Time
                        </div>
                        <div className="flex-1">
                            <pre className="text-gray-900 text-xs">
                                {startTime.format("MMMM D, YYYY, h:mm:ss A")}
                            </pre>
                        </div>
                    </div>

                    {endTime && (
                        <div className="flex items-center space-x-4">
                            <div className="min-w-[120px] text-sm font-medium text-gray-500">
                                End Time
                            </div>
                            <div className="flex-1">
                                <pre className="text-gray-900 text-xs">
                                    {endTime.format("MMMM D, YYYY, h:mm:ss A")}
                                </pre>
                            </div>
                        </div>
                    )}

                    {/* {deployStep.metadata &&
            Object.keys(deployStep.metadata).length > 0 && (
              <div className="flex items-start space-x-4">
                <div className="min-w-[120px] text-sm font-medium text-gray-500">
                  Details
                </div>
                <div className="flex-1 space-y-2">
                  {Object.entries(deployStep.metadata).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-700 capitalize">
                        {key}:
                      </span>
                      <span className="text-gray-600">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )} */}
                </div>
            </div>
        </div>
    );
};

const EndpointCard = ({
    endpoint,
    onClick,
}: {
    endpoint: {
        path: string;
        method: HttpMethod;
        title: string;
        operationId?: string;
    };
    onClick: () => void;
}) => {
    return (
        <div
            onClick={onClick}
            className="group grid grid-cols-[0.25fr_1fr_1fr_0.25fr] w-full p-2  rounded-xl bg-white cursor-pointer"
        >
            <div
                className={cn(
                    "px-2 flex items-center justify-center rounded-sm text-center w-fit",
                    getMethodColor(endpoint.method)
                )}
            >
                <span
                    className={cn(
                        "font-mono text-xs font-bold",
                        getMethodColor(endpoint.method)
                    )}
                >
                    {endpoint.method}
                </span>
            </div>
            <div className="w-full col-span-2">
                <h3 className="text-sm font-medium text-gray-500 group-hover:text-gray-900">
                    {endpoint.title || endpoint.operationId || "Untitled Endpoint"}
                </h3>
            </div>
            <ArrowRight className="w-4 h-4 justify-self-end text-gray-400 group-hover:text-gray-600 transition-all group-hover:translate-x-1" />
        </div>
    );
};

const EndpointList = ({
    endpoints,
    onEndpointClick,
}: {
    endpoints: Array<{
        path: string;
        method: HttpMethod;
        title: string;
        operationId?: string;
    }>;
    onEndpointClick: (endpoint: { path: string; method: HttpMethod }) => void;
}) => {
    // Group endpoints by their exact path pattern
    const groupedEndpoints = endpoints.reduce(
        (acc, endpoint) => {
            // Use the path as is for grouping, this will keep parameterized paths separate
            const pathPattern = endpoint.path;
            if (!acc[pathPattern]) {
                acc[pathPattern] = [];
            }
            acc[pathPattern].push(endpoint);
            return acc;
        },
        {} as Record<string, typeof endpoints>
    );

    // Sort paths so that base paths come before parameterized paths
    const sortedPaths = Object.keys(groupedEndpoints).sort((a, b) => {
        // Count segments and parameters as a sorting criteria
        const aSegments = a.split("/").length;
        const bSegments = b.split("/").length;
        const aParams = (a.match(/{[^}]+}/g) || []).length;
        const bParams = (b.match(/{[^}]+}/g) || []).length;

        if (aSegments !== bSegments) return aSegments - bSegments;
        if (aParams !== bParams) return aParams - bParams;
        return a.localeCompare(b);
    });

    return (
        <div className="space-y-6  max-h-[500px]">
            {sortedPaths.map((path) => {
                const pathEndpoints = groupedEndpoints[path] || [];
                return (
                    <div key={path} className="space-y-3">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm text-gray-400 font-mono">{path}</h3>
                            <div className="h-4 w-px bg-gray-200" />
                            <span className="text-xs text-gray-500">
                                {pathEndpoints.length} endpoint
                                {pathEndpoints.length !== 1 ? "s" : ""}
                            </span>
                        </div>
                        <div className="grid gap-2 rounded-xl border border-gray-200 px-2 overflow-hidden py-2">
                            {pathEndpoints.map((endpoint) => (
                                <EndpointCard
                                    key={`${endpoint.path}-${endpoint.method}`}
                                    endpoint={endpoint}
                                    onClick={() => onEndpointClick(endpoint)}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const ConfigureTab = () => {
    const { clientRequestId, projectId } = useClientProject();
    const [showAddEnvModal, setShowAddEnvModal] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState<ClientSecret | null>(
        null
    );
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
    const [secretToDelete, setSecretToDelete] = useState<ClientSecret | null>(
        null
    );
    const { handleRightCollapse } = useLayout();
    const {
        taskInstanceMeta,
        mutate: mutateTaskInstanceMeta,
        deploymentInfo,
    } = useTaskInstanceMetaContext();
    const {
        endpoints,
        isLoading,
        error,
        setSelectedEndpoint,
        setSelectedMethod,
    } = useApiDoc();

    useEffect(() => {
        mutateTaskInstanceMeta();
    }, []);

    const { data: allSecrets, mutate: mutateSecrets } = useSWR<{
        clientSecrets: ClientSecret[];
    }>(
        clientRequestId
            ? `/api/client-secrets?clientRequestId=${clientRequestId}`
            : null,
        async (url: string) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch secrets");
            return res.json();
        }
    );

    const { data: customSecrets } = useSWR<{
        clientSecrets: ClientSecret[];
    }>(
        clientRequestId
            ? `/api/client-secrets?clientRequestId=${clientRequestId}&type=custom`
            : null,
        async (url: string) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch custom secrets");
            return res.json();
        }
    );

    const platformSecrets =
        allSecrets?.clientSecrets?.filter((secret) => secret?.type !== "custom") ||
        [];

    const { data: clientDeployment } = useSWR<ClientDeployment[]>(
        `/api/client-functions?id=${clientRequestId}`,
        async (url: string) => {
            const response = await PortalSdk.getData(url, {});
            return response.clientFunctions;
        }
    );

    console.log(clientDeployment, "clientDeployment");
    const clientDeploymentData = clientDeployment?.[0] || null;

    const handleEndpointClick = (endpoint: {
        path: string;
        method: HttpMethod;
    }) => {
        setSelectedEndpoint(endpoint.path);
        setSelectedMethod(endpoint.method);
        handleRightCollapse(false);
    };

    const toggleSecretVisibility = (secretId: string) => {
        setShowSecrets((prev) => ({
            ...prev,
            [secretId]: !prev[secretId],
        }));
    };

    const handleDeleteSecret = async (secret: ClientSecret) => {
        try {
            const response = await fetch(
                `/api/client-secrets?id=${secret.id}&clientRequestId=${clientRequestId}&removeOnly=true`,
                {
                    method: "DELETE",
                }
            );

            if (!response.ok) {
                throw new Error("Failed to delete secret");
            }

            await mutateSecrets();
            toast.success("Secret deleted successfully");
            setSecretToDelete(null);
        } catch (error) {
            toast.error("Failed to delete secret");
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 thin-scrollbar">
            <div className="flex items-center gap-2 mb-8">
                <LayoutDashboard className="w-5 h-5" />
                <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
            </div>

            <DeployStatus
                deployStep={taskInstanceMeta?.deployStep as DeployStep}
                clientDeployment={clientDeploymentData}
            />

            {/* Add Endpoints Section */}
            <div className="mt-8 mb-10">
                <div className="flex items-center gap-2 mb-6">
                    <div className="flex items-center gap-2">
                        <Split className="w-4 h-4 text-gray-500" />
                        <h3 className="text-lg font-semibold text-gray-900">
                            API Endpoints
                        </h3>
                    </div>
                    <div className="h-6 w-px bg-gray-200" />
                    <span className="text-sm text-gray-500">
                        {endpoints.length} endpoint{endpoints.length !== 1 ? "s" : ""}{" "}
                        available
                    </span>
                </div>

                {isLoading ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
                            <p className="text-sm text-gray-500">Loading endpoints...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="text-center py-12 bg-red-50 rounded-xl border border-red-200">
                        <div className="flex flex-col items-center gap-3">
                            <XCircle className="w-6 h-6 text-red-500" />
                            <div className="space-y-1">
                                <h4 className="text-sm font-medium text-red-800">
                                    Failed to load endpoints
                                </h4>
                                <p className="text-xs text-red-600">{error.message}</p>
                            </div>
                        </div>
                    </div>
                ) : endpoints.length > 0 ? (
                    <EndpointList
                        endpoints={endpoints}
                        onEndpointClick={handleEndpointClick}
                    />
                ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex flex-col items-center gap-3">
                            <div className="p-3 bg-gray-100 rounded-full">
                                <Package className="w-6 h-6 text-gray-500" />
                            </div>
                            <h4 className="text-lg font-medium text-gray-800">
                                No Endpoints Available
                            </h4>
                            <p className="text-gray-500 max-w-md">
                                This API doesn&apos;t have any endpoints configured yet.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="w-full p-4 border border-gray-200 rounded-xl">
                <div className="flex items-center gap-2 mb-8">
                    <Key className="w-4 h-4 text-gray-500" />
                    <h3 className="text-lg font-semibold text-gray-900">
                        Configure Keys
                    </h3>
                </div>
                <Tabs defaultValue="platform" className="w-full">
                    <TabsList className="w-full max-w-md mb-4 p-1 bg-gray-100/80 rounded-lg">
                        <TabsTrigger
                            value="platform"
                            className={cn(
                                "flex-1 gap-2 px-4 py-2.5",
                                "data-[state=active]:bg-white data-[state=active]:shadow-sm",
                                "transition-all duration-200"
                            )}
                        >
                            <Package className="w-4 h-4" />
                            Platform Keys
                        </TabsTrigger>
                        <TabsTrigger
                            value="custom"
                            className={cn(
                                "flex-1 gap-2 px-4 py-2.5",
                                "data-[state=active]:bg-white data-[state=active]:shadow-sm",
                                "transition-all duration-200"
                            )}
                        >
                            <Key className="w-4 h-4" />
                            Custom Keys
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="platform" className=" shadow-none border-none">
                        {platformSecrets.length > 0 ? (
                            <div className="bg-white rounded-xl  overflow-hidden">
                                {platformSecrets.map((secret, index) => (
                                    <div
                                        key={secret.id}
                                        className={cn(
                                            "",
                                            index === platformSecrets.length - 1 && "border-b-0"
                                        )}
                                    >
                                        <SecretCard
                                            secret={secret}
                                            showSecret={!!showSecrets[secret.id]}
                                            onToggleVisibility={() =>
                                                toggleSecretVisibility(secret.id)
                                            }
                                            onEdit={() => {
                                                setSelectedPlatform(secret);
                                                setIsDialogOpen(true);
                                            }}
                                            onDelete={() => setSecretToDelete(secret)}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="p-3 bg-gray-100 rounded-full">
                                        <Package className="w-6 h-6 text-gray-500" />
                                    </div>
                                    <h4 className="text-lg font-medium text-gray-800">
                                        No Platform Keys
                                    </h4>
                                    <p className="text-gray-500 max-w-md">
                                        You haven&apos;t added any platform keys yet.
                                    </p>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="custom" className="space-y-6">
                        <Button
                            variant="outline"
                            className="border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            onClick={() => setShowAddEnvModal(true)}
                        >
                            <Edit className="w-4 h-4 mr-2" />
                            Add Custom Keys
                        </Button>

                        {customSecrets?.clientSecrets &&
                            customSecrets.clientSecrets.length > 0 && (
                                <div className="grid gap-6">
                                    {customSecrets.clientSecrets.map((secret) => (
                                        <SecretCard
                                            key={secret.id}
                                            secret={secret}
                                            showSecret={!!showSecrets[secret.id]}
                                            onToggleVisibility={() =>
                                                toggleSecretVisibility(secret.id)
                                            }
                                            onEdit={() => setShowAddEnvModal(true)}
                                            onDelete={() => setSecretToDelete(secret)}
                                        />
                                    ))}
                                </div>
                            )}

                        {(!customSecrets?.clientSecrets ||
                            customSecrets.clientSecrets.length === 0) && (
                                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="p-3 bg-gray-100 rounded-full">
                                            <Key className="w-6 h-6 text-gray-500" />
                                        </div>
                                        <h4 className="text-lg font-medium text-gray-800">
                                            No Custom Keys
                                        </h4>
                                        <p className="text-gray-500 max-w-md">
                                            You haven&apos;t added any custom keys yet.
                                        </p>
                                    </div>
                                </div>
                            )}
                    </TabsContent>
                </Tabs>
            </div>

            <EnvVariablesDialog
                isOpen={!!showAddEnvModal}
                onClose={() => setShowAddEnvModal(false)}
                envVariables={[]}
                onSave={async () => {
                    await mutateSecrets();
                    setShowAddEnvModal(false);
                }}
                initialValues={{}}
            />
            {/* {selectedPlatform && (
                <APIKeyDialog
                    mutateSecrets={mutateSecrets}
                    isOpen={!!isDialogOpen}
                    onClose={async (submitted?: boolean) => {
                        setIsDialogOpen(false);
                        setSelectedPlatform(null);
                        if (submitted) {
                            await mutateSecrets();
                        }
                    }}
                    platformName={selectedPlatform.name}
                    pkg={}
                    existingSecret={selectedPlatform}
                    projectId={projectId || undefined}
                    requestId={clientRequestId || undefined}
                />
            )} */}
            {secretToDelete && (
                <DeleteConfirmationDialog
                    secretToDelete={secretToDelete}
                    onClose={() => setSecretToDelete(null)}
                    onDelete={() => handleDeleteSecret(secretToDelete)}
                />
            )}
        </div>
    );
};

export default ConfigureTab;

const DeleteConfirmationDialog = ({
    secretToDelete,
    onClose,
    onDelete,
}: {
    secretToDelete: ClientSecret;
    onClose: () => void;
    onDelete: () => void;
}) => {
    return (
        <Dialog open={!!secretToDelete} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Secret</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete {secretToDelete?.name}
                        &nbsp;secrets? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={onDelete}>
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const ActionButton = ({
    icon,
    onClick,
    tooltip,
    className,
}: ActionButtonProps) => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClick}
                    className={cn("hover:bg-gray-100", className)}
                >
                    {icon}
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>{tooltip}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

interface SecretVariableProps {
    variable: ClientSecret["variables"][0];
    isVisible: boolean;
}

const SecretVariable = ({ variable, isVisible }: SecretVariableProps) => (
    <div className="flex items-center justify-between p-3 rounded-lg">
        <div className="flex-1 flex items-center justify-between">
            <span className="font-mono text-sm text-gray-600">{variable.key}</span>
            <span className="font-mono text-sm text-gray-900 ml-4">
                {isVisible ? variable.value : "•".repeat(12)}
            </span>
        </div>
    </div>
);

interface SecretCardProps {
    secret: ClientSecret;
    showSecret: boolean;
    onToggleVisibility: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

const SecretCard = ({
    secret,
    showSecret,
    onToggleVisibility,
    onEdit,
    onDelete,
}: SecretCardProps) => (
    <div className="bg-white">
        <div className="p-1 space-y-1">
            <div className="grid gap-2">
                {secret.variables.map((variable) => (
                    <div key={variable.key} className="flex items-center gap-2">
                        <div className="flex-1">
                            <SecretVariable variable={variable} isVisible={showSecret} />
                        </div>
                        <div className="flex items-center gap-2">
                            <ActionButton
                                icon={<Edit className="w-4 h-4 text-gray-600" />}
                                onClick={onEdit}
                                tooltip="Edit Keys"
                            />
                            <ActionButton
                                icon={
                                    showSecret ? (
                                        <EyeOff className="w-4 h-4 text-gray-600" />
                                    ) : (
                                        <Eye className="w-4 h-4 text-gray-600" />
                                    )
                                }
                                onClick={onToggleVisibility}
                                tooltip={showSecret ? "Hide Values" : "Show Values"}
                            />
                            <ActionButton
                                icon={<Trash2 className="w-4 h-4 text-red-500" />}
                                onClick={onDelete}
                                tooltip="Delete Keys"
                                className="hover:bg-red-50 hover:text-red-600"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);