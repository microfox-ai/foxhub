"use client";

import CustomBotsHeader from "@/components/screens/global/Header";
import { Toaster } from "sonner";
import { usePathname } from "next/navigation";
import { BotTemplateProvider } from "@/components/screens/providers/BotTemplateProvider";
import { FileUploadProvider } from "@/components/screens/providers/FileUploadProvider";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const isPlayground = pathname.includes("playground");
  return (
    <BotTemplateProvider>
      <FileUploadProvider>
        <main className="relative flex h-screen flex-col bg-background">
          {!isPlayground && <CustomBotsHeader />}
          <Toaster position="top-right" richColors duration={3000} />
          <div className="h-16" />
          <div className="flex-1">{children}</div>
        </main>
      </FileUploadProvider>
    </BotTemplateProvider>
  );
};

export default Layout;
