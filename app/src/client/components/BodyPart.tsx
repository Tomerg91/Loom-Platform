import { motion } from "framer-motion";
import React from "react";

type BodyZone =
  | "HEAD"
  | "THROAT"
  | "CHEST"
  | "SOLAR_PLEXUS"
  | "BELLY"
  | "PELVIS"
  | "ARMS"
  | "LEGS";

interface BodyPartProps {
  zone: BodyZone;
  path: string;
  gradientId: string;
  center: { x: number; y: number; r: number };
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}

const zoneLabels: Record<BodyZone, string> = {
  HEAD: "Head",
  THROAT: "Throat",
  CHEST: "Chest",
  SOLAR_PLEXUS: "Solar Plexus",
  BELLY: "Belly",
  PELVIS: "Pelvis",
  ARMS: "Arms",
  LEGS: "Legs",
};

/**
 * BodyPart Component - High-Fidelity Volumetric Heatmap
 *
 * Renders:
 * 1. A "Heat Orb" (motion.circle/ellipse) masked by the body path.
 *    - This creates the effect of internal energy emanating from within.
 * 2. An invisible interaction layer (the path itself) to capture events.
 */
const BodyPart = React.forwardRef<SVGPathElement, BodyPartProps>(
  (
    {
      zone,
      path,
      gradientId,
      center,
      isSelected,
      isHovered,
      onClick,
      onHoverStart,
      onHoverEnd,
    },
    ref,
  ) => {
    const maskId = `clip-${zone}`;

    // Animation variants for the Heat Orb
    const orbVariants = {
      idle: {
        opacity: 0,
        scale: 0.8,
        filter: "blur(10px)",
      },
      hover: {
        opacity: 0.5,
        scale: 1.05,
        filter: "blur(15px)",
        transition: { duration: 0.4, ease: "easeOut" as const },
      },
      active: {
        opacity: 0.85,
        scale: 1.15,
        filter: "blur(12px)",
        transition: { duration: 0.5, ease: "easeOut" as const },
      },
    };

    // Organic "Breathing" Pulse for active state
    const pulseTransition = {
      opacity: {
        duration: 3,
        repeat: Infinity,
        repeatType: "reverse" as const,
        ease: "easeInOut" as const,
      },
      scale: {
        duration: 4,
        repeat: Infinity,
        repeatType: "reverse" as const,
        ease: "easeInOut" as const,
      },
    };

    return (
      <g>
        {/* 1. VOLUMETRIC HEAT LAYER (Masked) */}
        <g clipPath={`url(#${maskId})`}>
          <motion.circle
            cx={center.x}
            cy={center.y}
            r={center.r}
            fill={`url(#${gradientId})`}
            initial="idle"
            animate={isSelected ? "active" : isHovered ? "hover" : "idle"}
            variants={orbVariants}
            transition={isSelected ? pulseTransition : undefined}
          />

          {/* Secondary "Core" for extra depth when active */}
          {isSelected && (
            <>
              {/* Inner bright core */}
              <motion.circle
                cx={center.x}
                cy={center.y}
                r={center.r * 0.4}
                fill="white"
                opacity={0.3}
                filter="blur(12px)"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{
                  scale: [0.5, 0.8, 0.5],
                  opacity: [0.2, 0.5, 0.2],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              {/* Outer ripple */}
              <motion.circle
                cx={center.x}
                cy={center.y}
                r={center.r * 0.8}
                fill={`url(#${gradientId})`}
                opacity={0.2}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{
                  scale: [0.8, 1.2, 0.8],
                  opacity: [0.1, 0.3, 0.1],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5,
                }}
              />
            </>
          )}
        </g>

        {/* 2. INTERACTION LAYER & RIM LIGHT */}
        <motion.path
          ref={ref}
          d={path}
          role="button"
          tabIndex={0}
          aria-label={zoneLabels[zone]}
          className="cursor-pointer focus-visible:outline-none"
          fill="transparent"
          // Rim light effect
          stroke={
            isSelected
              ? "white"
              : isHovered
                ? "rgba(255,255,255,0.5)"
                : "transparent"
          }
          strokeOpacity={isSelected ? 0.6 : isHovered ? 0.4 : 0}
          strokeWidth={isSelected ? 1.5 : 15} // Increased stroke width for hit area, visually handled by opacity
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={false}
          animate={{
            strokeOpacity: isSelected ? 0.6 : isHovered ? 0.4 : 0,
            // When not selected/hovered, we want the stroke to be invisible but present for clicks
            // However, strokeOpacity 0 makes it unclickable in some SVG implementations if fill is also transparent.
            // A better approach for "invisible hit area" is to use a separate path, but here we can keep strokeOpacity > 0 but stroke color transparent.
            // Actually, 'transparent' color with width 15 works best for hit testing.
          }}
          style={{
            // Ensure the stroke captures events even if transparent
            pointerEvents: "all",
          }}
          transition={{ duration: 0.3 }}
          onClick={onClick}
          onMouseEnter={onHoverStart}
          onMouseLeave={onHoverEnd}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick();
            }
          }}
          whileTap={{ scale: 0.98 }} // Subtle tactile feedback
        />
      </g>
    );
  },
);

BodyPart.displayName = "BodyPart";

export default BodyPart;
