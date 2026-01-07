import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { useIncidents } from '@/hooks/useIncidents';
import { IncidentTrendChart } from '@/components/analytics/IncidentTrendChart';
import { SeverityDistributionChart } from '@/components/analytics/SeverityDistributionChart';
import { TypeBreakdownChart } from '@/components/analytics/TypeBreakdownChart';
import { ResponseTimeMetrics } from '@/components/analytics/ResponseTimeMetrics';
import { IncidentTimeline } from '@/components/analytics/IncidentTimeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Loader2 } from 'lucide-react';

export default function Analytics() {
  const { incidents, isLoading } = useIncidents();

  if (isLoading) {
    return (
      <DashboardLayout>
        <DashboardHeader />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        <DashboardHeader />
        
        <div className="p-6 space-y-6 flex-1 overflow-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
              <p className="text-muted-foreground text-sm">Incident trends and insights</p>
            </div>
          </div>

          {/* Response Time Metrics */}
          <ResponseTimeMetrics incidents={incidents} />

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <IncidentTrendChart incidents={incidents} />
            <SeverityDistributionChart incidents={incidents} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TypeBreakdownChart incidents={incidents} />
            <IncidentTimeline incidents={incidents} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}