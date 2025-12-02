import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import BodyPart from './BodyPart';
import SensationPanel from './SensationPanel';

type BodyZone = 'HEAD' | 'THROAT' | 'CHEST' | 'SOLAR_PLEXUS' | 'BELLY' | 'PELVIS' | 'ARMS' | 'LEGS';

interface BodyPathData {
  zone: BodyZone;
  path: string;
  gradientId: string;
  center: { x: number; y: number; r: number }; // x, y, radius
}

/**
 * Zone-to-Gradient Configuration
 * Maps each body zone to its thermal/energy gradient for the heatmap aesthetic
 */
const zoneGradientMap: Record<BodyZone, string> = {
  HEAD: 'warm-glow',
  THROAT: 'yellow-light',
  CHEST: 'heart-heat',
  SOLAR_PLEXUS: 'cool-blue',
  BELLY: 'cool-blue',
  PELVIS: 'cool-blue',
  ARMS: 'warm-glow',
  LEGS: 'ground-green',
};

/**
 * High-Fidelity Anatomical Body Paths
 * Coordinate space: viewBox="0 0 300 650"
 *
 * Improvements:
 * - Cubic Bezier curves (C) to simulate musculature
 * - Realistic shoulders, calves, thighs with defined curves
 * - Organic torso flowing naturally from chest to hips
 * - Real limb proportions with tapering
 * - Explicit center coordinates for accurate heat orb placement
 */
const bodyPaths: BodyPathData[] = [
  {
    zone: 'HEAD',
    // Organic oval with jawline definition
    path: 'M 150 20 C 135 20 125 35 125 60 C 125 85 135 100 150 100 C 165 100 175 85 175 60 C 175 35 165 20 150 20 Z',
    gradientId: zoneGradientMap.HEAD,
    center: { x: 150, y: 60, r: 40 },
  },
  {
    zone: 'THROAT',
    // Tapered neck connecting jaw to clavicle
    path: 'M 138 95 C 138 105 130 115 130 120 L 170 120 C 170 115 162 105 162 95 Q 150 102 138 95 Z',
    gradientId: zoneGradientMap.THROAT,
    center: { x: 150, y: 110, r: 25 },
  },
  {
    zone: 'CHEST',
    // Defined pectorals/breastplate, wider at shoulders (deltoids)
    path: 'M 130 120 C 100 120 80 135 80 160 C 80 190 90 200 150 200 C 210 200 220 190 220 160 C 220 135 200 120 170 120 Z',
    gradientId: zoneGradientMap.CHEST,
    center: { x: 150, y: 160, r: 60 },
  },
  {
    zone: 'SOLAR_PLEXUS',
    // Diamond shape fitting under the chest arch
    path: 'M 110 200 C 120 200 150 190 190 200 C 185 230 170 245 150 245 C 130 245 115 230 110 200 Z',
    gradientId: zoneGradientMap.SOLAR_PLEXUS,
    center: { x: 150, y: 220, r: 35 },
  },
  {
    zone: 'BELLY',
    // Rounded organic abdomen
    path: 'M 110 245 C 105 260 105 290 150 290 C 195 290 195 260 190 245 C 170 255 130 255 110 245 Z',
    gradientId: zoneGradientMap.BELLY,
    center: { x: 150, y: 265, r: 45 },
  },
  {
    zone: 'PELVIS',
    // Hips widening slightly
    path: 'M 105 290 C 95 310 95 330 150 340 C 205 330 205 310 195 290 C 180 295 120 295 105 290 Z',
    gradientId: zoneGradientMap.PELVIS,
    center: { x: 150, y: 315, r: 50 },
  },
  {
    zone: 'ARMS',
    // Anatomical arms: Deltoid -> Bicep -> Forearm -> Hand
    // Left Arm
    path: 'M 80 135 C 60 140 50 160 55 200 C 58 230 50 250 45 280 C 42 300 45 320 55 330 L 75 325 C 80 300 85 250 85 200 C 85 180 90 150 105 130 Z ' +
    // Right Arm
          'M 220 135 C 240 140 250 160 245 200 C 242 230 250 250 255 280 C 258 300 255 320 245 330 L 225 325 C 220 300 215 250 215 200 C 215 180 210 150 195 130 Z',
    gradientId: zoneGradientMap.ARMS,
    center: { x: 150, y: 220, r: 140 }, // Large aura covering both sides
  },
  {
    zone: 'LEGS',
    // Anatomical legs: Thighs -> Knees -> Calves
    // Left Leg
    path: 'M 100 335 C 90 380 95 420 105 450 C 100 480 95 520 100 560 L 130 560 C 135 520 140 480 135 450 C 145 420 145 380 140 335 Z ' +
    // Right Leg
          'M 200 335 C 210 380 205 420 195 450 C 200 480 205 520 200 560 L 170 560 C 165 520 160 480 165 450 C 155 420 155 380 160 335 Z',
    gradientId: zoneGradientMap.LEGS,
    center: { x: 150, y: 450, r: 120 }, // Large aura covering both legs
  },
];

// Combine all paths to create a full body silhouette
const fullBodyPath = bodyPaths.map(p => p.path).join(' ');

/**
 * SomaticBodyMap Component
 *
 * High-Fidelity Volumetric Refactor - "Blended Energy Body"
 */
export default function SomaticBodyMap() {
  const [selectedZone, setSelectedZone] = useState<BodyZone | null>(null);
  const [hoveredZone, setHoveredZone] = useState<BodyZone | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const handleZoneClick = (zone: BodyZone) => {
    setSelectedZone(zone);
    setIsPanelOpen(true);
  };

  const handlePanelClose = () => {
    setIsPanelOpen(false);
    setSelectedZone(null);
    setHoveredZone(null);
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-8 items-stretch">
      {/* SVG Body Map Container */}
      <div className="flex-1 flex flex-col justify-center items-center min-h-96 gap-4">
        <svg
          width="300"
          height="650"
          viewBox="0 0 300 650"
          className="max-w-full h-auto rounded-2xl overflow-visible"
          style={{
            // Subtle background gradient for depth
            background: 'radial-gradient(circle at 50% 40%, #ffffff 0%, #FDFBF7 100%)'
          }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* 1. FILTERS for Volumetric Effect */}

            {/* Soft Glow Filter */}
            <filter id="glow-filter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="15" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Inner Body Shadow for 2.5D effect */}
            <filter id="inner-body-shadow">
              <feOffset dx="0" dy="4" />
              <feGaussianBlur stdDeviation="4" result="offset-blur" />
              <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
              <feFlood floodColor="black" floodOpacity="0.1" result="color" />
              <feComposite operator="in" in="color" in2="inverse" result="shadow" />
              <feComposite operator="over" in="shadow" in2="SourceGraphic" />
            </filter>

            {/* 2. GRADIENTS (Refined) */}
            <radialGradient id="warm-glow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.9} />
              <stop offset="70%" stopColor="#F59E0B" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
            </radialGradient>

            <radialGradient id="heart-heat" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <stop offset="0%" stopColor="#EF4444" stopOpacity={0.9} />
              <stop offset="70%" stopColor="#EF4444" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
            </radialGradient>

            <radialGradient id="cool-blue" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9} />
              <stop offset="70%" stopColor="#3B82F6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
            </radialGradient>

            <radialGradient id="ground-green" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
              <stop offset="70%" stopColor="#10B981" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
            </radialGradient>

            <radialGradient id="yellow-light" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <stop offset="0%" stopColor="#FCD34D" stopOpacity={0.9} />
              <stop offset="70%" stopColor="#FCD34D" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#FCD34D" stopOpacity={0} />
            </radialGradient>

            {/* 3. MASKS */}
            {bodyPaths.map((bp) => (
              <clipPath id={`clip-${bp.zone}`} key={bp.zone}>
                <path d={bp.path} />
              </clipPath>
            ))}
          </defs>

          {/* BASE LAYER: Glass-morphism Body Silhouette */}
          <g filter="url(#inner-body-shadow)">
            <path
              d={fullBodyPath}
              fill="#F3F4F6"
              stroke="#E5E7EB"
              strokeWidth="1"
              className="opacity-50"
            />
          </g>

          {/* INTERACTIVE LAYERS */}
          {bodyPaths.map((bodyPath) => (
            <BodyPart
              key={bodyPath.zone}
              zone={bodyPath.zone}
              path={bodyPath.path}
              gradientId={bodyPath.gradientId}
              center={bodyPath.center}
              isSelected={selectedZone === bodyPath.zone}
              isHovered={hoveredZone === bodyPath.zone}
              onClick={() => handleZoneClick(bodyPath.zone)}
              onHoverStart={() => setHoveredZone(bodyPath.zone)}
              onHoverEnd={() => setHoveredZone(null)}
            />
          ))}
        </svg>

        {/* Legend Card */}
        <div className="mt-4 px-6 py-4 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100">
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shadow-sm"
                style={{ background: '#10B981' }}
              ></div>
              <span className="text-gray-600 font-medium">Low (Calm)</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shadow-sm"
                style={{ background: '#FCD34D' }}
              ></div>
              <span className="text-gray-600 font-medium">Medium (Active)</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shadow-sm"
                style={{ background: '#EF4444' }}
              ></div>
              <span className="text-gray-600 font-medium">High (Intense)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sensation Panel */}
      <div className="flex-1 min-h-96 flex items-center lg:items-stretch">
        <AnimatePresence mode="wait">
          {isPanelOpen && selectedZone && (
            <SensationPanel
              selectedZone={selectedZone}
              onClose={handlePanelClose}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
