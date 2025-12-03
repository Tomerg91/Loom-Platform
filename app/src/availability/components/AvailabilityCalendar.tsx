import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
} from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";

interface AvailabilitySlot {
  id: string;
  startTime: string;
  endTime: string;
  timezone: string;
  status: "OPEN" | "HELD" | "BOOKED";
  notes?: string;
}

interface AvailabilityCalendarProps {
  slots: AvailabilitySlot[];
  onDeleteSlot: (slotId: string) => void;
}

export function AvailabilityCalendar({
  slots,
  onDeleteSlot,
}: AvailabilityCalendarProps) {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // Get slots for a specific date
  const getSlotsByDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return slots.filter(
      (slot) => format(new Date(slot.startTime), "yyyy-MM-dd") === dateStr,
    );
  };

  // Build calendar grid
  const calendarDays = [];
  let day = new Date(startDate);

  while (day <= endDate) {
    calendarDays.push(new Date(day));
    day = addDays(day, 1);
  }

  // Group by weeks
  const weeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const selectedDateSlots = selectedDate
    ? slots.filter(
        (slot) =>
          format(new Date(slot.startTime), "yyyy-MM-dd") === selectedDate,
      )
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>{format(currentDate, "MMMM yyyy")}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={previousMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-semibold text-gray-600 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="space-y-2">
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="grid grid-cols-7 gap-2">
                  {week.map((day) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const daySlots = getSlotsByDate(day);
                    const isCurrentMonth =
                      format(day, "yyyy-MM") === format(currentDate, "yyyy-MM");
                    const isSelected = selectedDate === dateStr;

                    return (
                      <button
                        key={dateStr}
                        onClick={() => setSelectedDate(dateStr)}
                        className={cn(
                          "aspect-square p-2 rounded-lg border-2 transition-all text-sm",
                          !isCurrentMonth && "opacity-40 bg-gray-50",
                          isCurrentMonth && "hover:border-blue-300",
                          isSelected && "border-blue-500 bg-blue-50",
                          !isSelected && "border-gray-200",
                          daySlots.length > 0 && "font-medium",
                        )}
                      >
                        <div className="text-center">
                          <div className="font-semibold">
                            {format(day, "d")}
                          </div>
                          {daySlots.length > 0 && (
                            <div className="text-xs mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {daySlots.length}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Date Details */}
      <div>
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDate
                ? format(new Date(selectedDate), "EEEE, MMM d")
                : t("availability.selectDate")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedDate && selectedDateSlots.length === 0 ? (
              <p className="text-sm text-gray-600">
                {t("availability.noSlots")}
              </p>
            ) : (
              selectedDateSlots.map((slot) => (
                <div
                  key={slot.id}
                  className={cn(
                    "p-3 rounded-lg border-2 space-y-2",
                    slot.status === "OPEN" && "border-green-200 bg-green-50",
                    slot.status === "HELD" && "border-yellow-200 bg-yellow-50",
                    slot.status === "BOOKED" && "border-blue-200 bg-blue-50",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {format(new Date(slot.startTime), "HH:mm")} -{" "}
                      {format(new Date(slot.endTime), "HH:mm")}
                    </span>
                    {slot.status === "OPEN" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteSlot(slot.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>

                  <Badge
                    variant={
                      slot.status === "OPEN"
                        ? "default"
                        : slot.status === "HELD"
                          ? "secondary"
                          : "outline"
                    }
                    className="text-xs"
                  >
                    {slot.status}
                  </Badge>

                  {slot.notes && (
                    <p className="text-xs text-gray-600 bg-white/50 p-2 rounded">
                      {slot.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
