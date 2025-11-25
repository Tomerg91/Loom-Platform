import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
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
 * SVG paths for the full-body somatic figure with organic human silhouette.
 * Coordinate space: viewBox="0 0 300 650"
 * This ensures a single shared coordinate system for all body parts.
 *
 * Design notes:
 * - HEAD: Smooth rounded head flowing into neck (y: 20-110)
 * - THROAT: Organic neck/throat connecting head to chest (y: 110-125)
 * - CHEST: Broad organic chest with rounded shoulders (y: 125-290)
 * - ARMS: Separate left/right arms with natural curves (y: 170-340)
 * - SOLAR_PLEXUS: Upper abdomen (y: 280-360)
 * - BELLY: Lower abdomen/navel (y: 280-360)
 * - PELVIS: Hip area (y: 360-440)
 * - LEGS: Full legs to feet (y: 430-620)
 */
const bodyPaths: BodyPathData[] = [
  {
    zone: 'HEAD',
    path: 'M150 20 C 130 20 115 35 115 60 C 115 80 125 95 135 100 L 135 110 C 135 115 120 120 100 125 L 200 125 C 180 120 165 115 165 110 L 165 100 C 175 95 185 80 185 60 C 185 35 170 20 150 20 Z',
    gradientId: zoneGradientMap.HEAD,
  },
  {
    zone: 'THROAT',
    path: 'M 135 110 C 140 112 145 115 150 115 C 155 115 160 112 165 110 L 165 125 C 160 127 155 128 150 128 C 145 128 140 127 135 125 Z',
    gradientId: zoneGradientMap.THROAT,
  },
  {
    zone: 'CHEST',
    path: 'M 100 125 C 80 135 60 145 50 170 L 65 240 C 65 240 90 230 150 230 C 210 230 235 240 235 240 L 250 170 C 240 145 220 135 200 125 L 100 125 Z',
    gradientId: zoneGradientMap.CHEST,
  },
  {
    zone: 'SOLAR_PLEXUS',
    path: 'M 70 280 C 75 330 85 360 150 360 C 215 360 225 330 230 280 C 220 290 80 290 70 280 Z',
    gradientId: zoneGradientMap.SOLAR_PLEXUS,
  },
  {
    zone: 'BELLY',
    path: 'M 65 240 C 70 280 80 290 150 290 C 220 290 230 280 235 240 C 200 230 100 230 65 240 Z',
    gradientId: zoneGradientMap.BELLY,
  },
  {
    zone: 'PELVIS',
    path: 'M 85 360 C 85 390 90 410 100 430 L 150 440 L 200 430 C 210 410 215 390 215 360 C 180 365 120 365 85 360 Z',
    gradientId: zoneGradientMap.PELVIS,
  },
  {
    zone: 'ARMS',
    path: 'M 50 170 C 30 180 20 220 15 260 C 10 300 10 320 20 340 L 40 330 C 35 300 40 260 65 240 L 50 170 Z M 250 170 C 270 180 280 220 285 260 C 290 300 290 320 280 340 L 260 330 C 265 300 260 260 235 240 L 250 170 Z',
    gradientId: zoneGradientMap.ARMS,
  },
  {
    zone: 'LEGS',
    path: 'M 100 430 C 90 480 90 550 95 600 L 80 620 L 120 620 L 110 600 C 115 550 130 480 150 440 L 100 430 Z M 200 430 C 210 480 210 550 205 600 L 220 620 L 180 620 L 190 600 C 185 550 170 480 150 440 L 200 430 Z',
    gradientId: zoneGradientMap.LEGS,
  },
];

/**
 * SomaticBodyMap Component
 *
 * Main interactive body map widget with the following architecture:
 *
 * 1. SINGLE SVG WRAPPER: This component renders ONE <svg viewBox="0 0 300 650"> element
 * 2. CHILD BODY PARTS: BodyPart components render ONLY <motion.path /> elements
 *    - No nested <svg> tags in children
 *    - All paths share the exact same coordinate space
 * 3. SIDE PANEL: SensationPanel slides in when a zone is selected
 * 4. MOBILE-FIRST: Tap = Active immediately, hover is enhancement for desktop
 *
 * Data Flow:
 * - User taps/clicks zone → State updates (selectedZone)
 * - SensationPanel slides in → User selects sensation
 * - "Save to Journal" → Data saved to sessionStorage
 * - Redirect to /signup (OAuth-safe, no URL params)
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
          className="drop-shadow-lg max-w-full h-auto rounded-2xl"
          style={{ backgroundColor: '#FDFBF7' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* SVG Gradient Definitions */}
          <defs>
            {/* Warm Glow: Orange/Yellow for Head & Arms */}
            <radialGradient id="warm-glow" cx="50%" cy="40%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity={1} />
              <stop offset="100%" stopColor="#FEF3C7" stopOpacity={0.8} />
            </radialGradient>

            {/* Heart Heat: Red/Pink for Chest */}
            <radialGradient id="heart-heat" cx="50%" cy="40%">
              <stop offset="0%" stopColor="#EF4444" stopOpacity={1} />
              <stop offset="100%" stopColor="#FEE2E2" stopOpacity={0.8} />
            </radialGradient>

            {/* Cool Blue: Blue/Cyan for Solar Plexus, Belly, Pelvis */}
            <radialGradient id="cool-blue" cx="50%" cy="40%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
              <stop offset="100%" stopColor="#DBEAFE" stopOpacity={0.8} />
            </radialGradient>

            {/* Ground Green: Green for Legs */}
            <radialGradient id="ground-green" cx="50%" cy="40%">
              <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
              <stop offset="100%" stopColor="#D1FAE5" stopOpacity={0.8} />
            </radialGradient>

            {/* Yellow Light: Amber for Throat */}
            <radialGradient id="yellow-light" cx="50%" cy="40%">
              <stop offset="0%" stopColor="#FCD34D" stopOpacity={1} />
              <stop offset="100%" stopColor="#FEF3C7" stopOpacity={0.8} />
            </radialGradient>
          </defs>

          {/* Render all body parts as children */}
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
        <div className="mt-4 px-6 py-4 bg-white rounded-lg shadow-md border border-gray-100">
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ background: 'linear-gradient(135deg, #10B981, #D1FAE5)' }}
              ></div>
              <span className="text-gray-700">Low (Calm)</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ background: 'linear-gradient(135deg, #FCD34D, #FEF3C7)' }}
              ></div>
              <span className="text-gray-700">Medium (Active)</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ background: 'linear-gradient(135deg, #EF4444, #FEE2E2)' }}
              ></div>
              <span className="text-gray-700">High (Intense)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sensation Panel - Slides in from the right */}
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
