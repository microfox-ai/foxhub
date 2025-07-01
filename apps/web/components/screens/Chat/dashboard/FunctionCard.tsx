import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMethodColor } from "../../PreviewWindow/utils";
import { FunctionInfo } from "@/utils/services/parseServerlessLogs";

interface FunctionCardProps {
    functionInfo: FunctionInfo;
    onClick: () => void;
}

export const FunctionCard = ({
    functionInfo,
    onClick,
}: FunctionCardProps) => {
    const method = functionInfo.method;
    return (
        <div
            onClick={onClick}
            className="group w-full flex items-start p-2 gap-2 rounded-sm bg-white cursor-pointer"
        >
            <div
                className={cn(
                    "px-2 flex items-center justify-center rounded-sm text-center w-fit",
                    getMethodColor(method.toUpperCase())
                )}
            >
                <span
                    className={cn(
                        "font-mono text-xs font-bold",
                        getMethodColor(method.toUpperCase())
                    )}
                >
                    {method.toUpperCase()}
                </span>
            </div>
            <div className="col-span-2 flex items-center justify-between w-full">
                <h3 className="text-sm font-medium text-gray-500 group-hover:text-gray-900">
                    {functionInfo.functionName}
                </h3>
                <ArrowRight className="w-4 h-4 justify-self-end text-gray-400 group-hover:text-gray-600 transition-all group-hover:translate-x-1" />
            </div>
        </div>
    );
}; 