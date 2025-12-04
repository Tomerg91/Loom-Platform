import { BetaAnalyticsDataClient } from "@google-analytics/data";

const CLIENT_EMAIL = process.env['GOOGLE_ANALYTICS_CLIENT_EMAIL'];
const PRIVATE_KEY = Buffer.from(
  process.env['GOOGLE_ANALYTICS_PRIVATE_KEY']!,
  "base64",
).toString("utf-8");
const PROPERTY_ID = process.env['GOOGLE_ANALYTICS_PROPERTY_ID'];

const analyticsDataClient = new BetaAnalyticsDataClient({
  credentials: {
    client_email: CLIENT_EMAIL!,
    private_key: PRIVATE_KEY,
  },
});

export async function getSources() {
  const [response] = await analyticsDataClient.runReport({
    property: `properties/${PROPERTY_ID}`,
    dateRanges: [
      {
        startDate: "2020-01-01",
        endDate: "today",
      },
    ],
    // for a list of dimensions and metrics see https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema
    dimensions: [
      {
        name: "source",
      },
    ],
    metrics: [
      {
        name: "activeUsers",
      },
    ],
  });

  let activeUsersPerReferrer: any[] = [];
  if (response?.rows) {
    activeUsersPerReferrer = response.rows.map((row) => {
      if (row.dimensionValues?.[0] && row.metricValues?.[0]) {
        return {
          source: row.dimensionValues[0].value,
          visitors: row.metricValues[0].value,
        };
      }
      return undefined;
    }).filter((item): item is NonNullable<typeof item> => item !== undefined);
  } else {
    throw new Error("No response from Google Analytics");
  }

  return activeUsersPerReferrer;
}

export async function getDailyPageViews() {
  const totalViews = await getTotalPageViews();
  const prevDayViewsChangePercent = await getPrevDayViewsChangePercent();

  return {
    totalViews,
    prevDayViewsChangePercent,
  };
}

async function getTotalPageViews() {
  const [response] = await analyticsDataClient.runReport({
    property: `properties/${PROPERTY_ID}`,
    dateRanges: [
      {
        startDate: "2020-01-01", // go back to earliest date of your app
        endDate: "today",
      },
    ],
    metrics: [
      {
        name: "screenPageViews",
      },
    ],
  });
  let totalViews = 0;
  if (response?.rows && response.rows[0]?.metricValues?.[0]) {
    // GA SDK returns metricValues as strings
    totalViews = parseInt(response.rows[0].metricValues[0].value as string);
  } else {
    throw new Error("No response from Google Analytics");
  }
  return totalViews;
}

async function getPrevDayViewsChangePercent(): Promise<string> {
  const [response] = await analyticsDataClient.runReport({
    property: `properties/${PROPERTY_ID}`,

    dateRanges: [
      {
        startDate: "2daysAgo",
        endDate: "yesterday",
      },
    ],
    orderBys: [
      {
        dimension: {
          dimensionName: "date",
        },
        desc: true,
      },
    ],
    dimensions: [
      {
        name: "date",
      },
    ],
    metrics: [
      {
        name: "screenPageViews",
      },
    ],
  });

  let viewsFromYesterday;
  let viewsFromDayBeforeYesterday;

  if (response?.rows && response.rows.length === 2) {
    // GA SDK returns metricValues as strings
    viewsFromYesterday = response.rows[0]?.metricValues?.[0]?.value as string | undefined;
    viewsFromDayBeforeYesterday = response.rows[1]?.metricValues?.[0]?.value as string | undefined;

    if (viewsFromYesterday && viewsFromDayBeforeYesterday) {
      const viewsYesterday = parseInt(viewsFromYesterday);
      const viewsDayBefore = parseInt(viewsFromDayBeforeYesterday);
      if (viewsYesterday === 0 || viewsDayBefore === 0) {
        return "0";
      }
      console.table({ viewsFromYesterday: viewsYesterday, viewsFromDayBeforeYesterday: viewsDayBefore });

      const change =
        ((viewsYesterday - viewsDayBefore) /
          viewsDayBefore) *
        100;
      return change.toFixed(0);
    }
  }
  
  return "0";
}
