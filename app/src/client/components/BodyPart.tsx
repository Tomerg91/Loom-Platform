import { motion } from 'framer-motion';
import React from 'react';

type BodyZone = 'HEAD' | 'THROAT' | 'CHEST' | 'SOLAR_PLEXUS' | 'BELLY' | 'PELVIS' | 'ARMS' | 'LEGS';

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
  HEAD: 'Head',
  THROAT: 'Throat',
  CHEST: 'Chest',
  SOLAR_PLEXUS: 'Solar Plexus',
  BELLY: 'Belly',
  PELVIS: 'Pelvis',
  ARMS: 'Arms',
  LEGS: 'Legs',
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
    ref
  ) => {
    const maskId = `clip-${zone}`;

    // Animation variants for the Heat Orb
    const orbVariants = {
      idle: {
        opacity: 0,
        scale: 0.8,
        filter: 'blur(10px)',
      },
      hover: {
        opacity: 0.6,
        scale: 1.1,
        filter: 'blur(20px)', // Bloom effect
        transition: { duration: 0.4, ease: "easeOut" as const }
      },
      active: {
        opacity: 0.9,
        scale: 1.2,
        filter: 'blur(15px)',
        transition: { duration: 0.5, ease: "easeOut" as const }
      }
    };

    // Pulse animation for active state
    const pulseTransition = {
      opacity: {
        duration: 2.5,
        repeat: Infinity,
        repeatType: "reverse" as const,
        ease: "easeInOut" as const
      },
      scale: {
        duration: 3,
        repeat: Infinity,
        repeatType: "reverse" as const,
        ease: "easeInOut" as const
      }
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
            style={{ transformOrigin: `${center.x}px ${center.y}px` }}
          />

          {/* Secondary "Core" for extra depth when active */}
          {isSelected && (
            <motion.circle
              cx={center.x}
              cy={center.y}
              r={center.r * 0.6}
              fill="white"
              opacity={0.3}
              filter="blur(10px)"
              initial={{ scale: 0 }}
              animate={{ scale: 1, opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </g>

        {/* 2. INTERACTION LAYER (Invisible Path) */}
        {/* We also use this to draw a subtle rim light when active/hovered */}
        <motion.path
          ref={ref}
          d={path}
          role="button"
          tabIndex={0}
          aria-label={zoneLabels[zone]}
          className="cursor-pointer focus-visible:outline-none"
          fill="transparent"
          stroke={isSelected || isHovered ? "white" : "transparent"}
          strokeOpacity={isSelected ? 0.5 : 0.2}
          strokeWidth={isSelected ? 2 : 1}
          vectorEffect="non-scaling-stroke"
          onClick={onClick}
          onMouseEnter={onHoverStart}
          onMouseLeave={onHoverEnd}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick();
            }
          }}
          whileTap={{ scale: 0.99 }} // Subtle tactile feedback
        />
      </g>
    );
  }
);

BodyPart.displayName = 'BodyPart';

export default BodyPart;
