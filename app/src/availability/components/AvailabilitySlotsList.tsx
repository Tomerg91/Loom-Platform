import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@src/components/ui/card";
import { Button } from "@src/components/ui/button";
import { Badge } from "@src/components/ui/badge";
import { Trash2, Calendar, Clock, MapPin } from "lucide-react";
import { format, toZonedTime } from "date-fns-tz";
import { cn } from "@src/lib/utils";

interface AvailabilitySlot {
  id: string;
  startTime: string;
  endTime: string;
  timezone: string;
  status: "OPEN" | "HELD" | "BOOKED";
  notes?: string;
}

interface AvailabilitySlotsListProps {
  slots: AvailabilitySlot[];
  onDeleteSlot: (slotId: string) => void;
}

const STATUS_BADGE_MAP = {
  OPEN: { label: "availability.statusOpen", variant: "default" },
  HELD: { label: "availability.statusHeld", variant: "secondary" },
  BOOKED: { label: "availability.statusBooked", variant: "outline" },
} as const;

export function AvailabilitySlotsList({
  slots,
  onDeleteSlot,
}: AvailabilitySlotsListProps) {
  const { t } = useTranslation();

  if (slots.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-12">
          <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">{t("availability.noSlots")}</p>
        </CardContent>
      </Card>
    );
  }

  // Sort by start time
  const sortedSlots = [...slots].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return (
    <div className="space-y-3">
      {sortedSlots.map((slot) => (
        <Card
          key={slot.id}
          className={cn(
            "transition-all",
            slot.status === "BOOKED" && "bg-green-50 border-green-200",
            slot.status === "HELD" && "bg-yellow-50 border-yellow-200",
            slot.status === "OPEN" && "hover:shadow-md"
          )}
        >
          <CardContent className="pt-6 flex items-center justify-between gap-4">
            {/* Slot Details */}
            <div className="flex-1 space-y-2">
              {/* Date */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="font-medium">
                  {format(new Date(slot.startTime), "EEE, MMM d, yyyy")}
                </span>
              </div>

              {/* Time */}
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  {format(
                    toZonedTime(new Date(slot.startTime), slot.timezone),
                    "HH:mm zzzz"
                  )}{" "}
                  -{" "}
                  {format(
                    toZonedTime(new Date(slot.endTime), slot.timezone),
                    "HH:mm"
                  )}
                </span>
              </div>

              {/* Timezone */}
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">{slot.timezone}</span>
              </div>

              {/* Notes */}
              {slot.notes && (
                <div className="text-sm text-gray-600 bg-white/50 p-2 rounded mt-2">
                  <span className="font-medium">{t("availability.notes")}: </span>
                  {slot.notes}
                </div>
              )}
            </div>

            {/* Status Badge and Actions */}
            <div className="flex flex-col items-end gap-3">
              <Badge variant={STATUS_BADGE_MAP[slot.status].variant as any}>
                {t(STATUS_BADGE_MAP[slot.status].label)}
              </Badge>

              {slot.status === "OPEN" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteSlot(slot.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
