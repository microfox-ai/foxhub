import { ClientSecret } from "@prisma/client";
import { ClientSecretVariable } from "@/server/types";

interface SecretVariableProps {
    variable: ClientSecretVariable;
    isVisible: boolean;
}

const SecretVariable = ({ variable, isVisible }: SecretVariableProps) => (
    <div className="flex items-center justify-between px-3 rounded-lg">
        <div className="flex-1 flex flex-col items-start justify-between">
            <span className="font-mono text-xs text-gray-300">{variable.key}
                {variable.isOptional && (
                    <span className="text-xs text-neutral-900">
                        (Optional)
                    </span>
                )}
            </span>
            <span className="font-mono text-sm text-neutral-400 max-w-[200px] line-clamp-1">
                {isVisible ? variable.value : "•".repeat(12)}
            </span>
        </div>
    </div>
);

export default SecretVariable;