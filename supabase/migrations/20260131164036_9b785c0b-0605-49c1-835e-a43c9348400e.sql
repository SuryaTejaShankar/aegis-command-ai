-- Fix client-side audit logging by:
-- 1. Creating a database trigger to automatically log incident status changes
-- 2. Updating RLS policy to allow authenticated users to insert their own audit logs

-- Create trigger function for automatic audit logging of incident status changes
CREATE OR REPLACE FUNCTION public.log_incident_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_email TEXT;
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Try to get actor email from profiles
    SELECT p.full_name INTO v_actor_email
    FROM public.profiles p
    WHERE p.user_id = COALESCE(NEW.resolved_by, auth.uid());
    
    INSERT INTO public.audit_logs (action, incident_id, actor_id, metadata)
    VALUES (
      'incident_status_changed',
      NEW.id,
      COALESCE(NEW.resolved_by, auth.uid()),
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'changed_at', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on incidents table
DROP TRIGGER IF EXISTS audit_incident_status_changes ON public.incidents;
CREATE TRIGGER audit_incident_status_changes
AFTER UPDATE ON public.incidents
FOR EACH ROW
EXECUTE FUNCTION public.log_incident_status_change();

-- Update RLS policy to allow authenticated users to insert their own audit logs
-- This enables client-side logging for actions not covered by triggers (like call_initiated)
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;

-- Allow authenticated users to insert audit logs for their own actions
CREATE POLICY "Authenticated users can insert own audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = auth.uid()  -- Users can only log their own actions
);

-- Keep service role access for edge functions
CREATE POLICY "Service role can insert audit logs"
ON public.audit_logs
FOR INSERT
TO service_role
WITH CHECK (true);