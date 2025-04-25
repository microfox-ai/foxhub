import React, { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Settings, LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import LogoutConfirmationDialog from "./LogoutConfirmationDialog";
const LogoutElement = () => {
  const { user, handleLogout, logoutStatus } = useAuth();

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleConfirmLogout = async () => {
    try {
      await handleLogout();
      setShowLogoutDialog(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };
  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <div className="flex cursor-pointer items-center gap-2">
            {/*  eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user?.avatar || "/images/default-avatar.png"}
              alt=""
              width={40}
              height={40}
              className="rounded-full hover:ring-2 hover:ring-gray-200 transition-all"
            />
          </div>
        </PopoverTrigger>
        <PopoverContent className=" p-2" align="end">
          <div className="flex items-center gap-2 p-2">
            {/*  eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user?.avatar || "/images/default-avatar.png"}
              alt=""
              width={32}
              height={32}
              className="rounded-full"
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{user?.name}</span>
              <span className="text-xs text-gray-500">{user?.email}</span>
            </div>
          </div>
          <Separator className="my-1" />
          <div className="px-1 py-2 flex flex-col gap-1">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-sm border-none focus:!ring-0"
              onClick={() => {
                // TODO: Implement settings
              }}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogoutClick}
            >
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <LogoutConfirmationDialog
        loggingOut={logoutStatus.isLoggingOut}
        showLogoutDialog={showLogoutDialog}
        setShowLogoutDialog={setShowLogoutDialog}
        handleConfirmLogout={handleConfirmLogout}
      />
    </>
  );
};

export default LogoutElement;
