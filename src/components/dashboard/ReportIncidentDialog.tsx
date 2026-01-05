import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { IncidentType } from '@/types/incident';
import { Plus, Loader2, AlertTriangle, Flame, Shield, Wrench } from 'lucide-react';

interface ReportIncidentDialogProps {
  onSuccess: () => void;
}

const typeOptions: { value: IncidentType; label: string; icon: React.ElementType }[] = [
  { value: 'medical', label: 'Medical Emergency', icon: AlertTriangle },
  { value: 'fire', label: 'Fire', icon: Flame },
  { value: 'security', label: 'Security Threat', icon: Shield },
  { value: 'infrastructure', label: 'Infrastructure Issue', icon: Wrench },
];

export function ReportIncidentDialog({ onSuccess }: ReportIncidentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [type, setType] = useState<IncidentType | ''>('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('42.3601');
  const [longitude, setLongitude] = useState('-71.0942');
  const [locationName, setLocationName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { user } = useAuth();
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  // Initialize map for location selection
  useEffect(() => {
    if (!open || !mapRef.current || !window.google) return;

    const mapInstance = new window.google.maps.Map(mapRef.current, {
      center: { lat: parseFloat(latitude), lng: parseFloat(longitude) },
      zoom: 15,
      mapId: 'aegis-report-map',
      disableDefaultUI: true,
      zoomControl: true,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#1a1f2e' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1f2e' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#8a9ab0' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a3548' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
      ],
    });

    const markerContent = document.createElement('div');
    markerContent.innerHTML = `
      <div style="
        width: 32px;
        height: 32px;
        background-color: hsl(199, 89%, 48%);
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      "></div>
    `;

    const markerInstance = new window.google.maps.marker.AdvancedMarkerElement({
      map: mapInstance,
      position: { lat: parseFloat(latitude), lng: parseFloat(longitude) },
      content: markerContent,
      gmpDraggable: true,
    });

    markerInstance.addListener('dragend', () => {
      const pos = markerInstance.position as google.maps.LatLngLiteral | null;
      if (pos) {
        setLatitude(String(pos.lat));
        setLongitude(String(pos.lng));
      }
    });

    mapInstance.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        markerInstance.position = e.latLng;
        setLatitude(String(e.latLng.lat()));
        setLongitude(String(e.latLng.lng()));
      }
    });

    mapInstanceRef.current = mapInstance;
    markerRef.current = markerInstance;

    return () => {
      if (markerRef.current) markerRef.current.map = null;
    };
  }, [open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!type) newErrors.type = 'Please select an incident type';
    if (!description || description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      newErrors.latitude = 'Invalid latitude';
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      newErrors.longitude = 'Invalid longitude';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !user) return;

    setIsSubmitting(true);

    try {
      // First, create the incident
      const { data: incident, error: insertError } = await supabase
        .from('incidents')
        .insert({
          type: type as IncidentType,
          description,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          location_name: locationName || null,
          reported_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setIsAnalyzing(true);

      // Then, call AI for analysis
      try {
        const response = await supabase.functions.invoke('analyze-incident', {
          body: {
            incidentId: incident.id,
            type: type,
            description,
            locationName: locationName || undefined,
          },
        });

        if (response.error) {
          console.error('AI analysis error:', response.error);
        }
      } catch (aiError) {
        console.error('AI analysis failed:', aiError);
        // Don't fail the whole operation if AI fails
      }

      toast({
        title: 'Incident reported',
        description: 'The incident has been logged and is being analyzed.',
      });

      // Reset form
      setType('');
      setDescription('');
      setLocationName('');
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to report incident',
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-6 right-6 h-14 px-6 shadow-lg glow-primary"
          >
            <Plus className="h-5 w-5 mr-2" />
            Report Incident
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report New Incident</DialogTitle>
            <DialogDescription>
              Provide details about the incident. AI will analyze and recommend response actions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="type">Incident Type *</Label>
              <Select value={type} onValueChange={(v) => setType(v as IncidentType)}>
                <SelectTrigger className={errors.type ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select incident type" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <option.icon className="h-4 w-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-destructive">{errors.type}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe the incident in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={errors.description ? 'border-destructive' : ''}
                rows={4}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Location * (Click map or drag marker)</Label>
              <div
                ref={mapRef}
                className="h-[200px] rounded-lg border border-border"
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="latitude" className="text-xs text-muted-foreground">
                    Latitude
                  </Label>
                  <Input
                    id="latitude"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className={errors.latitude ? 'border-destructive' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="longitude" className="text-xs text-muted-foreground">
                    Longitude
                  </Label>
                  <Input
                    id="longitude"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className={errors.longitude ? 'border-destructive' : ''}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="locationName">Location Name (Optional)</Label>
              <Input
                id="locationName"
                placeholder="e.g., Main Library, Building A"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {isAnalyzing ? 'Analyzing...' : 'Submitting...'}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Submit Report
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
