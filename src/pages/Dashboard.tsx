import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { IncidentFeed } from '@/components/dashboard/IncidentFeed';
import { IncidentMap } from '@/components/dashboard/IncidentMap';
import { IncidentDetailPanel } from '@/components/dashboard/IncidentDetailPanel';
import { ReportIncidentDialog } from '@/components/dashboard/ReportIncidentDialog';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { useIncidents } from '@/hooks/useIncidents';

export default function Dashboard() {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const { incidents, isLoading, refetch } = useIncidents();
  
  const selectedIncident = incidents?.find(i => i.id === selectedIncidentId);

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        <DashboardHeader />
        
        <div className="p-6 space-y-6 flex-1 overflow-auto">
          <StatsCards incidents={incidents || []} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px]">
            {/* Incident Feed */}
            <div className="lg:col-span-1">
              <IncidentFeed 
                incidents={incidents || []} 
                isLoading={isLoading}
                selectedId={selectedIncidentId}
                onSelect={setSelectedIncidentId}
              />
            </div>
            
            {/* Map and Detail Panel */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <IncidentMap 
                incidents={incidents || []} 
                selectedId={selectedIncidentId}
                onMarkerClick={setSelectedIncidentId}
              />
              
              {selectedIncident && (
                <IncidentDetailPanel 
                  incident={selectedIncident} 
                  onClose={() => setSelectedIncidentId(null)}
                  onUpdate={refetch}
                />
              )}
            </div>
          </div>
        </div>
        
        <ReportIncidentDialog onSuccess={refetch} />
      </div>
    </DashboardLayout>
  );
}
