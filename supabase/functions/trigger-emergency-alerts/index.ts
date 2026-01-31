import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmergencyAlertRequest {
  incidentId: string;
  incidentType: string;
  severity: string;
  description: string;
  latitude: number;
  longitude: number;
  locationName?: string;
  aiSummary?: string;
  radiusKm?: number;
}

interface NearbyHelper {
  id: string;
  name: string;
  mobile_number: string;
  role: string;
  latitude: number;
  longitude: number;
  distance_km: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .rpc("has_role", { _user_id: user.id, _role: "admin" });
    
    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "Only admins can trigger emergency alerts" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: EmergencyAlertRequest = await req.json();
    const {
      incidentId,
      incidentType,
      severity,
      description,
      latitude,
      longitude,
      locationName,
      aiSummary,
      radiusKm = 2.0,
    } = body;

    // Validate required fields
    if (!incidentId || !incidentType || !severity || latitude === undefined || longitude === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUID format for incidentId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(incidentId)) {
      return new Response(
        JSON.stringify({ error: "Invalid incidentId format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate coordinates
    if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return new Response(
        JSON.stringify({ error: "Invalid coordinates (latitude: -90 to 90, longitude: -180 to 180)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate radius bounds (0.1 to 50 km)
    const validatedRadiusKm = Math.min(Math.max(radiusKm, 0.1), 50);

    // Validate severity
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: "Invalid severity (must be low, medium, high, or critical)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate description length
    if (description && description.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Description too long (max 5000 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize text fields
    const sanitizedDescription = (description || '').substring(0, 5000).replace(/[\x00-\x1F\x7F]/g, '');
    const sanitizedLocationName = (locationName || 'See map link').substring(0, 200).replace(/[\x00-\x1F\x7F]/g, '');
    const sanitizedIncidentType = incidentType.substring(0, 50).replace(/[\x00-\x1F\x7F]/g, '');
    const sanitizedAiSummary = (aiSummary || sanitizedDescription.substring(0, 100)).substring(0, 500).replace(/[\x00-\x1F\x7F]/g, '');

    // Find nearby helpers using validated radius
    const { data: helpers, error: helpersError } = await supabaseClient
      .rpc("find_nearby_helpers", {
        incident_lat: latitude,
        incident_lng: longitude,
        radius_km: validatedRadiusKm,
      });

    if (helpersError) {
      console.error("Error finding nearby helpers:", helpersError);
      return new Response(
        JSON.stringify({ error: "Failed to find nearby helpers" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!helpers || helpers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No nearby helpers found within the specified radius",
          helpers: [],
          alertsGenerated: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate Google Maps link
    const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
    
    // Create timestamp
    const timestamp = new Date().toLocaleString("en-IN", { 
      timeZone: "Asia/Kolkata",
      dateStyle: "short",
      timeStyle: "short",
    });

    // Generate alert content using sanitized inputs
    const severityEmoji = severity === "critical" ? "🚨" : severity === "high" ? "⚠️" : "📢";
    const shortType = sanitizedIncidentType.charAt(0).toUpperCase() + sanitizedIncidentType.slice(1);
    
    // Generate alerts for each helper
    const alertResults = helpers.map((helper: NearbyHelper) => {
      // WhatsApp message with sanitized content
      const whatsappMessage = `${severityEmoji} *AEGIS EMERGENCY ALERT*

*Type:* ${shortType}
*Severity:* ${severity.toUpperCase()}
*Location:* ${sanitizedLocationName}

*Summary:* ${sanitizedAiSummary}

📍 *Google Maps:* ${mapsLink}

⏰ *Time:* ${timestamp}

_You are ${helper.distance_km.toFixed(2)} km away. Please respond immediately if available._`;

      const encodedWhatsappMessage = encodeURIComponent(whatsappMessage);
      const whatsappLink = `https://wa.me/${helper.mobile_number.replace(/[^0-9]/g, "")}?text=${encodedWhatsappMessage}`;

      // SMS message (shorter) with sanitized content
      const smsMessage = `${severityEmoji} AEGIS: ${shortType} - ${severity.toUpperCase()}. ${sanitizedAiSummary.substring(0, 50)}... Location: ${mapsLink}`;
      const encodedSmsMessage = encodeURIComponent(smsMessage);
      const smsLink = `sms:${helper.mobile_number}?body=${encodedSmsMessage}`;

      return {
        helperId: helper.id,
        helperName: helper.name,
        helperRole: helper.role,
        helperPhone: helper.mobile_number,
        distanceKm: helper.distance_km,
        whatsappLink,
        smsLink,
        callLink: `tel:${helper.mobile_number}`,
      };
    });

    // Log the bulk alert generation using service role client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    await supabaseAdmin.from("audit_logs").insert({
      action: "bulk_emergency_alerts_generated",
      actor_id: user.id,
      actor_email: user.email,
      incident_id: incidentId,
      metadata: {
        severity,
        incident_type: sanitizedIncidentType,
        helpers_count: helpers.length,
        radius_km: validatedRadiusKm,
        helper_ids: helpers.map((h: NearbyHelper) => h.id),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Emergency alerts generated for ${helpers.length} nearby helpers`,
        helpers: alertResults,
        alertsGenerated: helpers.length,
        mapsLink,
        timestamp,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating emergency alerts:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
