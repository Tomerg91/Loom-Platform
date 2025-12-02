import { useState } from 'react';
import { useAction } from 'wasp/client/operations';
import { connectGoogleCalendar } from 'wasp/client/operations';
import { Button } from '@src/components/ui/button';
import { useToast } from '@src/hooks/use-toast';
import { Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function ConnectGoogleCalendarButton() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const connectFn = useAction(connectGoogleCalendar);
  const { toast } = useToast();

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const result = await connectFn();
      toast({
        title: t('common.success'),
        description: t('googleCalendar.connectedTo', { calendarName: result.calendarName }),
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description:
          error instanceof Error
            ? error.message
            : t('googleCalendar.connectError'),
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
      {t('googleCalendar.connectButton')}
    </Button>
  );
}
