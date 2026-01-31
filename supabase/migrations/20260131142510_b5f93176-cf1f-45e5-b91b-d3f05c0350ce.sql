-- Fix find_nearby_helpers function to require admin authorization
-- This prevents non-admin users from accessing helper phone numbers via RPC bypass

CREATE OR REPLACE FUNCTION public.find_nearby_helpers(incident_lat double precision, incident_lng double precision, radius_km double precision DEFAULT 2.0)
 RETURNS TABLE(id uuid, name text, mobile_number text, role helper_role, latitude double precision, longitude double precision, distance_km double precision)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Authorization check: Only admins can access helper contact information
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required to view helper information'
      USING ERRCODE = '42501'; -- insufficient_privilege error code
  END IF;

  RETURN QUERY
  SELECT 
    h.id,
    h.name,
    h.mobile_number,
    h.role,
    h.latitude,
    h.longitude,
    -- Haversine formula for distance in km
    (6371 * acos(
      cos(radians(incident_lat)) * cos(radians(h.latitude)) * 
      cos(radians(h.longitude) - radians(incident_lng)) + 
      sin(radians(incident_lat)) * sin(radians(h.latitude))
    )) AS distance_km
  FROM public.helpers h
  WHERE h.is_active = true
    AND (6371 * acos(
      cos(radians(incident_lat)) * cos(radians(h.latitude)) * 
      cos(radians(h.longitude) - radians(incident_lng)) + 
      sin(radians(incident_lat)) * sin(radians(h.latitude))
    )) <= radius_km
  ORDER BY distance_km ASC;
END;
$function$;