"use client";
import { ResizablePanel } from "@/components/ui/resizable";
import React from "react";
import { useLayout } from "../providers/LayoutProvider";
import { useClientProject } from "../providers/ClientProjectProvider";
import { cn } from "@/lib/utils";
import Sidebar from "./Sidebar";

const ResizableSidebar = () => {
  const {
    isLeftCollapsed,
    isLeftTransitioning,
    leftPanelRef,
    handleLeftCollapse,
  } = useLayout();

  const { selectedProject, setSelectedRequest, createNewEmptyRequest } =
    useClientProject();

  return (
    <ResizablePanel
      ref={leftPanelRef}
      defaultSize={16}
      minSize={16}
      maxSize={16}
      collapsible={true}
      collapsedSize={4}
      // onCollapse={() => handleLeftCollapse(true)}
      // onExpand={() => handleLeftCollapse(false)}
      className={cn(
        "z-50",
        isLeftTransitioning && "transition-all duration-100 linear"
      )}
    >
      <div className="flex h-full flex-col">
        <Sidebar
          selectedProject={selectedProject}
          onSelectRequest={setSelectedRequest}
          onNewRequest={createNewEmptyRequest}
          onOpenConfig={(project: any) => {}}
          isCollapsed={isLeftCollapsed}
          onCollapse={handleLeftCollapse}
        />
      </div>
    </ResizablePanel>
  );
};

export default ResizableSidebar;
