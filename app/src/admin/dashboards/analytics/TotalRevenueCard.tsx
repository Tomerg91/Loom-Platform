import { ArrowDown, ArrowUp, ShoppingCart } from "lucide-react";
import { useMemo } from "react";
import { type DailyStatsProps } from "../../../analytics/stats";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { cn } from "../../../lib/utils";
import { formatCurrency, formatPercentage } from "../../../shared/format";

const TotalRevenueCard = ({
  dailyStats,
  weeklyStats,
  isLoading,
}: DailyStatsProps) => {
  const isDeltaPositive = useMemo(() => {
    if (!weeklyStats || weeklyStats.length < 2) return false;
    const current = weeklyStats[0];
    const previous = weeklyStats[1];
    if (!current || !previous) return false;
    return current.totalRevenue - previous.totalRevenue > 0;
  }, [weeklyStats]);

  const deltaPercentage = useMemo(() => {
    if (!weeklyStats || weeklyStats.length < 2 || isLoading) return;
    const current = weeklyStats[0];
    const previous = weeklyStats[1];
    if (!current || !previous) return;
    if (previous.totalRevenue === 0 || current.totalRevenue === 0) return 0;

    weeklyStats.sort((a, b) => b.id - a.id);

    const percentage =
      ((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue) *
      100;
    return Math.floor(percentage);
  }, [weeklyStats]);

  return (
    <Card>
      <CardHeader>
        <div className="h-11.5 w-11.5 bg-muted flex items-center justify-center rounded-full">
          <ShoppingCart className="size-6" />
        </div>
      </CardHeader>

      <CardContent className="flex justify-between">
        <div>
          <h4 className="text-title-md text-foreground font-bold">
            {formatCurrency(dailyStats?.totalRevenue)}
          </h4>
          <span className="text-muted-foreground text-sm font-medium">
            Total Revenue
          </span>
        </div>

        <span
          className={cn("flex items-center gap-1 text-sm font-medium", {
            "text-success":
              isDeltaPositive && !isLoading && deltaPercentage !== 0,
            "text-destructive":
              !isDeltaPositive && !isLoading && deltaPercentage !== 0,
            "text-muted-foreground":
              isLoading || !deltaPercentage || deltaPercentage === 0,
          })}
        >
          {isLoading
            ? "..."
            : deltaPercentage && deltaPercentage !== 0
              ? formatPercentage(deltaPercentage)
              : "-"}
          {!isLoading &&
            deltaPercentage &&
            deltaPercentage !== 0 &&
            (isDeltaPositive ? <ArrowUp /> : <ArrowDown />)}
        </span>
      </CardContent>
    </Card>
  );
};

export default TotalRevenueCard;
