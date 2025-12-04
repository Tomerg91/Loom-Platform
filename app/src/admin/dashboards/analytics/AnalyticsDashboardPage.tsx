import { type AuthUser } from "wasp/auth";
import { getDailyStats, useQuery } from "wasp/client/operations";
import { cn } from "../../../lib/utils";
import DefaultLayout from "../../layout/DefaultLayout";
import RevenueAndProfitChart from "./RevenueAndProfitChart";
import SourcesTable from "./SourcesTable";
import TotalPageViewsCard from "./TotalPageViewsCard";
import TotalPayingUsersCard from "./TotalPayingUsersCard";
import TotalRevenueCard from "./TotalRevenueCard";
import TotalSignupsCard from "./TotalSignupsCard";

const Dashboard = ({ user }: { user: AuthUser }) => {
  const { data: stats, isLoading, error } = useQuery(getDailyStats);

  if (error) {
    return (
      <DefaultLayout user={user}>
        <div className="flex h-full items-center justify-center">
          <div className="bg-card rounded-lg p-8 shadow-lg">
            <p className="text-2xl font-bold text-red-500">Error</p>
            <p className="text-muted-foreground mt-2 text-sm">
              {error.message || "Something went wrong while fetching stats."}
            </p>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout user={user}>
      <div className="relative">
        <div
          className={cn({
            "opacity-25": !stats,
          })}
        >
          <div className="2xl:gap-7.5 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4">
            <TotalPageViewsCard
              totalPageViews={stats?.dailyStats.totalViews}
              prevDayViewsChangePercent={
                stats?.dailyStats.prevDayViewsChangePercent
              }
            />
            <TotalRevenueCard
              {...(stats?.dailyStats && { dailyStats: stats.dailyStats })}
              {...(stats?.weeklyStats && { weeklyStats: stats.weeklyStats })}
              isLoading={isLoading}
            />
            <TotalPayingUsersCard
              {...(stats?.dailyStats && { dailyStats: stats.dailyStats })}
              isLoading={isLoading}
            />
            <TotalSignupsCard
              {...(stats?.dailyStats && { dailyStats: stats.dailyStats })}
              isLoading={isLoading}
            />
          </div>

          <div className="2xl:mt-7.5 2xl:gap-7.5 mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6">
            <RevenueAndProfitChart
              {...(stats?.weeklyStats && { weeklyStats: stats.weeklyStats })}
              isLoading={isLoading}
            />

            <div className="col-span-12 xl:col-span-8">
              <SourcesTable sources={stats?.dailyStats?.sources} />
            </div>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default Dashboard;
