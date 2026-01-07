import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Incident } from '@/types/incident';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import { TrendingUp } from 'lucide-react';

interface IncidentTrendChartProps {
  incidents: Incident[];
}

export function IncidentTrendChart({ incidents }: IncidentTrendChartProps) {
  const chartData = useMemo(() => {
    const today = startOfDay(new Date());
    const thirtyDaysAgo = subDays(today, 29);
    
    const days = eachDayOfInterval({ start: thirtyDaysAgo, end: today });
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayIncidents = incidents.filter(i => 
        format(new Date(i.created_at), 'yyyy-MM-dd') === dayStr
      );
      
      return {
        date: format(day, 'MMM dd'),
        total: dayIncidents.length,
        critical: dayIncidents.filter(i => i.severity === 'critical').length,
        high: dayIncidents.filter(i => i.severity === 'high').length,
        resolved: dayIncidents.filter(i => i.status === 'resolved').length,
      };
    });
  }, [incidents]);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Incident Trends (30 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={false}
                name="Total"
              />
              <Line 
                type="monotone" 
                dataKey="critical" 
                stroke="hsl(var(--severity-critical))" 
                strokeWidth={2}
                dot={false}
                name="Critical"
              />
              <Line 
                type="monotone" 
                dataKey="resolved" 
                stroke="hsl(var(--severity-low))" 
                strokeWidth={2}
                dot={false}
                name="Resolved"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}