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

    // Validate mobile number format (basic check)
    const cleanMobile = helperMobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      return new Response(JSON.stringify({ error: 'Invalid mobile number format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate Google Maps link
    const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

    // Create short AI summary for alert
    const alertMessage = encodeURIComponent(
      `🚨 EMERGENCY ALERT - ${incidentType.toUpperCase()}\n\n` +
      `Severity: ${severity?.toUpperCase() || 'UNKNOWN'}\n` +
      `Location: ${locationName || 'Unknown location'}\n\n` +
      `${description.substring(0, 150)}${description.length > 150 ? '...' : ''}\n\n` +
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
        helper_name: helperName,
        // Do NOT log the actual phone number for privacy
        alert_type: 'whatsapp_deep_link',
        severity: severity,
        incident_type: incidentType
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
