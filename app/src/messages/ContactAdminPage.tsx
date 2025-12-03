import { useState } from "react";
import { useAction, submitContactFormMessage } from "wasp/client/operations";
import type { User } from "wasp/entities";
import { AlertTriangle, Mail } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@src/components/ui/card";
import { Textarea } from "@src/components/ui/textarea";
import { Label } from "@src/components/ui/label";
import { Button } from "@src/components/ui/button";
import { useToast } from "@src/hooks/use-toast";

export default function ContactAdminPage({ user }: { user: User }) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sendMessage = useAction(submitContactFormMessage);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const trimmedMessage = message.trim();

    if (trimmedMessage.length < 5) {
      toast({
        title: "Message is too short",
        description: "Please provide at least a few words so we can help.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      await sendMessage({ content: trimmedMessage });
      setMessage("");
      toast({
        title: "Message sent",
        description: "Thanks for reaching out. Our admins will follow up soon.",
      });
    } catch (error: unknown) {
      const messageFromError =
        error instanceof Error
          ? error.message
          : "Please try again in a moment.";
      toast({
        title: "Unable to send message",
        description: messageFromError,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-10 px-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl">Contact Loom Admin</CardTitle>
            <p className="text-muted-foreground text-sm">
              Let us know how we can help. Your account details will be attached
              to the request so we can respond quickly.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  minLength={5}
                  maxLength={2000}
                  rows={6}
                  placeholder="Share your question, feedback, or issue..."
                  required
                  className="mt-2"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-muted-foreground text-xs">
                  We typically reply within one business day.
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting || message.trim().length < 5}
                >
                  {isSubmitting ? "Sending..." : "Send message"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <Mail className="text-primary size-5" />
              <div>
                <CardTitle className="text-base">
                  Your contact details
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  We use your account email for replies.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm font-semibold">
                {user.username || "Account"}
              </p>
              <p className="text-muted-foreground text-sm">
                {user.email || "No email on file"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <AlertTriangle className="text-amber-500 size-5" />
              <div>
                <CardTitle className="text-base">Urgent issues</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Include steps to reproduce and any error messages so we can
                  investigate faster.
                </p>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
