import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NearbyHelper } from '@/types/helper';
import { useToast } from '@/hooks/use-toast';

interface UseNearbyHelpersOptions {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  enabled?: boolean;
}

export function useNearbyHelpers({ 
  latitude, 
  longitude, 
  radiusKm = 2.0,
  enabled = true 
}: UseNearbyHelpersOptions) {
  const [helpers, setHelpers] = useState<NearbyHelper[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchNearbyHelpers = useCallback(async () => {
    if (!enabled) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('find_nearby_helpers', {
        incident_lat: latitude,
        incident_lng: longitude,
        radius_km: radiusKm
      });

      if (error) {
        // If user doesn't have admin access, they won't see helpers (expected)
        if (error.code === '42501') {
          setHelpers([]);
          return;
        }
        throw error;
      }

      setHelpers((data as NearbyHelper[]) || []);
    } catch (error: any) {
      console.error('Error fetching nearby helpers:', error);
      // Don't show error toast for permission issues
      if (error.code !== '42501') {
        toast({
          variant: 'destructive',
          title: 'Failed to load nearby helpers',
          description: error.message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [latitude, longitude, radiusKm, enabled, toast]);

  useEffect(() => {
    fetchNearbyHelpers();
  }, [fetchNearbyHelpers]);

  return { helpers, isLoading, refetch: fetchNearbyHelpers };
}
