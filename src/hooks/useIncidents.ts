import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Incident, AIAnalysis, IncidentSeverity } from '@/types/incident';
import { useToast } from '@/hooks/use-toast';

// Validate and transform AI analysis from database
const validateAIAnalysis = (data: unknown): AIAnalysis | null => {
  if (!data || typeof data !== 'object') return null;
  
  const analysis = data as Record<string, unknown>;
  const validSeverities: IncidentSeverity[] = ['low', 'medium', 'high', 'critical'];
  
  return {
    severity: validSeverities.includes(analysis.severity as IncidentSeverity)
      ? (analysis.severity as IncidentSeverity)
      : 'medium',
    immediateActions: Array.isArray(analysis.immediateActions)
      ? analysis.immediateActions.filter((a): a is string => typeof a === 'string')
      : [],
    resourceRecommendations: Array.isArray(analysis.resourceRecommendations)
      ? analysis.resourceRecommendations.filter((r): r is string => typeof r === 'string')
      : [],
    reasoning: typeof analysis.reasoning === 'string'
      ? analysis.reasoning
      : 'Analysis unavailable',
  };
};

export function useIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchIncidents = async () => {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error fetching incidents',
          description: error.message,
        });
        setIncidents([]);
      } else {
        // Transform the data to match our Incident type with validation
        const transformedData = (data || []).map(item => ({
          ...item,
          ai_analysis: validateAIAnalysis(item.ai_analysis),
        })) as Incident[];
        setIncidents(transformedData);
      }
    } catch (e) {
      console.error('Error fetching incidents:', e);
      setIncidents([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchIncidents();

    // Set up realtime subscription
    const channel = supabase
      .channel('incidents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incidents',
        },
        () => {
          fetchIncidents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { incidents, isLoading, refetch: fetchIncidents };
}
