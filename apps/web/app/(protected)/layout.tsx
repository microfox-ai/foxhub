"use client";

import CustomBotsHeader from "@/components/screens/global/Header";
import { Toaster } from "sonner";
import { usePathname } from "next/navigation";
import { BotTemplateProvider } from "@/components/screens/providers/BotTemplateProvider";
import { FileUploadProvider } from "@/components/screens/providers/FileUploadProvider";
import { ClientProjectProvider } from "@/components/screens/providers/ClientProjectProvider";
import { LayoutProvider } from "@/components/screens/providers/LayoutProvider";
import FeebackModal from "@/components/global/FeebackModal";
const Layout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const isPlayground = pathname.includes("playground");
  const isProject = pathname.includes("request");
  return (
    <BotTemplateProvider>
      <FileUploadProvider>
        <ClientProjectProvider>
          <LayoutProvider>
            <main className="relative flex h-screen flex-col bg-background">
              {!isPlayground && !isProject && <CustomBotsHeader />}
              <Toaster position="top-right" richColors duration={3000} />
              <FeebackModal />
              {!isProject && <div className="h-16" />}
              <div className="flex-1">{children}</div>
            </main>
          </LayoutProvider>
        </ClientProjectProvider>
      </FileUploadProvider>
    </BotTemplateProvider>
  );
};

export default Layout;
