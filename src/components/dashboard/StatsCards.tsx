import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Incident } from '@/types/incident';
import { AlertTriangle, Flame, Shield, Wrench, Activity } from 'lucide-react';

interface StatsCardsProps {
  incidents: Incident[];
}

export function StatsCards({ incidents }: StatsCardsProps) {
  const activeIncidents = incidents.filter(i => i.status === 'active');
  const criticalCount = activeIncidents.filter(i => i.severity === 'critical').length;
  const highCount = activeIncidents.filter(i => i.severity === 'high').length;
  
  const byType = {
    medical: activeIncidents.filter(i => i.type === 'medical').length,
    fire: activeIncidents.filter(i => i.type === 'fire').length,
    security: activeIncidents.filter(i => i.type === 'security').length,
    infrastructure: activeIncidents.filter(i => i.type === 'infrastructure').length,
  };

  const stats = [
    {
      title: 'Active Incidents',
      value: activeIncidents.length,
      icon: Activity,
      className: activeIncidents.length > 0 ? 'text-status-active' : 'text-muted-foreground',
    },
    {
      title: 'Critical',
      value: criticalCount,
      icon: AlertTriangle,
      className: criticalCount > 0 ? 'text-severity-critical animate-pulse-critical' : 'text-muted-foreground',
    },
    {
      title: 'High Priority',
      value: highCount,
      icon: AlertTriangle,
      className: highCount > 0 ? 'text-severity-high' : 'text-muted-foreground',
    },
    {
      title: 'Medical',
      value: byType.medical,
      icon: AlertTriangle,
      className: 'text-muted-foreground',
    },
    {
      title: 'Fire',
      value: byType.fire,
      icon: Flame,
      className: byType.fire > 0 ? 'text-severity-high' : 'text-muted-foreground',
    },
    {
      title: 'Security',
      value: byType.security,
      icon: Shield,
      className: 'text-muted-foreground',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.className}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stat.className}`}>
              {stat.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
