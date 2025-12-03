import { useState } from "react";
import { useQuery, useAction } from "wasp/client/operations";
import {
  getCoachAvailability,
  bookAvailabilitySlot,
  holdAvailabilitySlot,
} from "wasp/client/operations";
import type { User } from "wasp/entities";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@src/components/ui/card";
import { Button } from "@src/components/ui/button";
import { Badge } from "@src/components/ui/badge";
import { Calendar, Clock, MapPin, AlertCircle } from "lucide-react";
import { toZonedTime, format } from "date-fns-tz";
import { formatDistanceToNow } from "date-fns";

interface ClientBookingPageProps {
  user: User;
}

export default function ClientBookingPage({ user }: ClientBookingPageProps) {
  const { t } = useTranslation();
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  // Get client's assigned coach from profile
  const coachId = (user as any)?.clientProfile?.coachId || "";

  // Fetch availability for the client's coach
  const { data: slots = [], isLoading, error } = useQuery(
    getCoachAvailability,
    {
      coachId,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days from now
    },
    {
      enabled: !!coachId, // Only run query when coachId is available
    }
  );

  const bookSlot = useAction(bookAvailabilitySlot);
  const holdSlot = useAction(holdAvailabilitySlot);

  const handleBookSlot = async (slotId: string) => {
    try {
      await bookSlot({ slotId });
      // TODO: Show success message
    } catch (error) {
      console.error("Failed to book slot:", error);
    }
  };

  const handleHoldSlot = async (slotId: string) => {
    try {
      await holdSlot({ slotId });
      setSelectedSlotId(slotId);
      // TODO: Show message about 15-minute hold
    } catch (error) {
      console.error("Failed to hold slot:", error);
    }
  };

  if (!coachId) {
    return (
      <div className="mt-10 px-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("availability.bookSession")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <p className="text-sm text-yellow-700">
                {t("availability.noCoachAssigned")}
              </p>
            </div>
            <p className="text-gray-600">
              {t("availability.contactCoachToBook")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mt-10 px-6">
        <Card>
          <CardContent className="pt-6">
            <p>{t("common.loading")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-10 px-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-600">{t("common.errorLoading")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const openSlots = slots.filter((s: any) => s.status === "OPEN");

  return (
    <div className="mt-10 px-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t("availability.bookSession")}</h1>
        <p className="text-gray-600 mt-2">{t("availability.selectSlot")}</p>
      </div>

      {/* No Slots Message */}
      {openSlots.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">{t("availability.noAvailableSlots")}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Slots Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {openSlots.map((slot: any) => (
            <Card
              key={slot.id}
              className={`cursor-pointer transition-all ${
                selectedSlotId === slot.id
                  ? "ring-2 ring-blue-500"
                  : "hover:shadow-lg"
              }`}
            >
              <CardContent className="pt-6 space-y-4">
                {/* Date and Time */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">
                      {format(new Date(slot.startTime), "EEEE, MMMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock className="w-4 h-4" />
                    <span>
                      {format(
                        toZonedTime(
                          new Date(slot.startTime),
                          slot.timezone
                        ),
                        "HH:mm zzzz"
                      )}{" "}
                      -{" "}
                      {format(
                        toZonedTime(new Date(slot.endTime), slot.timezone),
                        "HH:mm"
                      )}
                    </span>
                  </div>
                </div>

                {/* Timezone */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{slot.timezone}</span>
                </div>

                {/* Notes */}
                {slot.notes && (
                  <div className="text-sm bg-gray-50 p-3 rounded">
                    <p className="font-medium text-gray-700">{t("availability.notes")}</p>
                    <p className="text-gray-600">{slot.notes}</p>
                  </div>
                )}

                {/* Time Until Slot */}
                <div className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(slot.startTime), {
                    addSuffix: true,
                  })}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleHoldSlot(slot.id)}
                  >
                    {t("availability.hold")}
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleBookSlot(slot.id)}
                  >
                    {t("availability.book")}
                  </Button>
                </div>

                {/* Hold Info */}
                {selectedSlotId === slot.id && (
                  <div className="text-xs bg-blue-50 p-2 rounded border border-blue-200">
                    <p className="text-blue-700">
                      {t("availability.holdExpireTime")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
