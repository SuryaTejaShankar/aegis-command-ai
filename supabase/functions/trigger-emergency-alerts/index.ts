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
    if (!incidentId || !incidentType || !severity || !latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find nearby helpers
    const { data: helpers, error: helpersError } = await supabaseClient
      .rpc("find_nearby_helpers", {
        incident_lat: latitude,
        incident_lng: longitude,
        radius_km: radiusKm,
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

    // Generate alert content
    const severityEmoji = severity === "critical" ? "🚨" : severity === "high" ? "⚠️" : "📢";
    const shortType = incidentType.charAt(0).toUpperCase() + incidentType.slice(1);
    const summary = aiSummary || description.substring(0, 100);
    
    // Generate alerts for each helper
    const alertResults = helpers.map((helper: NearbyHelper) => {
      // WhatsApp message
      const whatsappMessage = `${severityEmoji} *AEGIS EMERGENCY ALERT*

*Type:* ${shortType}
*Severity:* ${severity.toUpperCase()}
*Location:* ${locationName || "See map link"}

*Summary:* ${summary}

📍 *Google Maps:* ${mapsLink}

⏰ *Time:* ${timestamp}

_You are ${helper.distance_km.toFixed(2)} km away. Please respond immediately if available._`;

      const encodedWhatsappMessage = encodeURIComponent(whatsappMessage);
      const whatsappLink = `https://wa.me/${helper.mobile_number.replace(/[^0-9]/g, "")}?text=${encodedWhatsappMessage}`;

      // SMS message (shorter)
      const smsMessage = `${severityEmoji} AEGIS: ${shortType} - ${severity.toUpperCase()}. ${summary.substring(0, 50)}... Location: ${mapsLink}`;
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
        incident_type: incidentType,
        helpers_count: helpers.length,
        radius_km: radiusKm,
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
