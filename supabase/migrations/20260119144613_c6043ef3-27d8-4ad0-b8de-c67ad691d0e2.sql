-- Fix overly permissive incident update policy
-- Only reporter or admin can modify incidents

-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "Authenticated users can update incidents" ON public.incidents;

-- Create restrictive update policy: only reporter or admin can update
CREATE POLICY "Reporter or admin can update incidents" 
ON public.incidents 
FOR UPDATE 
USING (
  auth.uid() = reported_by 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Create delete policy: only admin can delete incidents
CREATE POLICY "Only admins can delete incidents" 
ON public.incidents 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));