import { useQuery } from "wasp/client/operations";
import { getCalendarConnection } from "wasp/client/operations";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@src/components/ui/card";
import { AlertCircle, CheckCircle2, Loader } from "lucide-react";
import { ConnectGoogleCalendarButton } from "./ConnectGoogleCalendarButton";
import { DisconnectGoogleCalendarButton } from "./DisconnectGoogleCalendarButton";
import { useTranslation } from "react-i18next";

export function CalendarConnectionStatus() {
  const { t } = useTranslation();
  const { data: connection, isLoading } = useQuery(getCalendarConnection);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!connection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("googleCalendar.integrationTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            {t("googleCalendar.connectPrompt")}
          </p>
          <ConnectGoogleCalendarButton />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          {t("googleCalendar.connectedTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-700">
              {t("googleCalendar.calendarLabel")}
            </p>
            <p className="text-sm text-gray-600">{connection.calendarName}</p>
          </div>

          {connection.lastSyncAt && (
            <div>
              <p className="text-sm font-medium text-gray-700">
                {t("googleCalendar.lastSyncedLabel")}
              </p>
              <p className="text-sm text-gray-600">
                {new Date(connection.lastSyncAt).toLocaleString()}
              </p>
            </div>
          )}

          {connection.syncErrorCount > 0 && (
            <div className="flex gap-2 p-3 bg-yellow-50 rounded-md">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  {t("googleCalendar.syncErrorsLabel")}
                </p>
                <p className="text-xs text-yellow-700">
                  {connection.lastError}
                </p>
              </div>
            </div>
          )}

          <div className="pt-4">
            <DisconnectGoogleCalendarButton />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
