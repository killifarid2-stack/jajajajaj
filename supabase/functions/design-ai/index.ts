import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST required" }), { status: 405, headers: cors });

  try {
    const body = await req.json();
    const prompt = String(body?.prompt || "").trim();
    if (!prompt) return new Response(JSON.stringify({ error: "prompt is required" }), { status: 400, headers: cors });

    // Secret is read ONLY on the Edge Function/server. Never ship it to Vite/browser code.
    const apiKey = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("AI_API_KEY");
    const baseUrl = (Deno.env.get("AI_BASE_URL") || "https://api.openai.com/v1").replace(/\/$/, "");
    const model = Deno.env.get("AI_MODEL") || "gpt-4.1-mini";
    if (!apiKey) return new Response(JSON.stringify({ error: "external_ai_not_configured", fallback: "local" }), { status: 503, headers: cors });

    const system = `You are WAB-TKD Broadcast Design AI. Return ONLY valid JSON:
{"actions":[{"type":"move|scale|style|bind|show|hide|duplicate|align|group","target":"layer-name-or-id","value":{}}],"message":"short explanation"}.
Never modify match score, timer, winner, player database, or tournament state. Design-only commands. Canvas is 1920x1080.`;

    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, temperature: 0.1, messages: [{ role: "system", content: system }, { role: "user", content: prompt }], response_format: { type: "json_object" } }),
    });
    const data = await upstream.json();
    if (!upstream.ok) return new Response(JSON.stringify({ error: "ai_provider_error", detail: data?.error?.message || "Provider request failed" }), { status: 502, headers: cors });
    const content = data?.choices?.[0]?.message?.content || "{}";
    let parsed: unknown = {};
    try { parsed = JSON.parse(content); } catch { parsed = { actions: [], message: content }; }
    return new Response(JSON.stringify(parsed), { status: 200, headers: cors });
  } catch (error) {
    return new Response(JSON.stringify({ error: "invalid_request", detail: String(error) }), { status: 400, headers: cors });
  }
});
