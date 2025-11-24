import { motion } from 'framer-motion';
import React from 'react';

type BodyZone = 'HEAD' | 'THROAT' | 'CHEST' | 'SOLAR_PLEXUS' | 'BELLY' | 'PELVIS' | 'ARMS' | 'LEGS';

interface BodyPartProps {
  zone: BodyZone;
  path: string;
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
 * BodyPart Component
 *
 * Renders a single body zone as a motion.path element.
 * IMPORTANT: This component does NOT render an <svg> wrapper.
 * The parent (SomaticBodyMap) renders the single <svg> container,
 * ensuring all paths share the exact same coordinate space.
 */
const BodyPart = React.forwardRef<SVGPathElement, BodyPartProps>(
  (
    {
      zone,
      path,
      isSelected,
      isHovered,
      onClick,
      onHoverStart,
      onHoverEnd,
    },
    ref
  ) => {
    // Idle state colors
    const idleFill = 'transparent';
    const idleStroke = 'rgb(203 213 225)'; // slate-300
    const idleStrokeWidth = 1.5;

    // Hover state colors (desktop only)
    const hoverFill = 'rgb(240 253 250)'; // teal-50
    const hoverStroke = 'rgb(153 246 228)'; // teal-300
    const hoverStrokeWidth = 2;

    // Active state colors
    const activeFill = 'rgb(204 251 241)'; // teal-200
    const activeStroke = 'rgb(13 148 136)'; // teal-600
    const activeStrokeWidth = 3;

    // Determine current colors
    let fill = idleFill;
    let stroke = idleStroke;
    let strokeWidth = idleStrokeWidth;

    if (isSelected) {
      fill = activeFill;
      stroke = activeStroke;
      strokeWidth = activeStrokeWidth;
    } else if (isHovered) {
      fill = hoverFill;
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
        className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        animate={{
          fill,
          stroke,
          strokeWidth,
        }}
        transition={{
          duration: 0.3,
          ease: 'easeOut',
        }}
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
