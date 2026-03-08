import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json();
    const { venture, type, farmSize, totalCost, totalRevenue, profit, profitPerAcre, breakEvenPrice, yieldPerAcre, marketPrice } = body;

    const systemPrompt = `You are an expert agricultural advisor for Kenyan farmers. 
You provide specific, actionable advice based on real data. 
Currency is Kenyan Shillings (KES). Be concise but thorough.
Format your response with clear sections using bullet points.`;

    const userPrompt = `Analyze this farm venture and provide recommendations:

Venture: ${venture}
Type: ${type}
Farm Size: ${farmSize} acres
Total Cost: KES ${totalCost}
Expected Revenue: KES ${totalRevenue}
Projected Profit: KES ${profit}
Profit per Acre: KES ${profitPerAcre}
Break-Even Price: KES ${breakEvenPrice}
Expected Yield per Acre: ${yieldPerAcre}
Market Price per Unit: KES ${marketPrice}

Please provide:
1. Assessment of this venture's viability
2. If there are more profitable crop alternatives for this season in Kenya, recommend them with estimated profit comparison
3. Cost reduction suggestions specific to this venture
4. Market timing advice - when to sell for best prices
5. Risk factors to watch out for
6. One key recommendation to maximize profitability`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const advice = data.choices?.[0]?.message?.content || "No advice available.";

    return new Response(JSON.stringify({ advice }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("venture-ai-advisor error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
