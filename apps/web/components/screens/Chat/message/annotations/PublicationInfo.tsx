import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UIAnnotation } from "../types";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle } from "lucide-react";

interface PublicationInfoProps {
  uiAnnotation: UIAnnotation;
  idx: number;
}

const PublicationInfo: React.FC<PublicationInfoProps> = ({
  uiAnnotation,
  idx,
}) => {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-5 p-6 rounded-xl border border-green-100 shadow-md hover:shadow-lg transition-all max-w-md">
      <div className="flex gap-3">
        <span className="w-12 h-10 rounded-full flex items-center justify-center bg-green-100 border border-green-200">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </span>
        <div className="w-full">
          <h3 className="text-lg font-semibold">Successfully published 🎉</h3>
          <p className="text-sm text-gray-500">
            Your app has been successfully published to store. Other people now
            can use it.
          </p>
        </div>
      </div>
      <div className="flex gap-3 mt-2">
        {uiAnnotation.buttons?.map((button, index) => (
          <Button
            key={index}
            variant={button.type === "confirm" ? "default" : "outline"}
            className={cn(
              button.type === "confirm"
                ? "bg-neutral-900 text-white hover:bg-neutral-700 px-6 py-2 rounded-lg font-semibold shadow-md transition-all"
                : "bg-neutral-100 text-neutral-800 hover:bg-neutral-200 px-6 py-2 rounded-lg font-medium border border-neutral-200 transition-all",
              button.className,
              "group"
            )}
            onClick={() => {
              if (button.action === "link" && button.url) {
                router.push(button.url);
              } else if (button.action === "highlightInput") {
                // Handle highlight input action
                // You can trigger a callback or event here
              }
            }}
          >
            {button.text}{" "}
            {button.type === "confirm" && (
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-all" />
            )}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default PublicationInfo;
