import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IncidentInput {
  incidentId: string;
  type: string;
  description: string;
  locationName?: string;
}

interface AIAnalysis {
  severity: "low" | "medium" | "high" | "critical";
  immediateActions: string[];
  resourceRecommendations: string[];
  reasoning: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ========== AUTHENTICATION CHECK ==========
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing or invalid authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with user's auth token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate the JWT token and get user claims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Auth validation failed:', claimsError);
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email;
    console.log(`Authenticated user: ${userEmail} (${userId})`);
    // ========== END AUTHENTICATION CHECK ==========

    const body = await req.json();
    const { incidentId, type, description, locationName } = body as IncidentInput;
    
    // Validate required fields
    if (!incidentId || typeof incidentId !== 'string') {
      return new Response(JSON.stringify({ error: "Missing or invalid incidentId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (!type || typeof type !== 'string') {
      return new Response(JSON.stringify({ error: "Missing or invalid incident type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (!description || typeof description !== 'string' || description.length < 5) {
      return new Response(JSON.stringify({ error: "Description must be at least 5 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== VERIFY INCIDENT ACCESS ==========
    // Check that the incident exists and user has access (RLS will enforce this)
    const { data: incident, error: incidentError } = await supabaseClient
      .from('incidents')
      .select('id, reported_by')
      .eq('id', incidentId)
      .single();

    if (incidentError || !incident) {
      console.error('Incident access error:', incidentError);
      return new Response(JSON.stringify({ error: 'Incident not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // ========== END INCIDENT ACCESS CHECK ==========
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Analyzing incident ${incidentId}: ${type} - ${description.substring(0, 50)}...`);

    const systemPrompt = `You are an AI assistant for AegisICS, an Incident Command System for smart campuses. 
Your role is to analyze emergency incidents and provide actionable recommendations for campus security and emergency response teams.

You must analyze incidents and provide:
1. Severity classification (low, medium, high, critical)
2. 3-5 immediate response actions
3. Resource deployment recommendations
4. Brief reasoning for your assessment

Be concise, professional, and focused on actionable guidance. Prioritize life safety above all else.

Classification guidelines:
- CRITICAL: Immediate threat to life, active shooter, major fire, mass casualty
- HIGH: Serious injury, significant property damage, escalating situation
- MEDIUM: Minor injuries, contained threats, infrastructure issues affecting safety
- LOW: Minor incidents, non-urgent maintenance, informational reports`;

    const userPrompt = `Analyze this campus incident:

Type: ${type.toUpperCase()}
Location: ${locationName || "Unknown"}
Description: ${description}

Provide your analysis in the following JSON format:
{
  "severity": "low|medium|high|critical",
  "immediateActions": ["action1", "action2", "action3"],
  "resourceRecommendations": ["resource1", "resource2"],
  "reasoning": "Brief explanation of severity assessment"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI Response:", content);

    // Parse the JSON from the AI response
    let analysis: AIAnalysis;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1].trim();
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Fallback analysis
      analysis = {
        severity: "medium",
        immediateActions: [
          "Dispatch nearest available responder to the location",
          "Secure the immediate area",
          "Gather additional information from witnesses"
        ],
        resourceRecommendations: [
          "Security personnel",
          "First aid kit if needed"
        ],
        reasoning: "Unable to fully analyze. Defaulting to medium priority for assessment."
      };
    }

    // Normalize severity to lowercase (AI may return uppercase)
    const normalizedSeverity = analysis.severity.toLowerCase() as "low" | "medium" | "high" | "critical";
    const validSeverities = ["low", "medium", "high", "critical"];
    const finalSeverity = validSeverities.includes(normalizedSeverity) ? normalizedSeverity : "medium";
    
    // Update the analysis object with normalized severity
    analysis.severity = finalSeverity;

    // Update the incident in the database with the AI analysis using service role
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (supabaseUrl && supabaseServiceKey) {
      const updateResponse = await fetch(
        `${supabaseUrl}/rest/v1/incidents?id=eq.${incidentId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseServiceKey,
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            severity: finalSeverity,
            ai_analysis: analysis,
          }),
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error("Failed to update incident:", errorText);
      } else {
        console.log(`Successfully updated incident ${incidentId} with AI analysis`);
      }
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-incident function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
