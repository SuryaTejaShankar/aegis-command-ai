import { Clock, User, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useIncidentAuditLogs, getActionLabel, getActionIcon } from "@/hooks/useIncidentAuditLogs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface IncidentTimelineProps {
  incidentId: string;
}

export const IncidentTimeline = ({ incidentId }: IncidentTimelineProps) => {
  const { data: logs, isLoading, error } = useIncidentAuditLogs(incidentId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-destructive text-sm">
        <AlertCircle className="h-4 w-4" />
        <span>Failed to load timeline</span>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-muted-foreground text-sm text-center py-4">
        No activity recorded yet
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px] pr-4">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-4">
          {logs.map((log, index) => (
            <div key={log.id} className="relative flex gap-4">
              {/* Timeline dot */}
              <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 border-primary text-sm">
                {getActionIcon(log.action)}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm text-foreground">
                      {getActionLabel(log.action)}
                    </p>
                    {log.actor_email && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <User className="h-3 w-3" />
                        <span>{log.actor_email}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    <span>{format(new Date(log.created_at), "MMM d, h:mm a")}</span>
                  </div>
                </div>

                {/* Metadata */}
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <div className="mt-2 p-2 rounded bg-muted/50 text-xs">
                    {renderMetadata(log.metadata)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
};

const renderMetadata = (metadata: Record<string, unknown>): JSX.Element => {
  const displayItems: { label: string; value: string }[] = [];

  // Extract meaningful metadata
  if (metadata.severity) {
    displayItems.push({ label: "Severity", value: String(metadata.severity).toUpperCase() });
  }
  if (metadata.incident_type) {
    displayItems.push({ label: "Type", value: String(metadata.incident_type) });
  }
  if (metadata.helper_name) {
    displayItems.push({ label: "Helper", value: String(metadata.helper_name) });
  }
  if (metadata.helpers_count) {
    displayItems.push({ label: "Helpers Notified", value: String(metadata.helpers_count) });
  }
  if (metadata.radius_km) {
    displayItems.push({ label: "Radius", value: `${metadata.radius_km} km` });
  }
  if (metadata.previous_status && metadata.new_status) {
    displayItems.push({ 
      label: "Status Change", 
      value: `${metadata.previous_status} → ${metadata.new_status}` 
    });
  }

  if (displayItems.length === 0) {
    return <span className="text-muted-foreground">Details recorded</span>;
  }

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {displayItems.map((item, i) => (
        <span key={i}>
          <span className="text-muted-foreground">{item.label}:</span>{" "}
          <span className="text-foreground">{item.value}</span>
        </span>
      ))}
    </div>
  );
};
