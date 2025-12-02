import { useState } from 'react';
import { useAction } from 'wasp/client/operations';
import { disconnectGoogleCalendar } from 'wasp/client/operations';
import { Button } from '@src/components/ui/button';
import { useToast } from '@src/hooks/use-toast';
import { Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function DisconnectGoogleCalendarButton() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const disconnectFn = useAction(disconnectGoogleCalendar);
  const { toast } = useToast();

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await disconnectFn();
      toast({
        title: t('common.success'),
        description: t('googleCalendar.disconnectedSuccess'),
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description:
          error instanceof Error
            ? error.message
            : t('googleCalendar.disconnectError'),
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
      {t('googleCalendar.disconnectButton')}
    </Button>
  );
}
