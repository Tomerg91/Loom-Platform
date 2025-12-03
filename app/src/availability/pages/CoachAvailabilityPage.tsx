import { useState } from "react";
import { useQuery, useAction } from "wasp/client/operations";
import {
  getCoachAvailability,
  createAvailabilitySlot,
  deleteAvailabilitySlot,
} from "wasp/client/operations";
import type { User } from "wasp/entities";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@src/components/ui/card";
import { Button } from "@src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@src/components/ui/dialog";
import { Badge } from "@src/components/ui/badge";
import { AlertCircle, Trash2, Plus } from "lucide-react";
import { CreateAvailabilitySlotForm } from "../components/CreateAvailabilitySlotForm";
import { AvailabilityCalendar } from "../components/AvailabilityCalendar";
import { AvailabilitySlotsList } from "../components/AvailabilitySlotsList";
import { cn } from "@src/lib/utils";

interface CoachAvailabilityPageProps {
  user: User;
}

export default function CoachAvailabilityPage({
  user,
}: CoachAvailabilityPageProps) {
  const { t } = useTranslation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  // Get coach's availability slots using the user's coachProfile ID
  // The coachProfile should be populated in the user object
  const coachId = (user as any)?.coachProfile?.id || "";

  const { data: slots = [], isLoading, refetch } = useQuery(
    getCoachAvailability,
    {
      coachId,
    },
    {
      enabled: !!coachId, // Only run query when coachId is available
    }
  );

  const deleteSlot = useAction(deleteAvailabilitySlot);
  const createSlot = useAction(createAvailabilitySlot);

  const handleDeleteSlot = async (slotId: string) => {
    if (confirm(t("availability.confirmDelete"))) {
      try {
        await deleteSlot({ id: slotId });
        refetch();
      } catch (error) {
        console.error("Failed to delete slot:", error);
      }
    }
  };

  const handleCreateSlot = async (data: any) => {
    try {
      await createSlot(data);
      setIsCreateDialogOpen(false);
      refetch();
    } catch (error) {
      console.error("Failed to create slot:", error);
    }
  };

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

  return (
    <div className="mt-10 px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("availability.title")}</h1>
          <p className="text-gray-600 mt-2">{t("availability.description")}</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              {t("availability.createSlot")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("availability.createSlot")}</DialogTitle>
              <DialogDescription>
                {t("availability.createSlotDescription")}
              </DialogDescription>
            </DialogHeader>
            <CreateAvailabilitySlotForm onSubmit={handleCreateSlot} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="flex gap-3 pt-6">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p>{t("availability.infoBanner")}</p>
          </div>
        </CardContent>
      </Card>

      {/* View Toggle */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === "calendar" ? "default" : "outline"}
          onClick={() => setViewMode("calendar")}
        >
          {t("availability.calendarView")}
        </Button>
        <Button
          variant={viewMode === "list" ? "default" : "outline"}
          onClick={() => setViewMode("list")}
        >
          {t("availability.listView")}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">{t("availability.openSlots")}</p>
            <p className="text-2xl font-bold mt-2">
              {slots.filter((s: any) => s.status === "OPEN").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">{t("availability.bookedSlots")}</p>
            <p className="text-2xl font-bold mt-2">
              {slots.filter((s: any) => s.status === "BOOKED").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">{t("availability.heldSlots")}</p>
            <p className="text-2xl font-bold mt-2">
              {slots.filter((s: any) => s.status === "HELD").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      {viewMode === "calendar" ? (
        <AvailabilityCalendar slots={slots} onDeleteSlot={handleDeleteSlot} />
      ) : (
        <AvailabilitySlotsList
          slots={slots}
          onDeleteSlot={handleDeleteSlot}
        />
      )}
    </div>
  );
}
