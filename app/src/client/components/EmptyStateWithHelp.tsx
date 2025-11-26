import { useState } from "react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "../../components/ui/dialog";
import { HelpCircle, ArrowRight } from "lucide-react";

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
  icon = <HelpCircle className="h-8 w-8" />,
}: EmptyStateWithHelpProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 py-12 px-4 text-center">
        <div className="mb-4 inline-flex rounded-full bg-primary/10 p-3 text-primary">
          {icon}
        </div>

        <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>

        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>

        <Button
          onClick={() => setIsDialogOpen(true)}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          {buttonText}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{helpTitle}</DialogTitle>
            <DialogClose />
          </DialogHeader>

          <div className="prose prose-sm dark:prose-invert max-w-none">
            {helpContent}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
