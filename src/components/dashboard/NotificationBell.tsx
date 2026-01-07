import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Incident } from '@/types/incident';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  incident: Incident;
  read: boolean;
  timestamp: Date;
}

interface NotificationBellProps {
  incidents: Incident[];
}

export function NotificationBell({ incidents }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const prevIncidentsRef = useRef<string[]>([]);

  // Track new incidents
  useEffect(() => {
    const currentIds = incidents.map(i => i.id);
    const prevIds = prevIncidentsRef.current;

    // Find new incidents (not in previous list)
    const newIncidents = incidents.filter(
      i => !prevIds.includes(i.id) && 
           (i.severity === 'critical' || i.severity === 'high') &&
           i.status === 'active'
    );

    if (newIncidents.length > 0 && prevIds.length > 0) {
      const newNotifications: Notification[] = newIncidents.map(incident => ({
        id: `${incident.id}-${Date.now()}`,
        incident,
        read: false,
        timestamp: new Date(),
      }));

      setNotifications(prev => [...newNotifications, ...prev].slice(0, 20));
    }

    prevIncidentsRef.current = currentIds;
  }, [incidents]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getSeverityClass = (severity: string | null) => {
    switch (severity) {
      case 'critical': return 'text-[hsl(var(--severity-critical))]';
      case 'high': return 'text-[hsl(var(--severity-high))]';
      case 'medium': return 'text-[hsl(var(--severity-medium))]';
      default: return 'text-[hsl(var(--severity-low))]';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-[hsl(var(--severity-critical))] text-white text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={cn(
                    "p-3 hover:bg-muted/50 transition-colors",
                    !notification.read && "bg-primary/5"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                      notification.incident.severity === 'critical' && "bg-[hsl(var(--severity-critical))] animate-pulse",
                      notification.incident.severity === 'high' && "bg-[hsl(var(--severity-high))]"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        New{' '}
                        <span className={getSeverityClass(notification.incident.severity)}>
                          {notification.incident.severity}
                        </span>
                        {' '}incident
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {notification.incident.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}