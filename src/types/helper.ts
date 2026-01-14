export type HelperRole = 'security' | 'medical' | 'volunteer';

export interface Helper {
  id: string;
  name: string;
  mobile_number: string;
  role: HelperRole;
  latitude: number;
  longitude: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface NearbyHelper extends Helper {
  distance_km: number;
}

export interface CreateHelperInput {
  name: string;
  mobile_number: string;
  role: HelperRole;
  latitude: number;
  longitude: number;
  is_active?: boolean;
}
