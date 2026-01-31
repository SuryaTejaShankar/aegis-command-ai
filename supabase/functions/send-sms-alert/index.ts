import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SmsAlertRequest {
  incidentId: string;
  incidentType: string;
  severity: string;
  description: string;
  latitude: number;
  longitude: number;
  helperName: string;
  helperPhone: string;
  helperId: string;
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
        JSON.stringify({ error: "Only admins can send SMS alerts" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: SmsAlertRequest = await req.json();
    const {
      incidentId,
      incidentType,
      severity,
      description,
      latitude,
      longitude,
      helperName,
      helperPhone,
      helperId,
    } = body;

    // Validate required fields
    if (!incidentId || !incidentType || !severity || latitude === undefined || longitude === undefined || !helperPhone) {
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
        JSON.stringify({ error: "Invalid coordinates" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone number format (6-15 digits for international)
    const cleanPhone = helperPhone.replace(/\D/g, '');
    if (cleanPhone.length < 6 || cleanPhone.length > 15) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format (must be 6-15 digits)" }),
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

    // Validate severity
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: "Invalid severity (must be low, medium, high, or critical)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize text fields
    const sanitizedDescription = (description || '').substring(0, 5000).replace(/[\x00-\x1F\x7F]/g, '');
    const sanitizedHelperName = (helperName || 'Unknown').substring(0, 100).replace(/[\x00-\x1F\x7F]/g, '');
    const sanitizedIncidentType = incidentType.substring(0, 50).replace(/[\x00-\x1F\x7F]/g, '');

    // Generate Google Maps link
    const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;

    // Generate concise SMS message (max 160 chars for single SMS)
    const severityEmoji = severity === "critical" ? "🚨" : severity === "high" ? "⚠️" : "📢";
    const shortType = sanitizedIncidentType.charAt(0).toUpperCase() + sanitizedIncidentType.slice(1);
    const shortDesc = sanitizedDescription.length > 50 ? sanitizedDescription.substring(0, 47) + "..." : sanitizedDescription;
    
    const smsMessage = `${severityEmoji} AEGIS ALERT\n${shortType} - ${severity.toUpperCase()}\n${shortDesc}\nLocation: ${mapsLink}`;

    // Generate SMS deep link (works on mobile devices)
    const encodedMessage = encodeURIComponent(smsMessage);
    const smsLink = `sms:${cleanPhone}?body=${encodedMessage}`;

    // Log the alert generation using service role client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    await supabaseAdmin.from("audit_logs").insert({
      action: "sms_alert_generated",
      actor_id: user.id,
      actor_email: user.email,
      incident_id: incidentId,
      metadata: {
        helper_id: helperId,
        helper_name: sanitizedHelperName,
        helper_phone: cleanPhone.replace(/\d(?=\d{4})/g, "*"), // Mask phone for privacy
        severity,
        incident_type: sanitizedIncidentType,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        smsLink,
        mapsLink,
        message: smsMessage,
        helperName: sanitizedHelperName,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating SMS alert:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
