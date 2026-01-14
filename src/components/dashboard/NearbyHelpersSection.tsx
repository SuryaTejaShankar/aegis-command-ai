import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  ExternalLink
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
  const { role } = useAuth();
  const { toast } = useToast();
  const [sendingAlertFor, setSendingAlertFor] = useState<string | null>(null);
  
  const { helpers, isLoading } = useNearbyHelpers({
    latitude: incident.latitude,
    longitude: incident.longitude,
    radiusKm: 2.0,
    enabled: role === 'admin' && (incident.severity === 'critical' || incident.severity === 'high')
  });

  // Only show for admins on critical/high severity incidents
  if (role !== 'admin') return null;
  if (incident.severity !== 'critical' && incident.severity !== 'high') return null;

  const handleCall = (helper: NearbyHelper) => {
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
        // Open WhatsApp in new tab
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
        <h4 className="text-sm font-medium flex items-center gap-2 text-primary">
          <Users className="h-4 w-4" />
          Nearby Emergency Helpers
          {incident.severity === 'critical' && (
            <Badge variant="destructive" className="text-xs">
              CRITICAL
            </Badge>
          )}
        </h4>
        
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
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{helper.name}</span>
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
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => handleCall(helper)}
                      >
                        <Phone className="h-3 w-3 mr-1" />
                        Call
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 bg-green-600 hover:bg-green-700"
                        onClick={() => handleWhatsAppAlert(helper)}
                        disabled={sendingAlertFor === helper.id}
                      >
                        {sendingAlertFor === helper.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <MessageCircle className="h-3 w-3 mr-1" />
                        )}
                        WhatsApp
                        <ExternalLink className="h-3 w-3 ml-1" />
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
