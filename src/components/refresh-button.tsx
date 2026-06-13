'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface RefreshButtonProps {
  onRefresh?: () => Promise<void>;
  className?: string;
}

export function RefreshButton({ onRefresh, className }: RefreshButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isRouterRefreshing, startRouterRefresh] = React.useTransition();
  const [isCustomRefreshing, setCustomRefreshing] = React.useState(false);
  const routerRefreshRequested = React.useRef(false);
  const isRefreshing = isRouterRefreshing || isCustomRefreshing;

  React.useEffect(() => {
    if (!isRouterRefreshing && routerRefreshRequested.current) {
      routerRefreshRequested.current = false;
      toast({
        title: 'Data refreshed',
        description: 'The latest Firebase records are now displayed.',
      });
    }
  }, [isRouterRefreshing, toast]);

  const handleRefresh = () => {
    if (onRefresh) {
      setCustomRefreshing(true);
      onRefresh()
        .then(() => {
          toast({
            title: 'Data refreshed',
            description: 'The latest Firebase records are now displayed.',
          });
        })
        .catch(() => {
          toast({
            title: 'Refresh failed',
            description: 'The latest records could not be loaded. Please try again.',
            variant: 'destructive',
          });
        })
        .finally(() => setCustomRefreshing(false));
      return;
    }

    routerRefreshRequested.current = true;
    startRouterRefresh(() => {
      try {
        router.refresh();
      } catch {
        routerRefreshRequested.current = false;
        toast({
          title: 'Refresh failed',
          description: 'The latest records could not be loaded. Please try again.',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={cn('shrink-0', className)}
    >
      <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
      {isRefreshing ? 'Refreshing...' : 'Refresh'}
    </Button>
  );
}
