import {
  FilloutFormIds,
  useFilloutPopup,
} from '@/components/screens/landing/FilloutPopupProvider';
import Image from 'next/image';
import React, { useEffect, useRef } from 'react';
import { useAppButton } from '../Header/AppButton';
import { stacks } from '../HeroSection/StackData';
import { motion, useScroll, useTransform } from 'framer-motion';

interface Position {
  top: string;
  left: string;
}

interface Tool {
  id: string;
  name: string;
  img_url: string;
  type: string;
  position: Position;
}

// Generate positions in an equilateral pattern in the upper hemisphere
const generatePositions = (count: number): Position[] => {
  const positions: Position[] = [];
  const radius = 25; // Increased radius for better spacing
  const centerX = 50; // Center X position in percentage
  const centerY = 30; // Center Y position in percentage

  // Calculate angle between each point
  const angleStep = (2 * Math.PI) / count; // Full circle distribution

  for (let i = 0; i < count; i++) {
    // Calculate angle for this point
    const angle = i * angleStep;

    // Calculate position using parametric equations of a circle
    const x = centerX + 45 * Math.cos(angle);
    const y = centerY + 25 * Math.sin(angle);

    // Add very small random variation to avoid perfect alignment
    const randomOffset = 5; // Reduced random offset
    const finalX = x + (Math.random() * randomOffset * 2 - randomOffset);
    const finalY = y - (Math.random() * randomOffset * 2 - randomOffset);

    positions.push({
      top: `${finalY}%`,
      left: `${finalX}%`
    });
  }

  return positions;
};

// Generate positions for all tools
const toolsList: Tool[] = stacks.map((tool, index) => {
  const positions = generatePositions(stacks.length);
  return {
    ...tool,
    position: positions[index]!,
  };
});

// Add new component for connecting lines
const ConnectingLines: React.FC<{ tools: Tool[] }> = ({ tools }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const width = svg.clientWidth;
    const height = svg.clientHeight;

    // Clear previous paths
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    // Create paths between each tool and the next one
    for (let i = 0; i < tools.length; i++) {
      const current = tools[i];
      const next = tools[(i + 1) % tools.length];

      if (!current || !next) continue;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

      // Convert percentage positions to pixel coordinates
      const x1 = (parseFloat(current.position.left) / 100) * width;
      const y1 = (parseFloat(current.position.top) / 100) * height;
      const x2 = (parseFloat(next.position.left) / 100) * width;
      const y2 = (parseFloat(next.position.top) / 100) * height;

      // Create orthogonal path with 90-degree turns
      // First move horizontally, then vertically
      const pathData = `M ${x1} ${y1} H ${x2} V ${y2}`;

      path.setAttribute('d', pathData);
      path.setAttribute('stroke', 'rgba(255, 255, 255, 0.3)');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-dasharray', '5,5');

      svg.appendChild(path);
    }
  }, [tools]);

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 h-full w-full"
      style={{ pointerEvents: 'none' }}
    />
  );
};

const FooterCtaSection: React.FC = () => {
  const { openForm } = useFilloutPopup();
  const { handleButtonClick } = useAppButton();
  const videoRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: videoRef,
    offset: ["start end", "end start"]
  });

  const rotateX = useTransform(scrollYProgress, [0, 1], [15, -15]);
  const rotateY = useTransform(scrollYProgress, [0, 1], [-15, 15]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.1, 1]);

  return (
    <section className="relative flex w-full items-start justify-center overflow-hidden md:min-h-[600px] lg:min-h-[1000px]">
      {/* Background Image Container */}
      <div className="absolute inset-0 h-full w-full">
        <div className="absolute inset-0 bg-gradient-to-t from-[#665731] to-[#A98C77]" />
      </div>

      {/* Connecting Lines */}
      <ConnectingLines tools={toolsList} />

      {/* Floating Icons Container */}
      <div className="absolute inset-0">
        {toolsList.map((tool, index) => (
          <div
            key={tool.id}
            className="absolute animate-bounce"
            style={{
              top: tool.position.top,
              left: tool.position.left,
              zIndex: 1,
              animationDuration: '3s',
              animationDelay: `${index * 0.1}s`
            }}
          >
            <img
              src={tool.img_url}
              alt={tool.name}
              className="h-12 w-12 rounded-lg bg-white p-2 transition-transform hover:scale-110"
            />
          </div>
        ))}
      </div>

      {/* Content Container */}
      <div className="relative z-10 mx-auto mb-[5%] mt-auto flex max-w-7xl flex-col px-6 sm:px-6 md:mb-[5%] md:justify-center lg:px-8">
        <motion.div
          ref={videoRef}
          className="mx-auto mb-8 max-w-2xl rounded-2xl overflow-hidden perspective-1000"
          style={{
            rotateX,
            rotateY,
            scale,
            transformStyle: "preserve-3d",
          }}
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-auto h-[500px] rounded-2xl"
          >
            <source src="/videos/microfox-rotate.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </motion.div>

        <h2 className="mx-auto mb-10 max-w-5xl text-center text-2xl font-bold text-white md:text-4xl lg:text-5xl">
          Let Microfox Automate all your processes.
        </h2>

        <div className="mx-auto flex flex-col items-center">
          <button
            onClick={() => openForm(FilloutFormIds.BookCall)}
            className="md:text-md mx-auto flex items-center gap-2 rounded-lg bg-white px-8 py-3 text-sm font-bold text-black transition-colors duration-200 hover:bg-gray-300 lg:text-lg"
          >
            Request a Demo
            <span className="material-symbols-outlined inherit">
              arrow_right_alt
            </span>
          </button>
          <p className="mt-2 text-xs text-white">
            Free trails for seed-funded startups.
          </p>
        </div>
      </div>
    </section>
  );
};

export default FooterCtaSection;
