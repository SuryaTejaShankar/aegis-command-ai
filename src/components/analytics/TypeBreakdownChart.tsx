import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Incident, IncidentType } from '@/types/incident';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { LayoutGrid, Flame, ShieldAlert, Wrench, Heart } from 'lucide-react';

interface TypeBreakdownChartProps {
  incidents: Incident[];
}

const TYPE_CONFIG: Record<IncidentType, { label: string; color: string }> = {
  medical: { label: 'Medical', color: 'hsl(var(--severity-critical))' },
  fire: { label: 'Fire', color: 'hsl(var(--severity-high))' },
  security: { label: 'Security', color: 'hsl(var(--severity-medium))' },
  infrastructure: { label: 'Infrastructure', color: 'hsl(var(--primary))' },
};

export function TypeBreakdownChart({ incidents }: TypeBreakdownChartProps) {
  const chartData = useMemo(() => {
    const counts: Record<IncidentType, number> = {
      medical: 0,
      fire: 0,
      security: 0,
      infrastructure: 0,
    };

    incidents.forEach(incident => {
      if (counts.hasOwnProperty(incident.type)) {
        counts[incident.type]++;
      }
    });

    return Object.entries(counts).map(([type, count]) => ({
      type: TYPE_CONFIG[type as IncidentType].label,
      count,
      color: TYPE_CONFIG[type as IncidentType].color,
    }));
  }, [incidents]);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-primary" />
          Incidents by Type
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                type="number" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <YAxis 
                type="category" 
                dataKey="type" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${value} incidents`, 'Count']}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}