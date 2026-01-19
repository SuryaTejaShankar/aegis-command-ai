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
    if (!incidentId || !incidentType || !severity || !latitude || !longitude || !helperPhone) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate Google Maps link
    const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;

    // Generate concise SMS message (max 160 chars for single SMS)
    const severityEmoji = severity === "critical" ? "🚨" : severity === "high" ? "⚠️" : "📢";
    const shortType = incidentType.charAt(0).toUpperCase() + incidentType.slice(1);
    const shortDesc = description.length > 50 ? description.substring(0, 47) + "..." : description;
    
    const smsMessage = `${severityEmoji} AEGIS ALERT\n${shortType} - ${severity.toUpperCase()}\n${shortDesc}\nLocation: ${mapsLink}`;

    // Generate SMS deep link (works on mobile devices)
    const encodedMessage = encodeURIComponent(smsMessage);
    const smsLink = `sms:${helperPhone}?body=${encodedMessage}`;

    // Log the alert generation using service role client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    await supabaseAdmin.from("audit_logs").insert({
      action: "sms_alert_generated",
      actor_id: user.id,
      actor_email: user.email,
      incident_id: incidentId,
      metadata: {
        helper_id: helperId,
        helper_name: helperName,
        helper_phone: helperPhone.replace(/\d(?=\d{4})/g, "*"), // Mask phone for privacy
        severity,
        incident_type: incidentType,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        smsLink,
        mapsLink,
        message: smsMessage,
        helperName,
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
