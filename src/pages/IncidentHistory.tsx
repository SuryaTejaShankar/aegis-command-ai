import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { useIncidents } from '@/hooks/useIncidents';
import { IncidentFilters } from '@/components/history/IncidentFilters';
import { IncidentTable } from '@/components/history/IncidentTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History, Loader2 } from 'lucide-react';
import { IncidentType, IncidentSeverity, IncidentStatus } from '@/types/incident';

export interface Filters {
  search: string;
  status: IncidentStatus | 'all';
  type: IncidentType | 'all';
  severity: IncidentSeverity | 'all';
  dateFrom: Date | null;
  dateTo: Date | null;
}

export default function IncidentHistory() {
  const { incidents, isLoading } = useIncidents();
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    type: 'all',
    severity: 'all',
    dateFrom: null,
    dateTo: null,
  });

  const filteredIncidents = useMemo(() => {
    return incidents.filter(incident => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (
          !incident.description.toLowerCase().includes(searchLower) &&
          !(incident.location_name?.toLowerCase().includes(searchLower))
        ) {
          return false;
        }
      }

      // Status filter
      if (filters.status !== 'all' && incident.status !== filters.status) {
        return false;
      }

      // Type filter
      if (filters.type !== 'all' && incident.type !== filters.type) {
        return false;
      }

      // Severity filter
      if (filters.severity !== 'all' && incident.severity !== filters.severity) {
        return false;
      }

      // Date range filter
      if (filters.dateFrom) {
        const incidentDate = new Date(incident.created_at);
        if (incidentDate < filters.dateFrom) {
          return false;
        }
      }

      if (filters.dateTo) {
        const incidentDate = new Date(incident.created_at);
        const endOfDay = new Date(filters.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        if (incidentDate > endOfDay) {
          return false;
        }
      }

      return true;
    });
  }, [incidents, filters]);

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
              <History className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Incident History</h2>
              <p className="text-muted-foreground text-sm">Search and filter past incidents</p>
            </div>
          </div>

          <IncidentFilters filters={filters} onFiltersChange={setFilters} />
          
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Results</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {filteredIncidents.length} of {incidents.length} incidents
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <IncidentTable incidents={filteredIncidents} />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}