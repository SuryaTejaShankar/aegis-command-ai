-- Create helper roles enum
CREATE TYPE public.helper_role AS ENUM ('security', 'medical', 'volunteer');

-- Create helpers table for emergency responders
CREATE TABLE public.helpers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  role helper_role NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.helpers ENABLE ROW LEVEL SECURITY;

-- Only admins can view helpers (phone numbers are sensitive)
CREATE POLICY "Admins can view helpers"
ON public.helpers
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert helpers
CREATE POLICY "Admins can insert helpers"
ON public.helpers
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update helpers
CREATE POLICY "Admins can update helpers"
ON public.helpers
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete helpers
CREATE POLICY "Admins can delete helpers"
ON public.helpers
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_helpers_updated_at
BEFORE UPDATE ON public.helpers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a function to find nearby helpers within a given radius (in kilometers)
CREATE OR REPLACE FUNCTION public.find_nearby_helpers(
  incident_lat DOUBLE PRECISION,
  incident_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 2.0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  mobile_number TEXT,
  role helper_role,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_km DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;