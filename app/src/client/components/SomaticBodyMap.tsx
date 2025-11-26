import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import BodyPart from './BodyPart';
import SensationPanel from './SensationPanel';

type BodyZone = 'HEAD' | 'THROAT' | 'CHEST' | 'SOLAR_PLEXUS' | 'BELLY' | 'PELVIS' | 'ARMS' | 'LEGS';

interface BodyPathData {
  zone: BodyZone;
  path: string;
  gradientId: string;
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
 * Refined SVG paths for the full-body somatic figure.
 * Coordinate space: viewBox="0 0 300 650"
 * 
 * Improvements:
 * - More organic connections between joints
 * - Overlapping regions for seamless blending
 */
const bodyPaths: BodyPathData[] = [
  {
    zone: 'HEAD',
    // Smoother neck connection
    path: 'M150 20 C 130 20 115 35 115 60 C 115 80 125 95 135 105 L 135 115 C 135 120 120 125 100 130 L 200 130 C 180 125 165 120 165 115 L 165 105 C 175 95 185 80 185 60 C 185 35 170 20 150 20 Z',
    gradientId: zoneGradientMap.HEAD,
  },
  {
    zone: 'THROAT',
    // Organic bridge between head and chest
    path: 'M 135 105 C 135 115 125 125 135 135 L 165 135 C 175 125 165 115 165 105 C 160 108 155 110 150 110 C 145 110 140 108 135 105 Z',
    gradientId: zoneGradientMap.THROAT,
  },
  {
    zone: 'CHEST',
    // Broader, more rounded shoulders
    path: 'M 100 130 C 80 140 50 150 45 180 L 60 250 C 60 250 90 240 150 240 C 210 240 240 250 240 250 L 255 180 C 250 150 220 140 200 130 L 100 130 Z',
    gradientId: zoneGradientMap.CHEST,
  },
  {
    zone: 'SOLAR_PLEXUS',
    // Upper abdomen, blending into chest and belly
    path: 'M 65 245 C 70 290 80 320 150 320 C 220 320 230 290 235 245 C 200 235 100 235 65 245 Z',
    gradientId: zoneGradientMap.SOLAR_PLEXUS,
  },
  {
    zone: 'BELLY',
    // Lower abdomen, rounded
    path: 'M 70 310 C 75 360 85 390 150 390 C 215 390 225 360 230 310 C 220 320 80 320 70 310 Z',
    gradientId: zoneGradientMap.BELLY,
  },
  {
    zone: 'PELVIS',
    // Hips and groin area
    path: 'M 85 380 C 85 410 90 430 100 450 L 150 460 L 200 450 C 210 430 215 410 215 380 C 180 385 120 385 85 380 Z',
    gradientId: zoneGradientMap.PELVIS,
  },
  {
    zone: 'ARMS',
    // Natural arm curves
    path: 'M 45 180 C 25 190 15 230 10 270 C 5 310 5 330 15 350 L 35 340 C 30 310 35 270 60 250 L 45 180 Z M 255 180 C 275 190 285 230 290 270 C 295 310 295 330 285 350 L 265 340 C 270 310 265 270 240 250 L 255 180 Z',
    gradientId: zoneGradientMap.ARMS,
  },
  {
    zone: 'LEGS',
    // Full legs
    path: 'M 100 450 C 90 500 90 570 95 620 L 80 640 L 120 640 L 110 620 C 115 570 130 500 150 460 L 100 450 Z M 200 450 C 210 500 210 570 205 620 L 220 640 L 180 640 L 190 620 C 185 570 170 500 150 460 L 200 450 Z',
    gradientId: zoneGradientMap.LEGS,
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
