import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Incident } from '@/types/incident';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Clock, AlertCircle, CheckCircle, ArrowUpCircle, Flame, ShieldAlert, Wrench, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IncidentTimelineProps {
  incidents: Incident[];
}

const typeIcons = {
  medical: Heart,
  fire: Flame,
  security: ShieldAlert,
  infrastructure: Wrench,
};

export function IncidentTimeline({ incidents }: IncidentTimelineProps) {
  const recentIncidents = useMemo(() => {
    return [...incidents]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);
  }, [incidents]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle className="h-4 w-4 text-[hsl(var(--severity-low))]" />;
      case 'escalated': return <ArrowUpCircle className="h-4 w-4 text-[hsl(var(--severity-high))]" />;
      default: return <AlertCircle className="h-4 w-4 text-[hsl(var(--severity-critical))]" />;
    }
  };

  const getSeverityClass = (severity: string | null) => {
    switch (severity) {
      case 'critical': return 'border-l-[hsl(var(--severity-critical))]';
      case 'high': return 'border-l-[hsl(var(--severity-high))]';
      case 'medium': return 'border-l-[hsl(var(--severity-medium))]';
      default: return 'border-l-[hsl(var(--severity-low))]';
    }
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {recentIncidents.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No recent activity
            </div>
          ) : (
            <div className="space-y-3">
              {recentIncidents.map((incident) => {
                const TypeIcon = typeIcons[incident.type];
                return (
                  <div 
                    key={incident.id}
                    className={cn(
                      "p-3 rounded-lg bg-muted/30 border-l-4 transition-colors hover:bg-muted/50",
                      getSeverityClass(incident.severity)
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        <TypeIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(incident.status)}
                          <span className="text-sm font-medium capitalize">{incident.type}</span>
                          <span className="text-xs text-muted-foreground capitalize px-1.5 py-0.5 bg-secondary rounded">
                            {incident.severity}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {incident.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(incident.created_at), 'MMM dd, HH:mm')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}