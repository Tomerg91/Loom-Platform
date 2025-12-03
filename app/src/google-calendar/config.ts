import { google } from "googleapis";
import { JWT } from "google-auth-library";
import { requireNodeEnvVar } from "@src/server/utils";

let serviceAccountAuth: JWT | null = null;

export function getServiceAccountAuth(): JWT {
  if (serviceAccountAuth) {
    return serviceAccountAuth;
  }

  const serviceAccountKeyJson = requireNodeEnvVar("GOOGLE_SERVICE_ACCOUNT_KEY");
  const serviceAccountKey = JSON.parse(serviceAccountKeyJson);

  serviceAccountAuth = new JWT({
    email: serviceAccountKey.client_email,
    key: serviceAccountKey.private_key,
    scopes: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ],
  });

  return serviceAccountAuth;
}

export function getGoogleCalendarClient() {
  const auth = getServiceAccountAuth();
  return google.calendar({ version: "v3", auth: auth as any });
}
