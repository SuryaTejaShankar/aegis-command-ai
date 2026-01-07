import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Incident } from '@/types/incident';
import { Clock, CheckCircle, AlertTriangle, Activity } from 'lucide-react';
import { differenceInMinutes, differenceInHours } from 'date-fns';

interface ResponseTimeMetricsProps {
  incidents: Incident[];
}

export function ResponseTimeMetrics({ incidents }: ResponseTimeMetricsProps) {
  const metrics = useMemo(() => {
    const resolvedIncidents = incidents.filter(i => i.resolved_at);
    
    let avgResolutionTime = 0;
    if (resolvedIncidents.length > 0) {
      const totalMinutes = resolvedIncidents.reduce((sum, incident) => {
        return sum + differenceInMinutes(
          new Date(incident.resolved_at!),
          new Date(incident.created_at)
        );
      }, 0);
      avgResolutionTime = Math.round(totalMinutes / resolvedIncidents.length);
    }

    const activeIncidents = incidents.filter(i => i.status === 'active');
    const criticalActive = activeIncidents.filter(i => i.severity === 'critical').length;
    
    const last24hIncidents = incidents.filter(i => {
      const diff = differenceInHours(new Date(), new Date(i.created_at));
      return diff <= 24;
    });

    const resolutionRate = incidents.length > 0 
      ? Math.round((resolvedIncidents.length / incidents.length) * 100)
      : 0;

    return {
      avgResolutionTime,
      activeCount: activeIncidents.length,
      criticalActive,
      last24h: last24hIncidents.length,
      resolutionRate,
      totalResolved: resolvedIncidents.length,
    };
  }, [incidents]);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatTime(metrics.avgResolutionTime)}</p>
              <p className="text-xs text-muted-foreground">Avg Resolution</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--severity-critical))]/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-[hsl(var(--severity-critical))]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.criticalActive}</p>
              <p className="text-xs text-muted-foreground">Critical Active</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--severity-low))]/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-[hsl(var(--severity-low))]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.resolutionRate}%</p>
              <p className="text-xs text-muted-foreground">Resolution Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--severity-medium))]/10 flex items-center justify-center">
              <Activity className="h-5 w-5 text-[hsl(var(--severity-medium))]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.last24h}</p>
              <p className="text-xs text-muted-foreground">Last 24 Hours</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}