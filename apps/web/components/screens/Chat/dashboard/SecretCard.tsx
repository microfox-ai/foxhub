import { ClientSecret } from "@prisma/client";
import { Edit, Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import SecretVariable from "./SecretVariable";

// Define the ActionButton component if it's not imported
interface ActionButtonProps {
    icon: React.ReactNode;
    onClick: () => void;
    tooltip: string;
    className?: string;
}

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

interface SecretCardProps {
    secret: ClientSecret;
    showSecret: boolean;
    onToggleVisibility?: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export const SecretCard = ({
    secret,
    showSecret,
    onToggleVisibility,
    onEdit,
    onDelete,
}: SecretCardProps) => (
    <div className="bg-white">
        <div className="p-1 space-y-1">
            <div className="grid gap-2">
                {(secret.variables as Array<{ key: string; value: string; isOptional?: boolean }>).map((variable) => (
                    <div key={variable.key} className="flex items-center gap-2">
                        <div className="flex-1">
                            <SecretVariable variable={variable} isVisible={showSecret} />
                        </div>
                        <div className="flex items-center gap-2">
                            {/* <ActionButton
                                icon={<Edit className="w-4 h-4 text-gray-600" />}
                                onClick={onEdit}
                                tooltip="Edit Keys"
                            /> */}
                            {onToggleVisibility && (
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
                            )}
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