import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Incident, IncidentSeverity } from '@/types/incident';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { NearbyHelpersSection } from './NearbyHelpersSection';
import { IncidentTimeline } from './IncidentTimeline';
import { 
  X, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  ArrowUp,
  Brain,
  Loader2,
  Lightbulb,
  Users,
  RefreshCw,
  Eye,
  History
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface IncidentDetailPanelProps {
  incident: Incident;
  onClose: () => void;
  onUpdate: () => void;
}

const severityColors: Record<IncidentSeverity, string> = {
  critical: 'bg-severity-critical text-white',
  high: 'bg-severity-high text-white',
  medium: 'bg-severity-medium text-black',
  low: 'bg-severity-low text-white',
};

export function IncidentDetailPanel({ incident, onClose, onUpdate }: IncidentDetailPanelProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const { user, role } = useAuth();
  const { toast } = useToast();

  // Check if user can modify this incident (reporter or admin only)
  const canModify = user && (user.id === incident.reported_by || role === 'admin');

  const handleReanalyze = async () => {
    setIsAnalyzing(true);
    try {
      const response = await supabase.functions.invoke('analyze-incident', {
        body: {
          incidentId: incident.id,
          type: incident.type,
          description: incident.description,
          locationName: incident.location_name || undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Analysis failed');
      }

      toast({
        title: 'Analysis complete',
        description: 'AI analysis has been updated for this incident.',
      });
      onUpdate();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Analysis failed',
        description: error.message || 'Failed to analyze incident',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleResolve = async () => {
    if (!canModify) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'Only the reporter or admin can resolve this incident.',
      });
      return;
    }

    setIsUpdating(true);
    const { error } = await supabase
      .from('incidents')
      .update({
        status: 'resolved',
        resolved_by: user?.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', incident.id);

    setIsUpdating(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to resolve incident',
        description: error.message,
      });
    } else {
      // Log the resolution
      await supabase.from('audit_logs').insert({
        action: 'incident_resolved',
        actor_id: user?.id,
        actor_email: user?.email,
        incident_id: incident.id,
        metadata: {
          previous_status: incident.status,
          new_status: 'resolved',
        },
      });

      toast({
        title: 'Incident resolved',
        description: 'The incident has been marked as resolved.',
      });
      onUpdate();
      onClose();
    }
  };

  const handleEscalate = async () => {
    if (!canModify) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'Only the reporter or admin can escalate this incident.',
      });
      return;
    }

    setIsUpdating(true);
    const { error } = await supabase
      .from('incidents')
      .update({ status: 'escalated' })
      .eq('id', incident.id);

    setIsUpdating(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to escalate incident',
        description: error.message,
      });
    } else {
      // Log the escalation
      await supabase.from('audit_logs').insert({
        action: 'incident_escalated',
        actor_id: user?.id,
        actor_email: user?.email,
        incident_id: incident.id,
        metadata: {
          previous_status: incident.status,
          new_status: 'escalated',
        },
      });

      toast({
        title: 'Incident escalated',
        description: 'The incident has been escalated for further attention.',
      });
      onUpdate();
    }
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3 flex flex-row items-start justify-between">
        <div className="space-y-1">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Incident Details
            {!canModify && (
              <Badge variant="secondary" className="ml-2 text-xs flex items-center gap-1">
                <Eye className="h-3 w-3" />
                View Only
              </Badge>
            )}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            AI-powered analysis and recommendations
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Incident Info */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="capitalize">
            {incident.type}
          </Badge>
          {incident.severity && (
            <Badge className={cn('uppercase', severityColors[incident.severity])}>
              {incident.severity}
            </Badge>
          )}
          <Badge variant="outline" className="capitalize">
            {incident.status}
          </Badge>
        </div>

        <p className="text-sm text-foreground">{incident.description}</p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{incident.location_name || 'Unknown'}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}</span>
          </div>
        </div>

        {/* AI Analysis */}
        {incident.ai_analysis && (
          <>
            <Separator className="bg-border/50" />
            
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2 text-primary">
                <Lightbulb className="h-4 w-4" />
                AI Response Recommendations
              </h4>
              
              {/* Immediate Actions */}
              {Array.isArray(incident.ai_analysis.immediateActions) && 
                incident.ai_analysis.immediateActions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Immediate Actions
                  </p>
                  <ul className="space-y-1">
                    {incident.ai_analysis.immediateActions.map((action, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Resource Recommendations */}
              {Array.isArray(incident.ai_analysis.resourceRecommendations) &&
                incident.ai_analysis.resourceRecommendations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Resource Deployment
                  </p>
                  <ul className="space-y-1">
                    {incident.ai_analysis.resourceRecommendations.map((resource, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{resource}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Reasoning */}
              {incident.ai_analysis.reasoning && (
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Analysis: </span>
                    {incident.ai_analysis.reasoning}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {!incident.ai_analysis && (
          <>
            <Separator className="bg-border/50" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">AI analysis not available</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReanalyze}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Analyze Now
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Nearby Helpers - Only shown for critical/high severity incidents to admins */}
        <NearbyHelpersSection incident={incident} />

        {/* Incident Timeline Toggle */}
        <Separator className="bg-border/50" />
        <div className="space-y-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowTimeline(!showTimeline)}
          >
            <History className="h-4 w-4 mr-2" />
            {showTimeline ? 'Hide' : 'Show'} Activity Timeline
          </Button>
          
          {showTimeline && <IncidentTimeline incidentId={incident.id} />}
        </div>

        {/* Actions - Only for authorized users */}
        {incident.status === 'active' && canModify && (
          <>
            <Separator className="bg-border/50" />
            <div className="flex gap-2">
              <Button 
                className="flex-1" 
                onClick={handleResolve}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Mark Resolved
              </Button>
              <Button 
                variant="outline" 
                className="border-severity-high text-severity-high hover:bg-severity-high hover:text-white"
                onClick={handleEscalate}
                disabled={isUpdating}
              >
                <ArrowUp className="h-4 w-4 mr-2" />
                Escalate
              </Button>
            </div>
          </>
        )}

        {/* View-only notice for non-authorized users */}
        {incident.status === 'active' && !canModify && (
          <>
            <Separator className="bg-border/50" />
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground text-center">
                <Eye className="h-3 w-3 inline mr-1" />
                Only the reporter or an admin can modify this incident
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
