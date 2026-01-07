import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Users, ShieldCheck, Activity, Database } from 'lucide-react';

export function SystemStats() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    adminCount: 0,
    operatorCount: 0,
    totalIncidents: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      // Get user role counts
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role');
      
      const adminCount = roles?.filter(r => r.role === 'admin').length || 0;
      const operatorCount = roles?.filter(r => r.role === 'operator').length || 0;

      // Get incident count
      const { count: incidentCount } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalUsers: (roles?.length || 0),
        adminCount,
        operatorCount,
        totalIncidents: incidentCount || 0,
      });
    };

    fetchStats();
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--severity-critical))]/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-[hsl(var(--severity-critical))]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.adminCount}</p>
              <p className="text-xs text-muted-foreground">Administrators</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--severity-low))]/10 flex items-center justify-center">
              <Activity className="h-5 w-5 text-[hsl(var(--severity-low))]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.operatorCount}</p>
              <p className="text-xs text-muted-foreground">Operators</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--severity-medium))]/10 flex items-center justify-center">
              <Database className="h-5 w-5 text-[hsl(var(--severity-medium))]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalIncidents}</p>
              <p className="text-xs text-muted-foreground">Total Incidents</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}