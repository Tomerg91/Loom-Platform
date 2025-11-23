import { useState } from "react";

// BodyZone type definition matching Prisma schema
type BodyZone = "HEAD" | "THROAT" | "CHEST" | "SOLAR_PLEXUS" | "BELLY" | "PELVIS" | "ARMS" | "LEGS" | "FULL_BODY";

type BodyMapSelectorProps = {
  onZoneSelect: (zone: BodyZone) => void;
  selectedZone?: BodyZone;
};

type ZoneDefinition = {
  zone: BodyZone;
  path: string;
  label: string;
  labelPosition: { x: number; y: number };
};

const zones: ZoneDefinition[] = [
  {
    zone: "HEAD",
    path: "M 150 40 m -25, 0 a 25,25 0 1,0 50,0 a 25,25 0 1,0 -50,0",
    label: "Head",
    labelPosition: { x: 150, y: 45 },
  },
  {
    zone: "THROAT",
    path: "M 135 70 L 165 70 L 165 85 L 135 85 Z",
    label: "Throat",
    labelPosition: { x: 150, y: 80 },
  },
  {
    zone: "CHEST",
    path: "M 120 90 L 180 90 L 185 130 L 115 130 Z",
    label: "Chest",
    labelPosition: { x: 150, y: 110 },
  },
  {
    zone: "SOLAR_PLEXUS",
    path: "M 115 135 L 185 135 L 180 165 L 120 165 Z",
    label: "Solar Plexus",
    labelPosition: { x: 150, y: 150 },
  },
  {
    zone: "BELLY",
    path: "M 120 170 L 180 170 L 175 205 L 125 205 Z",
    label: "Belly",
    labelPosition: { x: 150, y: 188 },
  },
  {
    zone: "PELVIS",
    path: "M 125 210 L 175 210 L 170 245 L 130 245 Z",
    label: "Pelvis",
    labelPosition: { x: 150, y: 228 },
  },
  {
    zone: "ARMS",
    path: "M 90 100 L 110 100 L 115 180 L 95 180 Z M 185 100 L 205 100 L 200 180 L 180 180 Z",
    label: "Arms",
    labelPosition: { x: 150, y: 140 },
  },
  {
    zone: "LEGS",
    path: "M 130 250 L 145 250 L 145 340 L 130 340 Z M 155 250 L 170 250 L 170 340 L 155 340 Z",
    label: "Legs",
    labelPosition: { x: 150, y: 295 },
  },
];

export default function BodyMapSelector({
  onZoneSelect,
  selectedZone,
}: BodyMapSelectorProps) {
  const [hoveredZone, setHoveredZone] = useState<BodyZone | null>(null);

  const getZoneColor = (zone: BodyZone): string => {
    if (selectedZone === zone) {
      return "#3b82f6"; // blue-500 - Selected
    }
    if (hoveredZone === zone) {
      return "#93c5fd"; // blue-300 - Hovered
    }
    return "#e5e7eb"; // gray-200 - Default
  };

  const getZoneStroke = (zone: BodyZone): string => {
    if (selectedZone === zone) {
      return "#1e40af"; // blue-800
    }
    return "#9ca3af"; // gray-400
  };

  return (
    <div className="flex flex-col items-center">
      <svg
        width="300"
        height="360"
        viewBox="0 0 300 360"
        className="max-w-full h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        {zones.map((zoneData) => (
          <g key={zoneData.zone}>
            <path
              d={zoneData.path}
              fill={getZoneColor(zoneData.zone)}
              stroke={getZoneStroke(zoneData.zone)}
              strokeWidth="2"
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredZone(zoneData.zone)}
              onMouseLeave={() => setHoveredZone(null)}
              onClick={() => onZoneSelect(zoneData.zone)}
            />
          </g>
        ))}
      </svg>

      <div className="mt-4 text-center">
        <p className="text-sm text-muted-foreground">
          {selectedZone ? (
            <span className="font-medium text-foreground">
              Selected: {zones.find((z) => z.zone === selectedZone)?.label}
            </span>
          ) : (
            "Click on a body zone to select"
          )}
        </p>
      </div>
    </div>
  );
}
