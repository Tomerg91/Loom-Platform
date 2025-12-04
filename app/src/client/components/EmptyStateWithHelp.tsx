import { useState } from "react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "../../components/ui/dialog";
import { ArrowRight, Sparkles } from "lucide-react";

interface EmptyStateWithHelpProps {
  title: string;
  description: string;
  buttonText: string;
  helpTitle: string;
  helpContent: React.ReactNode;
  icon?: React.ReactNode;
}

export default function EmptyStateWithHelp({
  title,
  description,
  buttonText,
  helpTitle,
  helpContent,
  icon = <Sparkles className="h-8 w-8" />,
}: EmptyStateWithHelpProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <div className="relative overflow-hidden flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-gradient-to-b from-white to-gray-50 dark:from-slate-900 dark:to-slate-900/50 py-16 px-6 text-center shadow-sm">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-border/50 text-primary">
            {icon}
          </div>

          <h3 className="mb-3 text-xl font-serif font-bold text-foreground">
            {title}
          </h3>

          <p className="mb-8 max-w-md text-muted-foreground leading-relaxed">
            {description}
          </p>

          <div className="flex gap-3">
            <Button
              onClick={() => setIsDialogOpen(true)}
              variant="default"
              className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
            >
              {buttonText}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              {helpTitle}
            </DialogTitle>
            <DialogClose />
          </DialogHeader>

          <div className="prose prose-sm dark:prose-invert max-w-none mt-4">
            {helpContent}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
