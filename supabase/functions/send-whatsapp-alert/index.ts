import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppAlertRequest {
  incidentId: string;
  helperId: string;
  helperName: string;
  helperMobile: string;
  incidentType: string;
  severity: string;
  description: string;
  latitude: number;
  longitude: number;
  locationName?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ========== AUTHENTICATION CHECK ==========
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Auth validation failed:', claimsError);
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;
    // ========== END AUTHENTICATION CHECK ==========

    // ========== RBAC CHECK: Admin only ==========
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: roleData, error: roleError } = await serviceClient
      .rpc('has_role', { _user_id: userId, _role: 'admin' });

    if (roleError || !roleData) {
      console.error('RBAC check failed:', roleError);
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // ========== END RBAC CHECK ==========

    const body = await req.json() as WhatsAppAlertRequest;
    const { 
      incidentId, helperId, helperName, helperMobile,
      incidentType, severity, description, 
      latitude, longitude, locationName 
    } = body;

    // Validate required fields
    if (!incidentId || !helperId || !helperMobile) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(incidentId) || !uuidRegex.test(helperId)) {
      return new Response(JSON.stringify({ error: 'Invalid ID format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate and sanitize mobile number (6-15 digits for international)
    const cleanMobile = helperMobile.replace(/\D/g, '');
    if (cleanMobile.length < 6 || cleanMobile.length > 15) {
      return new Response(JSON.stringify({ error: 'Invalid mobile number format (must be 6-15 digits)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate coordinates if provided
    if (latitude !== undefined && longitude !== undefined) {
      if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
          latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return new Response(JSON.stringify({ error: 'Invalid coordinates' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Validate description length
    if (description && description.length > 5000) {
      return new Response(JSON.stringify({ error: 'Description too long (max 5000 characters)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate severity if provided
    if (severity) {
      const validSeverities = ['low', 'medium', 'high', 'critical'];
      if (!validSeverities.includes(severity.toLowerCase())) {
        return new Response(JSON.stringify({ error: 'Invalid severity (must be low, medium, high, or critical)' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Sanitize text fields
    const sanitizedDescription = (description || '').substring(0, 5000).replace(/[\x00-\x1F\x7F]/g, '');
    const sanitizedLocationName = (locationName || 'Unknown location').substring(0, 200).replace(/[\x00-\x1F\x7F]/g, '');
    const sanitizedHelperName = (helperName || 'Unknown').substring(0, 100).replace(/[\x00-\x1F\x7F]/g, '');
    const sanitizedIncidentType = (incidentType || 'Unknown').substring(0, 50).replace(/[\x00-\x1F\x7F]/g, '');

    // Generate Google Maps link
    const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

    // Create short AI summary for alert (using sanitized content)
    const alertMessage = encodeURIComponent(
      `🚨 EMERGENCY ALERT - ${sanitizedIncidentType.toUpperCase()}\n\n` +
      `Severity: ${severity?.toUpperCase() || 'UNKNOWN'}\n` +
      `Location: ${sanitizedLocationName}\n\n` +
      `${sanitizedDescription.substring(0, 150)}${sanitizedDescription.length > 150 ? '...' : ''}\n\n` +
      `📍 Location: ${mapsLink}\n\n` +
      `Please respond immediately if available.`
    );

    // Generate WhatsApp deep link
    const whatsappLink = `https://wa.me/${cleanMobile}?text=${alertMessage}`;

    // ========== AUDIT LOG ==========
    await serviceClient.from('audit_logs').insert({
      action: 'whatsapp_alert_generated',
      actor_id: userId,
      actor_email: userEmail,
      incident_id: incidentId,
      metadata: {
        helper_id: helperId,
        helper_name: sanitizedHelperName,
        // Do NOT log the actual phone number for privacy
        alert_type: 'whatsapp_deep_link',
        severity: severity,
        incident_type: sanitizedIncidentType
      }
    });
    // ========== END AUDIT LOG ==========

    console.log(`WhatsApp alert generated for incident ${incidentId} to helper ${helperName}`);

    return new Response(JSON.stringify({ 
      success: true, 
      whatsappLink,
      mapsLink,
      message: 'WhatsApp link generated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in send-whatsapp-alert:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
