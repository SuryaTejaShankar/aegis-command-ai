export type IncidentType = 'medical' | 'fire' | 'security' | 'infrastructure';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'active' | 'resolved' | 'escalated';

export interface AIAnalysis {
  severity: IncidentSeverity;
  immediateActions: string[];
  resourceRecommendations: string[];
  reasoning: string;
}

export interface Incident {
  id: string;
  type: IncidentType;
  description: string;
  latitude: number;
  longitude: number;
  location_name: string | null;
  status: IncidentStatus;
  severity: IncidentSeverity | null;
  ai_analysis: AIAnalysis | null;
  reported_by: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateIncidentInput {
  type: IncidentType;
  description: string;
  latitude: number;
  longitude: number;
  location_name?: string;
}
