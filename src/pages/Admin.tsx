import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { UserManagement } from '@/components/admin/UserManagement';
import { SystemStats } from '@/components/admin/SystemStats';
import { BulkReanalyze } from '@/components/admin/BulkReanalyze';
import { HelperManagement } from '@/components/admin/HelperManagement';
import { useAuth } from '@/contexts/AuthContext';
import { useIncidents } from '@/hooks/useIncidents';
import { Navigate } from 'react-router-dom';
import { Settings, Loader2 } from 'lucide-react';

export default function Admin() {
  const { role, loading } = useAuth();
  const { incidents, refetch } = useIncidents();
  
  const incidentsWithoutAnalysis = incidents.filter(i => !i.ai_analysis).length;

  if (loading) {
    return (
      <DashboardLayout>
        <DashboardHeader />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        <DashboardHeader />
        
        <div className="p-6 space-y-6 flex-1 overflow-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Admin Panel</h2>
              <p className="text-muted-foreground text-sm">User management and system settings</p>
            </div>
          </div>

          <SystemStats />
          <BulkReanalyze 
            incidentsWithoutAnalysis={incidentsWithoutAnalysis} 
            onComplete={refetch} 
          />
          <HelperManagement />
          <UserManagement />
        </div>
      </div>
    </DashboardLayout>
  );
}