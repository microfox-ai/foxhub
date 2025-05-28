"use client";

import CustomBotsHeader from "@/components/screens/global/Header";
import { Toaster } from "sonner";
import { usePathname } from "next/navigation";
import { FileUploadProvider } from "@/components/screens/providers/FileUploadProvider";
import { ClientProjectProvider } from "@/components/screens/providers/ClientProjectProvider";
import { LayoutProvider } from "@/components/screens/providers/LayoutProvider";
import FeebackModal from "@/components/global/FeebackModal";
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import ResizableSidebar from "@/components/screens/global/ResizableSidebar";
import LogoutElement from "@/components/auth/LogoutElement";
const Layout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  return (
    <FileUploadProvider>
      <ClientProjectProvider>
        <LayoutProvider>
          <main className="relative flex max-h-screen overflow-hidden flex-col bg-background">
            {/* {!isPlayground && !isProject && <CustomBotsHeader />} */}
            <Toaster position="top-right" richColors duration={3000} />
            <FeebackModal />
            <ResizablePanelGroup
              direction="horizontal"
              autoSaveId="request-page"
              className="!h-screen"
            >
              <ResizableSidebar />
              {!pathname?.includes("request") ? (
                <ResizablePanel defaultSize={84}>
                  {/* {!isProject && <div className="h-16" />} */}
                  <div className="flex-1">{children}</div>
                </ResizablePanel>
              ) : (
                <>{children}</>
              )}
            </ResizablePanelGroup>
            {!pathname?.includes("request") && (
              <div className="absolute top-10 right-10 z-100">
                <LogoutElement />
              </div>
            )}
          </main>
        </LayoutProvider>
      </ClientProjectProvider>
    </FileUploadProvider>
  );
};

export default Layout;
