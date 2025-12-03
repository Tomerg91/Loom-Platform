import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAction, useQuery } from "wasp/client/operations";
import {
  getActionItems,
  createActionItem,
  completeActionItem,
  deleteActionItem,
} from "wasp/client/operations";
import { Button } from "@src/components/ui/button";
import { Card, CardContent } from "@src/components/ui/card";
import { Input } from "@src/components/ui/input";
import { Checkbox } from "@src/components/ui/checkbox";
import { Alert, AlertDescription } from "@src/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@src/components/ui/dialog";
import { Trash2, Plus, Loader2, AlertCircle } from "lucide-react";
import { formatDate } from "@src/shared/date";

interface ActionItemListProps {
  coachId: string;
  clientId: string;
  sessionId?: string;
  isCoachView?: boolean;
}

export default function ActionItemList({
  coachId,
  clientId,
  sessionId,
  isCoachView = false,
}: ActionItemListProps) {
  const { t } = useTranslation();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemDueDate, setNewItemDueDate] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const {
    data: actionItems = [],
    isLoading,
    error,
    refetch,
  } = useQuery(getActionItems, {
    coachId,
    clientId,
    ...(sessionId && { sessionId }),
  });

  const createFn = useAction(createActionItem);
  const completeFn = useAction(completeActionItem);
  const deleteFn = useAction(deleteActionItem);

  const handleCreate = async () => {
    if (!newItemTitle.trim()) return;

    setIsCreating(true);
    try {
      await createFn({
        coachId,
        clientId,
        title: newItemTitle,
        description: newItemDescription || undefined,
        dueDate: newItemDueDate || undefined,
        sessionId,
      });
      setNewItemTitle("");
      setNewItemDescription("");
      setNewItemDueDate("");
      setShowCreateDialog(false);
      await refetch();
    } catch (err) {
      console.error("Error creating action item:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleComplete = async (
    itemId: string,
    currentCompleted: boolean,
  ) => {
    try {
      await completeFn({
        actionItemId: itemId,
        coachId,
        clientId,
        completed: !currentCompleted,
      });
      await refetch();
    } catch (err) {
      console.error("Error toggling action item completion:", err);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm(t("workspace.confirmDeleteActionItem"))) return;

    try {
      await deleteFn({
        actionItemId: itemId,
        coachId,
        clientId,
      });
      await refetch();
    } catch (err) {
      console.error("Error deleting action item:", err);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-muted-foreground text-center">
            {t("common.loading")}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert className="bg-red-50 border-red-200">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          {t("workspace.failedLoadActionItems")}
        </AlertDescription>
      </Alert>
    );
  }

  const pendingItems = actionItems.filter((item: any) => !item.completed);
  const completedItems = actionItems.filter((item: any) => item.completed);

  return (
    <div className="space-y-4">
      {isCoachView && (
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("workspace.addActionItem")}
        </Button>
      )}

      {actionItems.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center">
              {t("workspace.noActionItems")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {pendingItems.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">
                {t("workspace.pendingActionItems")}
              </h3>
              {pendingItems.map((item: any) => (
                <ActionItemCard
                  key={item.id}
                  item={item}
                  onToggleComplete={handleToggleComplete}
                  onDelete={handleDelete}
                  isCoachView={isCoachView}
                />
              ))}
            </div>
          )}

          {completedItems.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">
                {t("workspace.completedActionItems")}
              </h3>
              {completedItems.map((item: any) => (
                <ActionItemCard
                  key={item.id}
                  item={item}
                  onToggleComplete={handleToggleComplete}
                  onDelete={handleDelete}
                  isCoachView={isCoachView}
                  isCompleted={true}
                />
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("workspace.createActionItem")}</DialogTitle>
            <DialogDescription>
              {t("workspace.createActionItemDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                {t("workspace.title")}
              </label>
              <Input
                placeholder={t("workspace.titlePlaceholder")}
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                disabled={isCreating}
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                {t("workspace.description")}
              </label>
              <textarea
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
                placeholder={t("workspace.descriptionPlaceholder")}
                value={newItemDescription}
                onChange={(e) => setNewItemDescription(e.target.value)}
                disabled={isCreating}
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                {t("workspace.dueDate")}
              </label>
              <Input
                type="datetime-local"
                value={newItemDueDate}
                onChange={(e) => setNewItemDueDate(e.target.value)}
                disabled={isCreating}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isCreating}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !newItemTitle.trim()}
            >
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ActionItemCardProps {
  item: any;
  onToggleComplete: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  isCoachView: boolean;
  isCompleted?: boolean;
}

function ActionItemCard({
  item,
  onToggleComplete,
  onDelete,
  isCoachView,
  isCompleted = false,
}: ActionItemCardProps) {
  const { t } = useTranslation();

  return (
    <Card className={isCompleted ? "opacity-60" : ""}>
      <CardContent className="py-3 px-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={item.completed}
            onCheckedChange={() => onToggleComplete(item.id, item.completed)}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <p
              className={`font-medium text-sm ${
                isCompleted ? "line-through text-muted-foreground" : ""
              }`}
            >
              {item.title}
            </p>
            {item.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {item.description}
              </p>
            )}
            {item.dueDate && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("workspace.dueDate")}: {formatDate(new Date(item.dueDate))}
              </p>
            )}
          </div>
          {isCoachView && (
            <button
              onClick={() => onDelete(item.id)}
              className="p-1 hover:bg-red-50 rounded text-red-600"
              title={t("common.delete")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
