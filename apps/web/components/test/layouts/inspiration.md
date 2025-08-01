Core Philosophy: The Three Pillars
Layouts as Directors: Layout components (VerticalFillLayout) are the "directors." They are coded, not configured. They control the scene: the boundaries, the positioning, and the timing. They decide how each actor should behave by passing down overrideStyle (from useFitText) and overrideAnimation (for timing).
Data as the Script: The JSON data (AtomData[]) is the "script." It defines what is on stage: the text, the base look, and the desired animation style. It also specifies which actor to cast for the role via a component key.
Atoms as Actors: Custom Atom components (CoolGlowAtom) are the "actors." They know how to perform. They have their own unique style and animation logic but are professional enough to follow the director's instructions (the override props) for positioning and timing.
New Architecture & File Structure
Apply to atom.tsx
apps/web/
└── components/
└── dynamic-typography/
├── index.ts
├── primitives/ // Core building blocks
│ ├── AtomRenderer.tsx // NEW: The dynamic dispatcher
│ ├── types.ts // UPDATED: More powerful types
│ └── componentRegistry.ts// NEW: Maps component names to components
├── custom-atoms/ // Your library of custom atom components
│ ├── DefaultTextAtom.tsx // NEW: The base atom everyone can use
│ └── CoolGlowAtom.tsx // NEW: An example of a specialized atom
├── hooks/
│ └── useFitText.ts // UPDATED: Now supports multiple strategies
└── layouts/
└── VerticalFillLayout.tsx // UPDATED: Now directs animations
Deep Dive into the Refactored Components

1. The Updated Contract: primitives/types.ts
   The AtomData now includes a component key to specify which React component to render.
   Apply to types.ts
   import { TargetAndTransition, Transition, VariantLabels } from "framer-motion";

export interface StyleConfig {
[key: string]: any;
}

export type MotionTransition = Transition;

export interface AnimationConfig {
initial?: VariantLabels | TargetAndTransition;
animate?: VariantLabels | TargetAndTransition;
exit?: VariantLabels | TargetAndTransition;
whileHover?: VariantLabels | TargetAndTransition;
transition?: MotionTransition;
}

export interface AtomData {
id: string;
text: string;
// NEW: Specifies which registered component to render.
component: string;
as?: 'div' | 'p' | 'span';
style?: StyleConfig;
animation?: AnimationConfig;
}

// NEW: Props that every custom atom component MUST accept.
export interface BaseAtomProps {
data: AtomData;
// Layout-driven style overrides (e.g., from useFitText)
overrideStyle?: React.CSSProperties;
// Layout-driven animation overrides (e.g., for staggering delays)
overrideTransition?: MotionTransition;
// A ref for the layout to measure the element.
ref?: React.ForwardedRef<HTMLElement>;
} 2. The Multi-Talented Hook: hooks/useFitText.ts
useFitText is now much more versatile, supporting different fitting and alignment strategies as you requested.
Apply to useFitText.t...
import { useLayoutEffect, useState, RefObject } from 'react';
import { ResizeObserver } from '@juggle/resize-observer';

type FitStrategy =
| 'fill-width' // Stretches text to fill the container's width
| 'fill-height' // Stretches text to fill the container's height
| 'fit' // Fits text within bounds, preserving aspect ratio
| 'align-center' // Centers text, does not resize
| 'none'; // No fitting logic, just passes through styles

interface FitTextOptions {
containerRef: RefObject<HTMLElement>;
strategy: FitStrategy;
}

// THIS IS A CONCEPTUAL, SIMPLIFIED IMPLEMENTATION
export const useFitText = ({ containerRef, strategy }: FitTextOptions) => {
const [style, setStyle] = useState<React.CSSProperties>({});

useLayoutEffect(() => {
if (!containerRef.current || strategy === 'none') return;

    if (strategy.startsWith('align')) {
      setStyle({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%'
      });
      return;
    }

    // For 'fill' or 'fit', we need the ResizeObserver
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      // Complex logic to calculate font size would go here.
      // This is a placeholder for that logic.
      if (strategy === 'fill-width') {
         setStyle({ fontSize: width / 10, whiteSpace: 'nowrap', lineHeight: '1em' });
      } else if (strategy === 'fill-height') {
         setStyle({ fontSize: height * 0.8, lineHeight: '1em' });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();

}, [containerRef, strategy]);

return style;
}; 3. The Default Actor: custom-atoms/DefaultTextAtom.tsx
This is our new base component. It handles all the common logic. Custom atoms can use it as a foundation.
Apply to DefaultTextA...
'use client';
import React, { forwardRef } from 'react';
import { motion, MotionProps } from 'framer-motion';
import { BaseAtomProps } from '../primitives/types';
import { merge } from 'lodash';

const motionComponents = { div: motion.div, p: motion.p, span: motion.span };

export const DefaultTextAtom = forwardRef<HTMLElement, BaseAtomProps>(
({ data, overrideStyle, overrideTransition }, ref) => {
const { as = 'div', style, animation, text } = data;
const MotionComponent = motionComponents[as];

    const finalStyle = { ...style, ...overrideStyle };

    // Merge transitions: the layout's override (e.g., delay) wins.
    const finalAnimation = merge({}, animation, { transition: overrideTransition });

    return (
      <MotionComponent ref={ref} style={finalStyle} {...finalAnimation}>
        {text}
      </MotionComponent>
    );

}
);
DefaultTextAtom.displayName = "DefaultTextAtom"; 4. The Star Performer: custom-atoms/CoolGlowAtom.tsx
An example of a custom atom. It defines its own unique hover effect but respects the overrideTransition for its entry animation.
Apply to CoolGlowAtom...
'use client';
import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { BaseAtomProps } from '../primitives/types';
import { merge } from 'lodash';

export const CoolGlowAtom = forwardRef<HTMLDivElement, BaseAtomProps>(
({ data, overrideStyle, overrideTransition }, ref) => {
// This component defines its own animation variants.
const customVariants = {
initial: { opacity: 0, y: 20 },
animate: { opacity: 1, y: 0 },
whileHover: {
scale: 1.05,
textShadow: "0 0 8px rgb(255,255,255), 0 0 20px #fde047",
color: "#fefce8"
},
};

    // It merges its variants with any from the data...
    const mergedAnimation = merge({}, customVariants, data.animation);
    // ...but respects the layout's transition timing.
    mergedAnimation.transition = merge({}, mergedAnimation.transition, overrideTransition);

    return (
      <motion.div
        ref={ref}
        style={{ ...data.style, ...overrideStyle }}
        variants={mergedAnimation}
        initial="initial"
        animate="animate"
        whileHover="whileHover"
        transition={mergedAnimation.transition}
      >
        {data.text}
      </motion.div>
    );

}
);
CoolGlowAtom.displayName = "CoolGlowAtom"; 5. The Casting Director: primitives/componentRegistry.ts
This file maps the string names from your JSON to the actual components.
Apply to componentReg...
import { ComponentType } from 'react';
import { BaseAtomProps } from './types';
import { DefaultTextAtom } from '../custom-atoms/DefaultTextAtom';
import { CoolGlowAtom } from '../custom-atoms/CoolGlowAtom';

export const componentRegistry: Record<string, ComponentType<BaseAtomProps>> = {
default: DefaultTextAtom,
'cool-glow': CoolGlowAtom,
// Register all your other custom atoms here
}; 6. The Dispatcher: primitives/AtomRenderer.tsx
This component reads data.component and renders the correct atom from the registry.
Apply to AtomRenderer...
'use client';
import React, { forwardRef } from 'react';
import { BaseAtomProps } from './types';
import { componentRegistry } from './componentRegistry';

export const AtomRenderer = forwardRef<HTMLElement, Omit<BaseAtomProps, 'ref'>>(
({ data, ...props }, ref) => {
const ComponentToRender = componentRegistry[data.component] || componentRegistry.default;

    return <ComponentToRender ref={ref} data={data} {...props} />;

}
);
AtomRenderer.displayName = "AtomRenderer"; 7. The Updated Director: layouts/VerticalFillLayout.tsx
The layout is now responsible for passing down the staggered delay to each atom.
Apply to VerticalFill...
'use client';
import React, { useRef } from 'react';
import { AtomData, MotionTransition } from '../primitives/types';
import { AtomRenderer } from '../primitives/AtomRenderer';
import { useFitText } from '../hooks/useFitText';

const FitTextSlot = ({ atomData, index }: { atomData: AtomData, index: number }) => {
const containerRef = useRef<HTMLDivElement>(null);
const textStyle = useFitText({ containerRef, strategy: 'fill-width' });

// The layout calculates a staggered delay for each atom.
const overrideTransition: MotionTransition = {
delay: 0.1 \* index,
};

return (
<div ref={containerRef} style={{ width: '100%', flex: 1, display: 'flex' }}>
<AtomRenderer 
        data={atomData} 
        overrideStyle={textStyle}
        overrideTransition={overrideTransition}
      />
</div>
);
};

export const VerticalFillLayout = ({ content }: { content: AtomData[] }) => {
return (
<div style={{ display: 'flex', flexDirection: 'column', height: '400px', width: '100%' }}>
{content.map((atom, index) => (
<FitTextSlot key={atom.id} atomData={atom} index={index} />
))}
</div>
);
}; 8. Final Usage (page.tsx)
Your page now specifies which component to use for each piece of text.
Apply to atom.tsx
// In your page.tsx
const pageContent: AtomData[] = [
{
id: 'word1',
text: 'FULLY',
component: 'default', // Uses the standard atom
style: { fontFamily: 'Bebas Neue', color: '#3B82F6' }
},
{
id: 'word2',
text: 'CUSTOMIZABLE',
component: 'cool-glow', // Uses our new fancy atom
style: { fontFamily: 'Bebas Neue', color: '#facc15' }
},
];
This architecture provides the ultimate separation of concerns you were looking for. It's scalable, flexible, and gives you fine-grained control over every aspect of the design and animation process.
