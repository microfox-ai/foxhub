/* eslint-disable @next/next/no-img-element */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface AddBotDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  nonOauthPackages: any[];
}

const AddBotDialog = ({
  isOpen,
  onOpenChange,
  nonOauthPackages,
}: AddBotDialogProps) => {
  const router = useRouter();

  const handlePackageSelect = (pkg: any) => {
    onOpenChange(false); // Close the dialog
    router.push(`/my-bots/new-bot?package=${pkg.name}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Select a Bot</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {nonOauthPackages.map((pkg) => (
              <div
                key={pkg.name}
                onClick={() => handlePackageSelect(pkg)}
                className="flex items-start space-x-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex-shrink-0">
                  <img
                    src={pkg.icon}
                    alt={pkg.name}
                    className="w-12 h-12 object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium text-gray-900">
                    {pkg.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {pkg.description}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default AddBotDialog;
