-- Fix profiles table RLS policy to restrict visibility
-- Only allow users to view their own profile, admins can view all

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Users can only view their own profile OR admins can view all
CREATE POLICY "Users can view own profile admins can view all"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);