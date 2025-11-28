import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";

interface IntensityTrendPoint {
  weekStart: string; // ISO date string
  avgIntensity: number;
}

interface IntensityTrendChartProps {
  data: IntensityTrendPoint[];
}

export function IntensityTrendChart({ data }: IntensityTrendChartProps) {
  // Format data for display
  const formattedData = data.map((point) => ({
    ...point,
    weekStartFormatted: format(parseISO(point.weekStart), "MMM d"),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={formattedData}
        margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="weekStartFormatted"
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis domain={[0, 10]} label={{ value: "Intensity (1-10)", angle: -90, position: "insideLeft" }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "0.375rem",
          }}
          formatter={(value: any) => {
            if (typeof value === "number") {
              return [value.toFixed(1), "Average Intensity"];
            }
            return value;
          }}
          labelFormatter={(label) => {
            return `Week of: ${label}`;
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="avgIntensity"
          stroke="#3b82f6"
          dot={{ fill: "#3b82f6", r: 5 }}
          activeDot={{ r: 7 }}
          strokeWidth={2}
          name="Average Intensity"
          isAnimationActive={true}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
