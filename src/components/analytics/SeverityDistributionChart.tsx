import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Incident } from '@/types/incident';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { PieChartIcon } from 'lucide-react';

interface SeverityDistributionChartProps {
  incidents: Incident[];
}

const COLORS = {
  critical: 'hsl(var(--severity-critical))',
  high: 'hsl(var(--severity-high))',
  medium: 'hsl(var(--severity-medium))',
  low: 'hsl(var(--severity-low))',
};

export function SeverityDistributionChart({ incidents }: SeverityDistributionChartProps) {
  const chartData = useMemo(() => {
    const counts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    incidents.forEach(incident => {
      if (incident.severity && counts.hasOwnProperty(incident.severity)) {
        counts[incident.severity as keyof typeof counts]++;
      }
    });

    return [
      { name: 'Critical', value: counts.critical, color: COLORS.critical },
      { name: 'High', value: counts.high, color: COLORS.high },
      { name: 'Medium', value: counts.medium, color: COLORS.medium },
      { name: 'Low', value: counts.low, color: COLORS.low },
    ].filter(item => item.value > 0);
  }, [incidents]);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <PieChartIcon className="h-4 w-4 text-primary" />
          Severity Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {total === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No incident data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value} incidents`, '']}
                />
                <Legend 
                  formatter={(value, entry) => (
                    <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}