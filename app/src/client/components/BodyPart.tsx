import { motion } from 'framer-motion';
import React from 'react';

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
 * BodyPart Component - High-Fidelity Thermal Heatmap
 *
 * Renders a single body zone as a motion.path element with:
 * - SVG radial gradient fills (referenced by gradientId)
 * - Elegant stroke work: 1px idle, 1.5px active (dark grey #374151)
 * - Pulse animation on active state (opacity 0.85→1→0.85 over 3 seconds)
 * - Vector-effect="non-scaling-stroke" for consistent outline rendering
 *
 * IMPORTANT: This component does NOT render an <svg> wrapper.
 * The parent (SomaticBodyMap) renders the single <svg> container,
 * ensuring all paths share the exact same coordinate space.
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
    // Idle state: transparent fill, dark grey outline
    const idleFill = 'transparent';
    const idleStroke = '#374151'; // Dark Grey
    const idleStrokeWidth = 1;

    // Hover state: subtle gradient glow at 40% opacity
    const hoverFill = `url(#${gradientId})`;
    const hoverFillOpacity = 0.4;
    const hoverStroke = '#374151'; // Dark Grey
    const hoverStrokeWidth = 1.5;

    // Active state: full gradient fill with pulse animation
    const activeFill = `url(#${gradientId})`;
    const activeStroke = '#374151'; // Dark Grey
    const activeStrokeWidth = 1.5;

    // Determine current state
    let fill = idleFill;
    let fillOpacity = 1;
    let stroke = idleStroke;
    let strokeWidth = idleStrokeWidth;

    if (isSelected) {
      fill = activeFill;
      fillOpacity = 1; // Will be animated via framer-motion
      stroke = activeStroke;
      strokeWidth = activeStrokeWidth;
    } else if (isHovered) {
      fill = hoverFill;
      fillOpacity = hoverFillOpacity;
      stroke = hoverStroke;
      strokeWidth = hoverStrokeWidth;
    }

    return (
      <motion.path
        ref={ref}
        d={path}
        role="button"
        tabIndex={0}
        aria-label={zoneLabels[zone]}
        className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
        fill={fill}
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
        animate={{
          opacity: isSelected ? [0.85, 1, 0.85] : 1,
          strokeWidth,
        }}
        transition={
          isSelected
            ? {
                opacity: {
                  duration: 3,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                },
                strokeWidth: {
                  duration: 0.3,
                  ease: 'easeOut',
                },
              }
            : {
                duration: 0.3,
                ease: 'easeOut',
              }
        }
        onClick={onClick}
        onMouseEnter={onHoverStart}
        onMouseLeave={onHoverEnd}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
      />
    );
  }
);

BodyPart.displayName = 'BodyPart';

export default BodyPart;
