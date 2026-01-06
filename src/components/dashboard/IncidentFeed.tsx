import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Incident, IncidentSeverity, IncidentType } from '@/types/incident';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, Flame, Shield, Wrench, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IncidentFeedProps {
  incidents: Incident[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const typeIcons: Record<IncidentType, React.ElementType> = {
  medical: AlertTriangle,
  fire: Flame,
  security: Shield,
  infrastructure: Wrench,
};

const typeLabels: Record<IncidentType, string> = {
  medical: 'Medical',
  fire: 'Fire',
  security: 'Security',
  infrastructure: 'Infrastructure',
};

const severityColors: Record<IncidentSeverity, string> = {
  critical: 'bg-severity-critical text-white',
  high: 'bg-severity-high text-white',
  medium: 'bg-severity-medium text-black',
  low: 'bg-severity-low text-white',
};

const severityBorderColors: Record<IncidentSeverity, string> = {
  critical: 'border-l-severity-critical',
  high: 'border-l-severity-high',
  medium: 'border-l-severity-medium',
  low: 'border-l-severity-low',
};

export function IncidentFeed({ incidents, isLoading, selectedId, onSelect }: IncidentFeedProps) {
  const safeIncidents = incidents || [];
  const activeIncidents = safeIncidents.filter(i => i?.status === 'active');
  
  // Sort by severity priority
  const severityOrder: Record<IncidentSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  
  const sortedIncidents = [...activeIncidents].sort((a, b) => {
    const aOrder = a.severity ? severityOrder[a.severity] : 4;
    const bOrder = b.severity ? severityOrder[b.severity] : 4;
    return aOrder - bOrder;
  });

  return (
    <Card className="h-full bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span>Live Incidents</span>
          <Badge variant="secondary" className="ml-auto">
            {activeIncidents.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : sortedIncidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Shield className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No active incidents</p>
            </div>
          ) : (
            <div className="space-y-2 px-4 pb-4">
              {sortedIncidents.map((incident) => {
                const Icon = incident.type && typeIcons[incident.type] ? typeIcons[incident.type] : AlertTriangle;
                const severityColor = incident.severity ? severityColors[incident.severity] : 'bg-muted';
                const borderColor = incident.severity ? severityBorderColors[incident.severity] : 'border-l-muted';
                
                return (
                  <div
                    key={incident.id}
                    onClick={() => onSelect(incident.id)}
                    className={cn(
                      'p-3 rounded-lg border-l-4 cursor-pointer transition-all',
                      'bg-secondary/30 hover:bg-secondary/50',
                      borderColor,
                      selectedId === incident.id && 'ring-1 ring-primary bg-secondary/50',
                      incident.severity === 'critical' && 'animate-pulse-critical'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium truncate">
                            {typeLabels[incident.type]}
                          </span>
                          {incident.severity && (
                            <Badge className={cn('text-xs uppercase', severityColor)}>
                              {incident.severity}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {incident.description}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {incident.location_name || 'Unknown location'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                          </span>
                        </div>
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
