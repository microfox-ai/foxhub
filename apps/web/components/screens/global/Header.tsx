"use client";

import { useUser } from "@/utils/hooks/useUser";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { ProjectDropdown } from "./ProjectDropdown";
import { LogOut, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";

const Header: React.FC = () => {
  const { user, handleLogout } = useUser();
  const router = useRouter();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleConfirmLogout = () => {
    handleLogout();
    setShowLogoutDialog(false);
  };

  //console.log(user?.avatar)

  //console.log(user);
  return (
    <>
      <header className="z-9 fixed left-0 right-0 grid grid-cols-12 items-center justify-between border-b border-gray-200 px-4 py-2 font-bold text-black backdrop-blur">
        <div className="col-span-2 flex cursor-pointer items-center gap-2 text-2xl">
          <div
            onClick={() => {
              router.push("/");
            }}
            className="flex cursor-pointer items-center gap-2 text-2xl"
          >
            <img
              src="/logo-mini.png"
              alt=""
              width={32}
              height={32}
              className="rounded-md w-10 min-w-10 h-10 min-h-10"
            />
            <div className="flex items-center gap-2">
              <h1 className="font-medium text-xl text-gray-800">
                Microfox
              </h1>
              <p className="text-xs font-medium text-gray-500 mt-1">v1.0.1</p>
            </div>
          </div>
        </div>
        <div className="col-span-6 flex items-center justify-start gap-4 text-xl -ml-5">
          <ProjectDropdown />
        </div>
        <div className="col-span-4 flex items-center justify-end gap-4 text-xl">
          <div className="flex items-center gap-4 text-xl">
            {/* <Link
                        href={APP_ROUTES.customBots + "/idea"}
                        className='text-sm cursor-pointer font-medium text-gray-500 hover:text-black flex items-center gap-1'>
                        <span className='material-symbols-outlined inherit'>lightbulb</span>
                        The Idea</Link> */}

            <Link
              href={"/whitepaper"}
              className="flex cursor-pointer items-center gap-1 text-sm font-medium text-gray-500 hover:text-black"
            >
              <span className="material-symbols-outlined inherit">task</span>
              Whitepaper
            </Link>
            {/* <button className='text-sm cursor-pointer font-medium text-gray-500 hover:text-black flex items-center gap-1'>
                        <span className='material-symbols-outlined inherit'>update</span>
                        Updates</button> */}
          </div>
          <span className="material-symbols-outlined inherit">
            notifications
          </span>

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
            <PopoverContent className="w-56 p-2" align="end">
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
        </div>
        {/* Add your header content here */}
      </header>

      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to logout? You will need to login again to
              access your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLogoutDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmLogout}
              className="bg-black text-white hover:bg-black/90 transition-colors"
            >
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Header;
