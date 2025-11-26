import { motion, AnimatePresence } from 'framer-motion';
import React, { useMemo } from 'react';

type BodyZone = 'HEAD' | 'THROAT' | 'CHEST' | 'SOLAR_PLEXUS' | 'BELLY' | 'PELVIS' | 'ARMS' | 'LEGS';

interface BodyPartProps {
  zone: BodyZone;
  path: string;
  gradientId: string;
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
 * Helper to calculate the center point of a path for the heat orb positioning.
 * This is a simplified approximation based on the zone.
 */
const getZoneCenter = (zone: BodyZone): { cx: number; cy: number; r: number } => {
  switch (zone) {
    case 'HEAD': return { cx: 150, cy: 65, r: 45 };
    case 'THROAT': return { cx: 150, cy: 120, r: 25 };
    case 'CHEST': return { cx: 150, cy: 180, r: 70 };
    case 'SOLAR_PLEXUS': return { cx: 150, cy: 280, r: 50 };
    case 'BELLY': return { cx: 150, cy: 340, r: 55 };
    case 'PELVIS': return { cx: 150, cy: 410, r: 60 };
    // Arms and Legs are multi-part or long, so we handle them slightly differently or use a large covering orb
    case 'ARMS': return { cx: 150, cy: 250, r: 140 };
    case 'LEGS': return { cx: 150, cy: 530, r: 120 };
  }
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
      isSelected,
      isHovered,
      onClick,
      onHoverStart,
      onHoverEnd,
    },
    ref
  ) => {
    const center = useMemo(() => getZoneCenter(zone), [zone]);
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
            cx={center.cx}
            cy={center.cy}
            r={center.r}
            fill={`url(#${gradientId})`}
            initial="idle"
            animate={isSelected ? "active" : isHovered ? "hover" : "idle"}
            variants={orbVariants}
            transition={isSelected ? pulseTransition : undefined}
            style={{ transformOrigin: `${center.cx}px ${center.cy}px` }}
          />

          {/* Secondary "Core" for extra depth when active */}
          {isSelected && (
            <motion.circle
              cx={center.cx}
              cy={center.cy}
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
