import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import { MailCheck, MailQuestion, Reply } from "lucide-react";
import { type AuthUser } from "wasp/auth";
import {
  getContactMessageById,
  getContactMessages,
  updateContactFormMessageStatus,
  useAction,
  useQuery,
} from "wasp/client/operations";
import type { ContactMessageWithUser } from "../../../messages/operations";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Separator } from "../../../components/ui/separator";
import { cn } from "../../../lib/utils";
import DefaultLayout from "../../layout/DefaultLayout";
import Breadcrumb from "../../layout/Breadcrumb";
import LoadingSpinner from "../../layout/LoadingSpinner";
import { useToast } from "../../../hooks/use-toast";

const statusFilters = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "replied", label: "Replied" },
] as const;

type StatusFilter = (typeof statusFilters)[number]["id"];

type ContactMessageListItem = ContactMessageWithUser;

type ContactMessageDetail = ContactMessageWithUser;

function MessageStatusBadge({ message }: { message: ContactMessageListItem }) {
  if (message.repliedAt) {
    return <Badge variant="secondary">Replied</Badge>;
  }

  if (!message.isRead) {
    return <Badge variant="destructive">Unread</Badge>;
  }

  return <Badge variant="outline">Open</Badge>;
}

function MessageListItem({
  message,
  isActive,
  onClick,
}: {
  message: ContactMessageListItem;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "hover:bg-muted flex w-full flex-col gap-2 rounded-lg border p-4 text-left transition",
        {
          "border-primary bg-primary/5": isActive,
          "border-border": !isActive,
        },
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <p className="text-foreground font-semibold">
            {message.user.username || message.user.email || "Unknown user"}
          </p>
          <p className="text-muted-foreground text-sm">
            {message.user.email ?? "No email available"}
          </p>
        </div>
        <MessageStatusBadge message={message} />
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2">
        {message.content}
      </p>
      <p className="text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
      </p>
    </button>
  );
}

function MessageDetail({
  message,
  onMarkRead,
  onMarkUnread,
  onToggleReplied,
}: {
  message: ContactMessageDetail;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onToggleReplied: (nextValue: boolean) => void;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-xl">Message Detail</CardTitle>
          <p className="text-muted-foreground text-sm">
            Received{" "}
            {formatDistanceToNow(new Date(message.createdAt), {
              addSuffix: true,
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MessageStatusBadge message={message} />
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="flex h-full flex-col gap-6 p-6">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">From</h3>
          <p className="text-foreground font-semibold">
            {message.user.username || message.user.email || "Unknown user"}
          </p>
          {message.user.email && (
            <p className="text-muted-foreground text-sm">
              {message.user.email}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">Message</h3>
          <div className="bg-muted/40 text-foreground rounded-lg border p-4 text-sm leading-relaxed">
            {message.content}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant={message.isRead ? "secondary" : "default"}
            onClick={message.isRead ? onMarkUnread : onMarkRead}
            className="gap-2"
          >
            {message.isRead ? (
              <MailQuestion className="size-4" />
            ) : (
              <MailCheck className="size-4" />
            )}
            {message.isRead ? "Mark as unread" : "Mark as read"}
          </Button>

          <Button
            variant={message.repliedAt ? "outline" : "default"}
            onClick={() => onToggleReplied(!message.repliedAt)}
            className="gap-2"
          >
            <Reply className="size-4" />
            {message.repliedAt ? "Clear replied" : "Mark as replied"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
      <MailQuestion className="text-muted-foreground size-10" />
      <CardTitle className="text-lg">No messages found</CardTitle>
      <p className="text-muted-foreground text-sm">
        When users submit contact forms, they will show up here for follow-up.
      </p>
    </Card>
  );
}

function MessagesList({
  messages,
  selectedId,
  setSelectedId,
  filter,
  setFilter,
}: {
  messages: ContactMessageListItem[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  filter: StatusFilter;
  setFilter: (next: StatusFilter) => void;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="flex items-center justify-between gap-3 sm:flex-row">
        <CardTitle>Messages</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          {statusFilters.map(({ id, label }) => (
            <Button
              key={id}
              variant={filter === id ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(id)}
            >
              {label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="space-y-3 p-4">
        {messages.length === 0 && (
          <p className="text-muted-foreground text-sm">No messages</p>
        )}
        <div className="flex flex-col gap-3">
          {messages.map((message) => (
            <MessageListItem
              key={message.id}
              message={message}
              isActive={selectedId === message.id}
              onClick={() => setSelectedId(message.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AdminMessages({ user }: { user: AuthUser }) {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {
    data: messages,
    isLoading,
    refetch,
  } = useQuery(getContactMessages, {
    status: statusFilter,
  });

  const { data: selectedMessage, refetch: refetchMessage } = useQuery(
    getContactMessageById,
    selectedId ? { id: selectedId } : { id: "" },
    {
      enabled: Boolean(selectedId),
    },
  );

  const updateStatus = useAction(updateContactFormMessageStatus);

  useEffect(() => {
    if (messages?.length && !selectedId) {
      setSelectedId(messages[0].id);
    }
    if (
      selectedId &&
      messages &&
      !messages.some((msg) => msg.id === selectedId)
    ) {
      setSelectedId(messages[0]?.id ?? null);
    }
  }, [messages, selectedId]);

  const handleStatusUpdate = async (
    messageId: string,
    data: { isRead?: boolean; markReplied?: boolean },
  ) => {
    try {
      await updateStatus({ id: messageId, ...data });
      await Promise.all([refetchMessage(), refetch()]);
      toast({
        title: "Message updated",
        description: "The message status was saved.",
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong";
      toast({
        title: "Unable to update message",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  let renderedContent = <EmptyState />;

  if (isLoading) {
    renderedContent = <LoadingSpinner />;
  } else if (messages && messages.length > 0) {
    renderedContent = (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <MessagesList
            messages={messages}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            filter={statusFilter}
            setFilter={setStatusFilter}
          />
        </div>
        <div className="lg:col-span-2">
          {selectedMessage ? (
            <MessageDetail
              message={selectedMessage}
              onMarkRead={() =>
                handleStatusUpdate(selectedMessage.id, { isRead: true })
              }
              onMarkUnread={() =>
                handleStatusUpdate(selectedMessage.id, { isRead: false })
              }
              onToggleReplied={(markReplied) =>
                handleStatusUpdate(selectedMessage.id, { markReplied })
              }
            />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    );
  }

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName="Messages" />
      {renderedContent}
    </DefaultLayout>
  );
}

export default AdminMessages;
