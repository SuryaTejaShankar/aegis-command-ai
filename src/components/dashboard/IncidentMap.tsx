import { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Incident, IncidentSeverity } from '@/types/incident';
import { Loader2, MapPin } from 'lucide-react';

interface IncidentMapProps {
  incidents: Incident[];
  selectedId: string | null;
  onMarkerClick: (id: string) => void;
}

const severityColors: Record<IncidentSeverity, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#22C55E',
};

export function IncidentMap({ incidents, selectedId, onMarkerClick }: IncidentMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps?.Map) {
      setError('Google Maps not available');
      setIsLoading(false);
      return;
    }

    try {
      // Default to a campus-like location (MIT as example)
      const defaultCenter = { lat: 42.3601, lng: -71.0942 };

      const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 15,
        mapId: 'aegis-ics-map',
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#1a1f2e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1f2e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#8a9ab0' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a3548' }] },
          { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a9ab0' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
          { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1a2538' }] },
          { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6a7b8c' }] },
          { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a2e1a' }] },
        ],
      });

      mapInstanceRef.current = mapInstance;
      setIsLoading(false);
    } catch (e) {
      console.error('Error initializing map:', e);
      setError('Failed to initialize map');
      setIsLoading(false);
    }
  }, []);

  // Load Google Maps script
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setError('Google Maps API key not configured');
      setIsLoading(false);
      return;
    }

    if (window.google?.maps) {
      initializeMap();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&v=weekly&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // Wait for google.maps to be fully available
      const checkAndInit = () => {
        if (window.google?.maps?.Map) {
          initializeMap();
        } else {
          setTimeout(checkAndInit, 100);
        }
      };
      checkAndInit();
    };
    script.onerror = () => {
      setError('Failed to load Google Maps');
      setIsLoading(false);
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => {
        if (marker) marker.map = null;
      });
    };
  }, [initializeMap]);

  // Update markers when incidents change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps?.marker?.AdvancedMarkerElement) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      try {
        if (marker) marker.map = null;
      } catch (e) {
        console.warn('Error clearing marker:', e);
      }
    });

    const activeIncidents = (incidents || []).filter(i => i?.status === 'active');
    const newMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

    activeIncidents.forEach((incident) => {
      try {
        const color = incident.severity ? severityColors[incident.severity] : '#6B7280';
        
        // Create custom marker element
        const markerContent = document.createElement('div');
        markerContent.innerHTML = `
          <div style="
            width: 24px;
            height: 24px;
            background-color: ${color};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            cursor: pointer;
          "></div>
        `;

        const marker = new window.google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat: incident.latitude, lng: incident.longitude },
          content: markerContent,
          title: incident.description || 'Incident',
        });

        marker.addListener('click', () => {
          onMarkerClick(incident.id);
        });

        newMarkers.push(marker);
      } catch (e) {
        console.error('Error creating marker for incident:', incident.id, e);
      }
    });

    markersRef.current = newMarkers;

    // Fit bounds if there are incidents
    if (activeIncidents.length > 0) {
      try {
        const bounds = new window.google.maps.LatLngBounds();
        activeIncidents.forEach(incident => {
          bounds.extend({ lat: incident.latitude, lng: incident.longitude });
        });
        map.fitBounds(bounds, 50);
        
        // Don't zoom too close
        const listener = window.google.maps.event.addListener(map, 'idle', () => {
          const zoom = map.getZoom();
          if (zoom && zoom > 16) map.setZoom(16);
          window.google.maps.event.removeListener(listener);
        });
      } catch (e) {
        console.error('Error fitting map bounds:', e);
      }
    }
  }, [incidents, onMarkerClick]);

  // Highlight selected marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedId) return;

    const selectedIncident = incidents.find(i => i.id === selectedId);
    if (selectedIncident) {
      map.panTo({ lat: selectedIncident.latitude, lng: selectedIncident.longitude });
    }
  }, [selectedId, incidents]);

  return (
    <Card className="flex-1 bg-card/50 border-border/50 min-h-[300px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Incident Map
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <p>{error}</p>
          </div>
        ) : (
          <div ref={mapRef} className="h-[300px] rounded-b-lg" />
        )}
      </CardContent>
    </Card>
  );
}
