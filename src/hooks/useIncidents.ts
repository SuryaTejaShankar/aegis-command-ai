import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Incident, AIAnalysis } from '@/types/incident';
import { useToast } from '@/hooks/use-toast';

export function useIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchIncidents = async () => {
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
    } else {
      // Transform the data to match our Incident type
      const transformedData = (data || []).map(item => ({
        ...item,
        ai_analysis: item.ai_analysis as unknown as AIAnalysis | null,
      })) as Incident[];
      setIncidents(transformedData);
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
