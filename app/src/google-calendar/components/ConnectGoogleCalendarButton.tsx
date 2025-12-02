import { useState } from 'react';
import { useAction } from 'wasp/client/operations';
import { connectGoogleCalendar } from 'wasp/client/operations';
import { Button } from '@src/components/ui/button';
import { useToast } from '@src/hooks/use-toast';
import { Loader } from 'lucide-react';

export function ConnectGoogleCalendarButton() {
  const [isLoading, setIsLoading] = useState(false);
  const connectFn = useAction(connectGoogleCalendar);
  const { toast } = useToast();

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const result = await connectFn();
      toast({
        title: 'Success',
        description: `Connected to ${result.calendarName}`,
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to connect Google Calendar',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleConnect}
      disabled={isLoading}
      variant="outline"
    >
      {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
      Connect Google Calendar
    </Button>
  );
}
