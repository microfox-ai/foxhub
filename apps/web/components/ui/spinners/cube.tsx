import { cn } from "@/lib/utils";
import React from "react";

const Cube: React.FC<{
  className?: string;
  size?: number;
  color?: string;
}> = ({ className, size = 20, color = "rgb(247,197,159)" }) => {
  return (
    <div
      className={cn("relative animate-cube", className)}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        transformStyle: "preserve-3d",
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            width: "100%",
            height: "100%",
            border: `1px solid ${color}`,
            backgroundColor: `${color}1A`, // Adding transparency
            transform: [
              `translateZ(-${size / 2}px) rotateY(180deg)`,
              `rotateY(-270deg) translateX(50%)`,
              `rotateY(270deg) translateX(-50%)`,
              `rotateX(90deg) translateY(-50%)`,
              `rotateX(-90deg) translateY(50%)`,
              `translateZ(${size / 2}px)`,
            ][i],
            transformOrigin: [
              "",
              "top right",
              "center left",
              "top center",
              "bottom center",
              "",
            ][i],
          }}
        />
      ))}
    </div>
  );
};

export default Cube;
