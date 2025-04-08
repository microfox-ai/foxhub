import { Loader2 } from "lucide-react";

import { Button } from "../ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

const LogoutConfirmationDialog = ({
  showLogoutDialog,
  setShowLogoutDialog,
  handleConfirmLogout,
  loggingOut,
}: {
  showLogoutDialog: boolean;
  setShowLogoutDialog: (show: boolean) => void;
  handleConfirmLogout: () => void;
  loggingOut: boolean;
}) => {
  return (
    <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Logout</DialogTitle>
        </DialogHeader>
        <DialogDescription>Are you sure you want to logout?</DialogDescription>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirmLogout} disabled={loggingOut}>
            {loggingOut ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Logging out...
              </>
            ) : (
              "Logout"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LogoutConfirmationDialog;
