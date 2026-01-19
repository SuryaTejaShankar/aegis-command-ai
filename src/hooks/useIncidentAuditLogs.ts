import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditLogEntry {
  id: string;
  action: string;
  actor_id: string | null;
  actor_email: string | null;
  incident_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export const useIncidentAuditLogs = (incidentId: string | null) => {
  return useQuery({
    queryKey: ["incident-audit-logs", incidentId],
    queryFn: async (): Promise<AuditLogEntry[]> => {
      if (!incidentId) return [];

      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("incident_id", incidentId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching audit logs:", error);
        throw error;
      }

      return (data || []) as AuditLogEntry[];
    },
    enabled: !!incidentId,
  });
};

export const getActionLabel = (action: string): string => {
  const actionLabels: Record<string, string> = {
    incident_created: "Incident Created",
    incident_updated: "Incident Updated",
    incident_resolved: "Incident Resolved",
    incident_escalated: "Incident Escalated",
    ai_analysis_completed: "AI Analysis Completed",
    ai_analysis_failed: "AI Analysis Failed",
    whatsapp_alert_generated: "WhatsApp Alert Sent",
    sms_alert_generated: "SMS Alert Sent",
    bulk_emergency_alerts_generated: "Bulk Alerts Generated",
    call_initiated: "Call Initiated",
    helper_notified: "Helper Notified",
  };
  return actionLabels[action] || action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

export const getActionIcon = (action: string): string => {
  const actionIcons: Record<string, string> = {
    incident_created: "🆕",
    incident_updated: "✏️",
    incident_resolved: "✅",
    incident_escalated: "⬆️",
    ai_analysis_completed: "🤖",
    ai_analysis_failed: "❌",
    whatsapp_alert_generated: "💬",
    sms_alert_generated: "📱",
    bulk_emergency_alerts_generated: "📢",
    call_initiated: "📞",
    helper_notified: "👤",
  };
  return actionIcons[action] || "📋";
};
