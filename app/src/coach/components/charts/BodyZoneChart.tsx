import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface BodyZoneStats {
  zone: string;
  count: number;
  avgIntensity: number;
}

interface BodyZoneChartProps {
  data: BodyZoneStats[];
}

export function BodyZoneChart({ data }: BodyZoneChartProps) {
  const getColor = (intensity: number): string => {
    // Color based on average intensity (1-10 scale)
    // Blue (low) to Red (high)
    if (intensity <= 2) return "#3b82f6"; // blue
    if (intensity <= 4) return "#06b6d4"; // cyan
    if (intensity <= 6) return "#eab308"; // yellow
    if (intensity <= 8) return "#f97316"; // orange
    return "#ef4444"; // red
  };

  // Sort by count descending
  const sortedData = [...data].sort((a, b) => b.count - a.count);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        layout="vertical"
        data={sortedData}
        margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis type="number" />
        <YAxis dataKey="zone" type="category" width={140} tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "0.375rem",
          }}
          formatter={(value: any, name: string) => {
            if (name === "count") {
              return [value, "Frequency"];
            }
            if (name === "avgIntensity") {
              return [Number(value).toFixed(1), "Avg Intensity"];
            }
            return value;
          }}
        />
        <Bar dataKey="count" fill="#3b82f6" radius={[0, 8, 8, 0]}>
          {sortedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getColor(entry.avgIntensity)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
