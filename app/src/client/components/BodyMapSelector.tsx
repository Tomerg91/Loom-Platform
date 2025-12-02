import React, { useState } from "react";
import { useTranslation } from "react-i18next";

// BodyZone type definition matching Prisma schema
type BodyZone = "HEAD" | "THROAT" | "CHEST" | "SOLAR_PLEXUS" | "BELLY" | "PELVIS" | "ARMS" | "LEGS" | "FULL_BODY";

type ZoneHighlight = {
  zone: BodyZone;
  intensity: number; // Average intensity for this zone
};

type BodyMapSelectorProps = {
  onZoneSelect?: (zone: BodyZone) => void;
  selectedZone?: BodyZone;
  mode?: "interactive" | "readonly";
  highlightedZones?: ZoneHighlight[];
};

type ZoneDefinitionBase = {
  zone: BodyZone;
  path: string;
  labelKey: string;
  labelPosition: { x: number; y: number };
};

const zoneDefinitions: ZoneDefinitionBase[] = [
  {
    zone: "HEAD",
    path: "M 150 40 m -25, 0 a 25,25 0 1,0 50,0 a 25,25 0 1,0 -50,0",
    labelKey: "somatic.bodyZones.HEAD",
    labelPosition: { x: 150, y: 45 },
  },
  {
    zone: "THROAT",
    path: "M 135 70 L 165 70 L 165 85 L 135 85 Z",
    labelKey: "somatic.bodyZones.THROAT",
    labelPosition: { x: 150, y: 80 },
  },
  {
    zone: "CHEST",
    path: "M 120 90 L 180 90 L 185 130 L 115 130 Z",
    labelKey: "somatic.bodyZones.CHEST",
    labelPosition: { x: 150, y: 110 },
  },
  {
    zone: "SOLAR_PLEXUS",
    path: "M 115 135 L 185 135 L 180 165 L 120 165 Z",
    labelKey: "somatic.bodyZones.SOLAR_PLEXUS",
    labelPosition: { x: 150, y: 150 },
  },
  {
    zone: "BELLY",
    path: "M 120 170 L 180 170 L 175 205 L 125 205 Z",
    labelKey: "somatic.bodyZones.BELLY",
    labelPosition: { x: 150, y: 188 },
  },
  {
    zone: "PELVIS",
    path: "M 125 210 L 175 210 L 170 245 L 130 245 Z",
    labelKey: "somatic.bodyZones.PELVIS",
    labelPosition: { x: 150, y: 228 },
  },
  {
    zone: "ARMS",
    path: "M 90 100 L 110 100 L 115 180 L 95 180 Z M 185 100 L 205 100 L 200 180 L 180 180 Z",
    labelKey: "somatic.bodyZones.ARMS",
    labelPosition: { x: 150, y: 140 },
  },
  {
    zone: "LEGS",
    path: "M 130 250 L 145 250 L 145 340 L 130 340 Z M 155 250 L 170 250 L 170 340 L 155 340 Z",
    labelKey: "somatic.bodyZones.LEGS",
    labelPosition: { x: 150, y: 295 },
  },
];

export default function BodyMapSelector({
  onZoneSelect,
  selectedZone,
  mode = "interactive",
  highlightedZones = [],
}: BodyMapSelectorProps) {
  const { t } = useTranslation();
  const [hoveredZone, setHoveredZone] = useState<BodyZone | null>(null);

  // Create zones array with translated labels
  const zones = zoneDefinitions.map((zone) => ({
    ...zone,
    label: t(zone.labelKey),
  }));

  const handleZoneActivate = (zone: BodyZone) => {
    if (mode === "interactive" && onZoneSelect) {
      onZoneSelect(zone);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<SVGPathElement>, zone: BodyZone) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleZoneActivate(zone);
    }
  };

  const getZoneAriaLabel = (zone: BodyZone): string => {
    const zoneLabel = zones.find((z) => z.zone === zone)?.label || zone;

    if (mode === "readonly") {
      const highlight = highlightedZones.find((h) => h.zone === zone);
      if (highlight) {
        return t("somatic.accessibility.bodyZoneWithIntensity", {
          defaultValue: `${zoneLabel} with intensity ${highlight.intensity}`,
          zone: zoneLabel,
          intensity: highlight.intensity,
        });
      }
      return zoneLabel;
    }

    if (selectedZone === zone) {
      return t("somatic.accessibility.bodyZoneSelected", {
        defaultValue: `${zoneLabel} selected. Press Enter or Space to change selection`,
        zone: zoneLabel,
      });
    }

    return t("somatic.accessibility.bodyZone", {
      defaultValue: `${zoneLabel}. Press Enter or Space to select`,
      zone: zoneLabel,
    });
  };

  // Get heat map color based on intensity (1-10 scale)
  const getHeatMapColor = (intensity: number): string => {
    // Green (low) → Yellow (medium) → Red (high)
    if (intensity <= 3) return "#10b981"; // green-500
    if (intensity <= 6) return "#f59e0b"; // amber-500
    return "#ef4444"; // red-500
  };

  const getZoneColor = (zone: BodyZone): string => {
    // Readonly mode with highlights
    if (mode === "readonly") {
      const highlight = highlightedZones.find((h) => h.zone === zone);
      if (highlight) {
        return getHeatMapColor(highlight.intensity);
      }
      return "#f3f4f6"; // gray-100 - No data
    }

    // Interactive mode
    if (selectedZone === zone) {
      return "#3b82f6"; // blue-500 - Selected
    }
    if (hoveredZone === zone) {
      return "#93c5fd"; // blue-300 - Hovered
    }
    return "#e5e7eb"; // gray-200 - Default
  };

  const getZoneStroke = (zone: BodyZone): string => {
    if (mode === "readonly") {
      const highlight = highlightedZones.find((h) => h.zone === zone);
      return highlight ? "#374151" : "#d1d5db"; // gray-700 : gray-300
    }

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
        role="img"
        aria-label={t("somatic.accessibility.bodyMap", {
          defaultValue: "Body map selector",
        })}
      >
        {zones.map((zoneData) => (
          <g key={zoneData.zone}>
            <path
              d={zoneData.path}
              fill={getZoneColor(zoneData.zone)}
              stroke={getZoneStroke(zoneData.zone)}
              strokeWidth="2"
              className={
                mode === "interactive"
                  ? "cursor-pointer transition-all duration-200"
                  : "transition-all duration-200"
              }
              role={mode === "interactive" ? "button" : "presentation"}
              tabIndex={mode === "interactive" ? 0 : -1}
              aria-label={getZoneAriaLabel(zoneData.zone)}
              aria-pressed={mode === "interactive" ? selectedZone === zoneData.zone : undefined}
              onMouseEnter={
                mode === "interactive"
                  ? () => setHoveredZone(zoneData.zone)
                  : undefined
              }
              onMouseLeave={
                mode === "interactive" ? () => setHoveredZone(null) : undefined
              }
              onClick={
                mode === "interactive" && onZoneSelect
                  ? () => handleZoneActivate(zoneData.zone)
                  : undefined
              }
              onKeyDown={
                mode === "interactive"
                  ? (event) => handleKeyDown(event, zoneData.zone)
                  : undefined
              }
            />
          </g>
        ))}
      </svg>

      <div className="mt-4 text-center">
        {mode === "interactive" ? (
          <p className="text-sm text-muted-foreground">
            {selectedZone ? (
              <span className="font-medium text-foreground">
                Selected: {zones.find((z) => z.zone === selectedZone)?.label}
              </span>
            ) : (
              t("somatic.clickToSelect")
            )}
          </p>
        ) : (
          <div className="flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#10b981" }}></div>
              <span>{t("somatic.intensityLow")}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#f59e0b" }}></div>
              <span>{t("somatic.intensityMedium")}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#ef4444" }}></div>
              <span>{t("somatic.intensityHigh")}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
