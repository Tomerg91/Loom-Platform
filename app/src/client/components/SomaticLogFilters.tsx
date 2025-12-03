import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

type BodyZone =
  | "HEAD"
  | "THROAT"
  | "CHEST"
  | "SOLAR_PLEXUS"
  | "BELLY"
  | "PELVIS"
  | "ARMS"
  | "LEGS"
  | "FULL_BODY";

export interface SomaticLogFiltersState {
  dateRange: "today" | "thisWeek" | "thisMonth" | "allTime";
  bodyZones: BodyZone[];
  minIntensity: number;
  maxIntensity: number;
}

interface SomaticLogFiltersProps {
  filters: SomaticLogFiltersState;
  onFiltersChange: (filters: SomaticLogFiltersState) => void;
}

const BODY_ZONES: { value: BodyZone; label: string }[] = [
  { value: "HEAD", label: "somatic.bodyZones.HEAD" },
  { value: "THROAT", label: "somatic.bodyZones.THROAT" },
  { value: "CHEST", label: "somatic.bodyZones.CHEST" },
  { value: "SOLAR_PLEXUS", label: "somatic.bodyZones.SOLAR_PLEXUS" },
  { value: "BELLY", label: "somatic.bodyZones.BELLY" },
  { value: "PELVIS", label: "somatic.bodyZones.PELVIS" },
  { value: "ARMS", label: "somatic.bodyZones.ARMS" },
  { value: "LEGS", label: "somatic.bodyZones.LEGS" },
  { value: "FULL_BODY", label: "somatic.bodyZones.FULL_BODY" },
];

export default function SomaticLogFilters({
  filters,
  onFiltersChange,
}: SomaticLogFiltersProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDateRangeChange = (
    range: "today" | "thisWeek" | "thisMonth" | "allTime",
  ) => {
    onFiltersChange({
      ...filters,
      dateRange: range,
    });
  };

  const handleBodyZoneToggle = (zone: BodyZone) => {
    const newZones = filters.bodyZones.includes(zone)
      ? filters.bodyZones.filter((z) => z !== zone)
      : [...filters.bodyZones, zone];

    onFiltersChange({
      ...filters,
      bodyZones: newZones,
    });
  };

  const handleIntensityChange = (min: number, max: number) => {
    onFiltersChange({
      ...filters,
      minIntensity: min,
      maxIntensity: max,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      dateRange: "allTime",
      bodyZones: [],
      minIntensity: 1,
      maxIntensity: 10,
    });
  };

  const activeFilterCount = [
    filters.dateRange !== "allTime" ? 1 : 0,
    filters.bodyZones.length > 0 ? 1 : 0,
    filters.minIntensity > 1 || filters.maxIntensity < 10 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <Card className="mb-6 p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-0"
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{t("filters.dateRange")}</h3>
          {activeFilterCount > 0 && (
            <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded">
              {activeFilterCount}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 transition-transform",
            isExpanded && "rotate-180",
          )}
        />
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Date Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("filters.dateRange")}
            </label>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "today" as const, label: t("filters.today") },
                { value: "thisWeek" as const, label: t("filters.thisWeek") },
                { value: "thisMonth" as const, label: t("filters.thisMonth") },
                { value: "allTime" as const, label: t("filters.allTime") },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={
                    filters.dateRange === option.value ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => handleDateRangeChange(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Body Zones */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("filters.bodyZone")}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BODY_ZONES.map((zone) => (
                <Button
                  key={zone.value}
                  variant={
                    filters.bodyZones.includes(zone.value)
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => handleBodyZoneToggle(zone.value)}
                  className="text-xs"
                >
                  {t(zone.label)}
                </Button>
              ))}
            </div>
          </div>

          {/* Intensity Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("filters.intensity")}
            </label>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">
                  {t("filters.minIntensity")}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={filters.minIntensity}
                  onChange={(e) =>
                    handleIntensityChange(
                      parseInt(e.target.value),
                      filters.maxIntensity,
                    )
                  }
                  className="w-full"
                />
                <div className="text-sm font-medium">
                  {filters.minIntensity}
                </div>
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">
                  {t("filters.maxIntensity")}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={filters.maxIntensity}
                  onChange={(e) =>
                    handleIntensityChange(
                      filters.minIntensity,
                      parseInt(e.target.value),
                    )
                  }
                  className="w-full"
                />
                <div className="text-sm font-medium">
                  {filters.maxIntensity}
                </div>
              </div>
            </div>
          </div>

          {/* Clear Button */}
          {activeFilterCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="w-full"
            >
              {t("filters.clearFilters")}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
