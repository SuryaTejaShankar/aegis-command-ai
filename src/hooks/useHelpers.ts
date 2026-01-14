import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Helper, CreateHelperInput } from '@/types/helper';
import { useToast } from '@/hooks/use-toast';

export function useHelpers() {
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchHelpers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('helpers')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        // If user doesn't have admin access, they won't see helpers
        if (error.code === '42501') {
          setHelpers([]);
          return;
        }
        throw error;
      }

      setHelpers((data as Helper[]) || []);
    } catch (error: any) {
      console.error('Error fetching helpers:', error);
      if (error.code !== '42501') {
        toast({
          variant: 'destructive',
          title: 'Failed to load helpers',
          description: error.message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const createHelper = async (input: CreateHelperInput): Promise<boolean> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('helpers').insert({
        ...input,
        created_by: userData.user?.id
      });

      if (error) throw error;

      toast({
        title: 'Helper registered',
        description: `${input.name} has been added to the helpers registry.`,
      });
      
      await fetchHelpers();
      return true;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to register helper',
        description: error.message,
      });
      return false;
    }
  };

  const updateHelper = async (id: string, updates: Partial<CreateHelperInput>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('helpers')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Helper updated',
        description: 'Helper information has been updated.',
      });
      
      await fetchHelpers();
      return true;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to update helper',
        description: error.message,
      });
      return false;
    }
  };

  const deleteHelper = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('helpers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Helper removed',
        description: 'Helper has been removed from the registry.',
      });
      
      await fetchHelpers();
      return true;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to remove helper',
        description: error.message,
      });
      return false;
    }
  };

  const toggleHelperStatus = async (id: string, isActive: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('helpers')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: isActive ? 'Helper activated' : 'Helper deactivated',
        description: `Helper status has been updated.`,
      });
      
      await fetchHelpers();
      return true;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to update helper status',
        description: error.message,
      });
      return false;
    }
  };

  useEffect(() => {
    fetchHelpers();
  }, [fetchHelpers]);

  return { 
    helpers, 
    isLoading, 
    refetch: fetchHelpers,
    createHelper,
    updateHelper,
    deleteHelper,
    toggleHelperStatus
  };
}
