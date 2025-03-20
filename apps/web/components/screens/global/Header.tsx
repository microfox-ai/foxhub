"use client";

import { APP_ROUTES } from "@/utils/constants/appInfo";
import { useUser } from "@/utils/hooks/useUser";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { ProjectDropdown } from "./ProjectDropdown";
import { LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";


const Header: React.FC = () => {
  const { user } = useUser();
  const { handleLogout } = useAuth();
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
      <header className="z-9 fixed left-0 right-0 flex items-center justify-between border-b border-gray-200 px-4 py-2 font-bold text-black backdrop-blur">
        <div className="flex cursor-pointer items-center gap-2 text-2xl">
          <div
            onClick={() => {
              router.push("/");
            }}
            className="flex cursor-pointer items-center gap-2 text-2xl"
          >
            <span className="material-symbols-outlined inherit">
              app_badging
            </span>
            <div>
              <h1 className="font-bold">Microfox</h1>
              {/* <p className='text-[8px] font-medium text-gray-500'>Alpha - version 1.0.1</p> */}
            </div>
          </div>
          <ProjectDropdown />
        </div>
        <div className="flex items-center gap-4 text-xl"></div>
        <div className="flex items-center gap-4 text-2xl">
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
          <span className="material-symbols-outlined inherit">settings</span>
          <span className="material-symbols-outlined inherit">
            notifications
          </span>
          <LogOut onClick={handleLogoutClick} className="cursor-pointer" />

          <div className="flex items-center gap-4">
            {/*  eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user?.avatar || "/images/default-avatar.png"}
              alt=""
              width={40}
              height={40}
              className="rounded-full"
            />
          </div>
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
            <Button variant="outline" onClick={handleLogout}>
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
