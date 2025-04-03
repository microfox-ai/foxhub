import { createContext, useContext, useState, useRef } from "react";
import * as ResizablePrimitive from "react-resizable-panels";

interface LayoutContextType {
  isLeftCollapsed: boolean;
  isRightCollapsed: boolean;
  isLeftTransitioning: boolean;
  isRightTransitioning: boolean;
  leftPanelRef: React.RefObject<ResizablePrimitive.ImperativePanelHandle | null>;
  rightPanelRef: React.RefObject<ResizablePrimitive.ImperativePanelHandle | null>;
  handleLeftCollapse: (collapsed: boolean) => void;
  handleRightCollapse: (collapsed: boolean) => void;
  handleLeftResizeHandleClick: () => void;
  handleRightResizeHandleClick: () => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const LayoutProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(true);
  const [isLeftTransitioning, setIsLeftTransitioning] = useState(false);
  const [isRightTransitioning, setIsRightTransitioning] = useState(false);
  const leftPanelRef = useRef<ResizablePrimitive.ImperativePanelHandle | null>(
    null
  );
  const rightPanelRef = useRef<ResizablePrimitive.ImperativePanelHandle | null>(
    null
  );

  const handleLeftCollapse = (collapsed: boolean) => {
    setIsLeftTransitioning(true);
    if (leftPanelRef.current) {
      if (collapsed) {
        leftPanelRef.current.collapse();
      } else {
        leftPanelRef.current.expand();
      }
    }
    setIsLeftCollapsed(collapsed);
    // Remove transition after animation completes
    setTimeout(() => setIsLeftTransitioning(false), 300);
  };

  const handleRightCollapse = (collapsed: boolean) => {
    setIsRightTransitioning(true);
    if (rightPanelRef.current) {
      if (collapsed) {
        rightPanelRef.current.collapse();
      } else {
        rightPanelRef.current.expand();
      }
    }
    setIsRightCollapsed(collapsed);
    // Remove transition after animation completes
    setTimeout(() => setIsRightTransitioning(false), 300);
  };

  const handleLeftResizeHandleClick = () => {
    handleLeftCollapse(!isLeftCollapsed);
  };

  const handleRightResizeHandleClick = () => {
    handleRightCollapse(!isRightCollapsed);
  };

  return (
    <LayoutContext.Provider
      value={{
        isLeftCollapsed,
        isRightCollapsed,
        isLeftTransitioning,
        isRightTransitioning,
        leftPanelRef,
        rightPanelRef,
        handleLeftCollapse,
        handleRightCollapse,
        handleLeftResizeHandleClick,
        handleRightResizeHandleClick,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
};
