import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import BodyPart from './BodyPart';
import SensationPanel from './SensationPanel';

type BodyZone = 'HEAD' | 'THROAT' | 'CHEST' | 'SOLAR_PLEXUS' | 'BELLY' | 'PELVIS' | 'ARMS' | 'LEGS';

interface BodyPathData {
  zone: BodyZone;
  path: string;
}

/**
 * SVG paths for the full-body somatic figure.
 * Coordinate space: viewBox="0 0 300 650"
 * This ensures a single shared coordinate system for all body parts.
 */
const bodyPaths: BodyPathData[] = [
  {
    zone: 'HEAD',
    path: 'M150,25 C175,25 195,45 195,75 C195,100 180,125 150,135 C120,125 105,100 105,75 C105,45 125,25 150,25 Z',
  },
  {
    zone: 'THROAT',
    path: 'M150,135 C165,138 175,145 175,160 C175,175 165,182 150,185 C135,182 125,175 125,160 C125,145 135,138 150,135 Z',
  },
  {
    zone: 'CHEST',
    path: 'M150,185 C180,188 210,200 210,240 C210,270 190,290 150,300 C110,290 90,270 90,240 C90,200 120,188 150,185 Z',
  },
  {
    zone: 'SOLAR_PLEXUS',
    path: 'M150,300 C180,305 210,315 210,350 C210,375 190,390 150,400 C110,390 90,375 90,350 C90,315 120,305 150,300 Z',
  },
  {
    zone: 'BELLY',
    path: 'M150,400 C185,408 210,425 210,465 C210,495 190,515 150,525 C110,515 90,495 90,465 C90,425 115,408 150,400 Z',
  },
  {
    zone: 'PELVIS',
    path: 'M150,525 C180,532 205,550 205,585 C205,610 180,630 150,640 C120,630 95,610 95,585 C95,550 120,532 150,525 Z',
  },
  {
    zone: 'ARMS',
    path: 'M70,220 L100,220 L110,340 L75,340 Z M230,220 L200,220 L190,340 L225,340 Z',
  },
  {
    zone: 'LEGS',
    path: 'M120,640 C110,660 100,600 100,620 L130,620 C130,600 140,560 150,525 L150,525 C160,560 170,600 170,620 L200,620 C200,600 190,660 180,640 Z',
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
      <div className="flex-1 flex justify-center items-center min-h-96">
        <svg
          width="300"
          height="650"
          viewBox="0 0 300 650"
          className="drop-shadow-xl max-w-full h-auto"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Render all body parts as children */}
          {bodyPaths.map((bodyPath) => (
            <BodyPart
              key={bodyPath.zone}
              zone={bodyPath.zone}
              path={bodyPath.path}
              isSelected={selectedZone === bodyPath.zone}
              isHovered={hoveredZone === bodyPath.zone}
              onClick={() => handleZoneClick(bodyPath.zone)}
              onHoverStart={() => setHoveredZone(bodyPath.zone)}
              onHoverEnd={() => setHoveredZone(null)}
            />
          ))}
        </svg>
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
