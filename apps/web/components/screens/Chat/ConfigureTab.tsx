import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Package,
  Key,
  Plus,
  CheckCircle2,
  Trash2,
  Eye,
  EyeOff,
  Edit,
} from "lucide-react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { APIKeyDialog } from "./message/APIKeyDialog";
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

const ConfigureTab = () => {
  const params = useParams();
  const requestParamId = (params?.["request_id"] as string) || "";
  const projectParamId = (params?.["project_id"] as string) || "";
  const [showAddEnvModal, setShowAddEnvModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<ClientSecret | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [secretToDelete, setSecretToDelete] = useState<ClientSecret | null>(
    null
  );

  const { data: allSecrets, mutate: mutateSecrets } = useSWR<{
    clientSecrets: ClientSecret[];
  }>(
    requestParamId
      ? `/api/client-secrets?clientRequestId=${requestParamId}`
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
    requestParamId
      ? `/api/client-secrets?clientRequestId=${requestParamId}&type=custom`
      : null,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch custom secrets");
      return res.json();
    }
  );

  const platformSecrets =
    allSecrets?.clientSecrets?.filter((secret) => secret.type !== "custom") ||
    [];

  const toggleSecretVisibility = (secretId: string) => {
    setShowSecrets((prev) => ({
      ...prev,
      [secretId]: !prev[secretId],
    }));
  };

  const handleDeleteSecret = async (secret: ClientSecret) => {
    try {
      const response = await fetch(
        `/api/client-secrets?id=${secret.id}&clientRequestId=${requestParamId}&removeOnly=true`,
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
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-8">
        Configure API Keys & Secrets
      </h2>

      <Tabs defaultValue="platform" className="w-full">
        <TabsList className="w-full max-w-md mb-8 p-1 bg-gray-100/80 rounded-lg">
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

        <TabsContent value="platform" className="space-y-6">
          <div className="grid gap-6">
            {platformSecrets.map((secret) => (
              <SecretCard
                key={secret.id}
                secret={secret}
                showSecret={!!showSecrets[secret.id]}
                onToggleVisibility={() => toggleSecretVisibility(secret.id)}
                onEdit={() => {
                  setSelectedPlatform(secret);
                  setIsDialogOpen(true);
                }}
                onDelete={() => setSecretToDelete(secret)}
                icon={<Package className="w-5 h-5 text-gray-600" />}
              />
            ))}
          </div>
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

          {customSecrets?.clientSecrets?.map((secret) => (
            <SecretCard
              key={secret.id}
              secret={secret}
              showSecret={!!showSecrets[secret.id]}
              onToggleVisibility={() => toggleSecretVisibility(secret.id)}
              onEdit={() => setShowAddEnvModal(true)}
              onDelete={() => setSecretToDelete(secret)}
              icon={<Key className="w-5 h-5 text-gray-600" />}
            />
          ))}
        </TabsContent>
      </Tabs>

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

      {selectedPlatform && (
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
          pkg={{
            name: selectedPlatform.name,
            type: selectedPlatform.type,
            requiredKeys: selectedPlatform.variables.map((v) => ({
              key: v.key,
              displayName: v.key,
              description: "",
            })),
          }}
          existingSecret={selectedPlatform}
          projectId={projectParamId}
          requestId={requestParamId}
        />
      )}

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
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
    <span className="font-mono text-sm text-gray-600">{variable.key}</span>
    <span className="font-mono text-sm text-gray-900">
      {isVisible ? variable.value : "•".repeat(12)}
    </span>
  </div>
);

interface SecretCardProps {
  secret: ClientSecret;
  showSecret: boolean;
  onToggleVisibility: () => void;
  onEdit: () => void;
  onDelete: () => void;
  icon: React.ReactNode;
}

const SecretCard = ({
  secret,
  showSecret,
  onToggleVisibility,
  onEdit,
  onDelete,
  icon,
}: SecretCardProps) => (
  <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow duration-200">
    <div className="p-5 border-b border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
          <h3 className="font-medium text-gray-900">{secret.name}</h3>
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
    </div>
    <div className="p-5 space-y-3">
      <div className="grid gap-2">
        {secret.variables.map((variable) => (
          <SecretVariable
            key={variable.key}
            variable={variable}
            isVisible={showSecret}
          />
        ))}
      </div>
    </div>
  </div>
);
