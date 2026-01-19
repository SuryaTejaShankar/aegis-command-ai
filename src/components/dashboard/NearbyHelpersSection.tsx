import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNearbyHelpers } from '@/hooks/useNearbyHelpers';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Incident } from '@/types/incident';
import { NearbyHelper, HelperRole } from '@/types/helper';
import { 
  Phone, 
  MessageCircle, 
  Shield, 
  Heart, 
  Users, 
  MapPin,
  Loader2,
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  Send,
  Megaphone
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NearbyHelpersSectionProps {
  incident: Incident;
}

const roleIcons: Record<HelperRole, React.ReactNode> = {
  security: <Shield className="h-4 w-4" />,
  medical: <Heart className="h-4 w-4" />,
  volunteer: <Users className="h-4 w-4" />,
};

const roleColors: Record<HelperRole, string> = {
  security: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  medical: 'bg-red-500/10 text-red-500 border-red-500/30',
  volunteer: 'bg-green-500/10 text-green-500 border-green-500/30',
};

export function NearbyHelpersSection({ incident }: NearbyHelpersSectionProps) {
  const { role, user } = useAuth();
  const { toast } = useToast();
  const [sendingAlertFor, setSendingAlertFor] = useState<string | null>(null);
  const [sendingSmsFor, setSendingSmsFor] = useState<string | null>(null);
  const [sendingBulkAlert, setSendingBulkAlert] = useState(false);
  
  const { helpers, isLoading } = useNearbyHelpers({
    latitude: incident.latitude,
    longitude: incident.longitude,
    radiusKm: 2.0,
    enabled: role === 'admin' && (incident.severity === 'critical' || incident.severity === 'high')
  });

  // Only show for admins on critical/high severity incidents
  if (role !== 'admin') return null;
  if (incident.severity !== 'critical' && incident.severity !== 'high') return null;

  const handleCall = async (helper: NearbyHelper) => {
    // Log the call action
    await supabase.from('audit_logs').insert({
      action: 'call_initiated',
      actor_id: user?.id,
      actor_email: user?.email,
      incident_id: incident.id,
      metadata: {
        helper_id: helper.id,
        helper_name: helper.name,
        helper_role: helper.role,
      },
    });
    
    // tel: protocol for manual call initiation
    window.open(`tel:${helper.mobile_number}`, '_self');
  };

  const handleWhatsAppAlert = async (helper: NearbyHelper) => {
    setSendingAlertFor(helper.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-alert', {
        body: {
          incidentId: incident.id,
          helperId: helper.id,
          helperName: helper.name,
          helperMobile: helper.mobile_number,
          incidentType: incident.type,
          severity: incident.severity,
          description: incident.description,
          latitude: incident.latitude,
          longitude: incident.longitude,
          locationName: incident.location_name,
        },
      });

      if (error) throw error;

      if (data?.whatsappLink) {
        window.open(data.whatsappLink, '_blank');
        toast({
          title: 'WhatsApp alert ready',
          description: `Alert for ${helper.name} has been prepared. Complete sending in WhatsApp.`,
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to generate alert',
        description: error.message || 'Could not create WhatsApp alert',
      });
    } finally {
      setSendingAlertFor(null);
    }
  };

  const handleSmsAlert = async (helper: NearbyHelper) => {
    setSendingSmsFor(helper.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-sms-alert', {
        body: {
          incidentId: incident.id,
          incidentType: incident.type,
          severity: incident.severity,
          description: incident.description,
          latitude: incident.latitude,
          longitude: incident.longitude,
          helperName: helper.name,
          helperPhone: helper.mobile_number,
          helperId: helper.id,
        },
      });

      if (error) throw error;

      if (data?.smsLink) {
        window.open(data.smsLink, '_blank');
        toast({
          title: 'SMS alert ready',
          description: `SMS for ${helper.name} has been prepared. Complete sending in your messaging app.`,
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to generate SMS alert',
        description: error.message || 'Could not create SMS alert',
      });
    } finally {
      setSendingSmsFor(null);
    }
  };

  const handleBulkAlert = async () => {
    if (helpers.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No helpers available',
        description: 'No active helpers within the specified radius.',
      });
      return;
    }

    setSendingBulkAlert(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('trigger-emergency-alerts', {
        body: {
          incidentId: incident.id,
          incidentType: incident.type,
          severity: incident.severity,
          description: incident.description,
          latitude: incident.latitude,
          longitude: incident.longitude,
          locationName: incident.location_name,
          aiSummary: incident.ai_analysis?.reasoning,
          radiusKm: 2.0,
        },
      });

      if (error) throw error;

      if (data?.helpers && data.helpers.length > 0) {
        // Open all WhatsApp links in sequence with small delay
        for (let i = 0; i < data.helpers.length; i++) {
          setTimeout(() => {
            window.open(data.helpers[i].whatsappLink, '_blank');
          }, i * 500); // 500ms delay between each
        }

        toast({
          title: `${data.alertsGenerated} alerts generated`,
          description: 'WhatsApp alerts are being opened. Complete sending in each WhatsApp tab.',
        });
      } else {
        toast({
          title: 'No helpers found',
          description: data?.message || 'No helpers were found within the specified radius.',
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to generate bulk alerts',
        description: error.message || 'Could not create emergency alerts',
      });
    } finally {
      setSendingBulkAlert(false);
    }
  };

  const formatDistance = (km: number): string => {
    if (km < 1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
  };

  return (
    <>
      <Separator className="bg-border/50" />
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium flex items-center gap-2 text-primary">
            <Users className="h-4 w-4" />
            Nearby Emergency Helpers
            {incident.severity === 'critical' && (
              <Badge variant="destructive" className="text-xs">
                CRITICAL
              </Badge>
            )}
          </h4>
          
          {/* Bulk Alert Button */}
          {helpers.length > 0 && (
            <Button
              size="sm"
              variant="default"
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleBulkAlert}
              disabled={sendingBulkAlert}
            >
              {sendingBulkAlert ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Megaphone className="h-3 w-3 mr-1" />
              )}
              Alert All ({helpers.length})
            </Button>
          )}
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : helpers.length === 0 ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm p-3 bg-secondary/30 rounded-lg">
            <AlertTriangle className="h-4 w-4" />
            <span>No active helpers within 2km radius</span>
          </div>
        ) : (
          <div className="space-y-2">
            {helpers.map((helper) => (
              <Card key={helper.id} className="bg-secondary/30 border-border/30">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{helper.name}</span>
                        <Badge 
                          variant="outline" 
                          className={cn('text-xs flex items-center gap-1', roleColors[helper.role])}
                        >
                          {roleIcons[helper.role]}
                          <span className="capitalize">{helper.role}</span>
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{formatDistance(helper.distance_km)} away</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        onClick={() => handleCall(helper)}
                        title="Call helper"
                      >
                        <Phone className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        onClick={() => handleSmsAlert(helper)}
                        disabled={sendingSmsFor === helper.id}
                        title="Send SMS"
                      >
                        {sendingSmsFor === helper.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <MessageSquare className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 px-2 bg-green-600 hover:bg-green-700"
                        onClick={() => handleWhatsAppAlert(helper)}
                        disabled={sendingAlertFor === helper.id}
                        title="Send WhatsApp"
                      >
                        {sendingAlertFor === helper.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <MessageCircle className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        <p className="text-xs text-muted-foreground">
          Only active helpers within 2km are shown. All alert actions are logged.
        </p>
      </div>
    </>
  );
}
