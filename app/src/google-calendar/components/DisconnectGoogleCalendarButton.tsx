import { useState } from 'react';
import { useAction } from 'wasp/client/operations';
import { disconnectGoogleCalendar } from 'wasp/client/operations';
import { Button } from '@src/components/ui/button';
import { useToast } from '@src/hooks/use-toast';
import { Loader } from 'lucide-react';

export function DisconnectGoogleCalendarButton() {
  const [isLoading, setIsLoading] = useState(false);
  const disconnectFn = useAction(disconnectGoogleCalendar);
  const { toast } = useToast();

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await disconnectFn();
      toast({
        title: 'Success',
        description: 'Disconnected from Google Calendar',
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to disconnect Google Calendar',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleDisconnect}
      disabled={isLoading}
      variant="destructive"
    >
      {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
      Disconnect Google Calendar
    </Button>
  );
}
