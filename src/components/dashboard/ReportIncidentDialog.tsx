import { useState } from 'react';
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
import { Plus, Loader2, AlertTriangle, Flame, Shield, Wrench, MapPin, CheckCircle2, ExternalLink } from 'lucide-react';

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
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [locationName, setLocationName] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationCaptured, setLocationCaptured] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { user } = useAuth();
  const { toast } = useToast();

  // Reverse geocode to get location name from coordinates
  const reverseGeocode = async (lat: number, lng: number) => {
    if (!window.google?.maps?.Geocoder) return;
    
    try {
      const geocoder = new window.google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });
      
      if (response.results && response.results.length > 0) {
        const result = response.results[0];
        const shortName = result.address_components?.find(
          c => c.types.includes('premise') || c.types.includes('establishment') || c.types.includes('point_of_interest')
        )?.long_name;
        
        setLocationName(shortName || result.formatted_address?.split(',').slice(0, 2).join(',') || '');
      }
    } catch (e) {
      console.warn('Reverse geocoding failed:', e);
    }
  };

  // Get current location using browser Geolocation API
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        variant: 'destructive',
        title: 'Geolocation not supported',
        description: 'Your browser does not support GPS location.',
      });
      return;
    }

    setIsGettingLocation(true);
    setErrors({});

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        setLatitude(String(lat));
        setLongitude(String(lng));
        setLocationCaptured(true);
        
        // Try to get location name via reverse geocoding
        await reverseGeocode(lat, lng);
        
        setIsGettingLocation(false);
        toast({
          title: 'Location captured',
          description: 'Your current GPS location has been detected.',
        });
      },
      (error) => {
        setIsGettingLocation(false);
        let message = 'Could not get your location.';
        if (error.code === error.PERMISSION_DENIED) {
          message = 'Location permission denied. Please enable GPS access in your browser settings.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = 'Location unavailable. Please try again.';
        } else if (error.code === error.TIMEOUT) {
          message = 'Location request timed out. Please try again.';
        }
        toast({
          variant: 'destructive',
          title: 'Location error',
          description: message,
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Generate Google Maps link
  const getGoogleMapsLink = () => {
    if (!latitude || !longitude) return null;
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!type) newErrors.type = 'Please select an incident type';
    if (!description || description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (!locationCaptured || !latitude || !longitude) {
      newErrors.location = 'Please capture your current location';
    } else {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
        newErrors.location = 'Invalid location coordinates';
      }
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

            <div className="space-y-3">
              <Label>Location *</Label>
              
              <Button
                type="button"
                variant={locationCaptured ? 'outline' : 'default'}
                className="w-full"
                onClick={handleGetCurrentLocation}
                disabled={isGettingLocation}
              >
                {isGettingLocation ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Detecting location...
                  </>
                ) : locationCaptured ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                    Location Captured - Click to Update
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    Use Current Location
                  </>
                )}
              </Button>
              
              {errors.location && (
                <p className="text-sm text-destructive">{errors.location}</p>
              )}

              {locationCaptured && (
                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Coordinates:</span>
                    <span className="font-mono text-xs">
                      {parseFloat(latitude).toFixed(6)}, {parseFloat(longitude).toFixed(6)}
                    </span>
                  </div>
                  
                  {locationName && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Location:</span>
                      <span className="text-right max-w-[200px] truncate">{locationName}</span>
                    </div>
                  )}
                  
                  {getGoogleMapsLink() && (
                    <a
                      href={getGoogleMapsLink()!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View on Google Maps
                    </a>
                  )}
                </div>
              )}
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
