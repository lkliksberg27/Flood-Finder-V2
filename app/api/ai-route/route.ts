import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

interface RouteInput {
  label: string;
  distance: number;
  duration: number;
  floodLevel: "none" | "moderate" | "severe";
  nearbySensors: string[];
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const { routes, startAddress, endAddress }: {
    routes: RouteInput[];
    startAddress: string;
    endAddress: string;
  } = await req.json();

  const client = new Anthropic({ apiKey });

  const routeSummaries = routes.map((r, i) => ({
    routeIndex: i,
    label: r.label,
    distanceMiles: parseFloat((r.distance / 1609.34).toFixed(1)),
    durationMinutes: Math.round(r.duration / 60),
    floodLevel: r.floodLevel,
    floodSensorsNearby: r.nearbySensors.length,
  }));

  const prompt = `You are an AI flood safety routing assistant embedded in Flood Finder, a real-time flood navigation app.

The user needs to travel from "${startAddress.split(",")[0]}" to "${endAddress.split(",")[0]}".

Here are the ${routes.length} available route alternatives:
${JSON.stringify(routeSummaries, null, 2)}

Flood level definitions:
- "none" = no flood sensors triggered along this route
- "moderate" = WARNING-level sensors nearby (elevated water, caution advised)
- "severe" = ALERT-level sensors (active flooding, dangerous road conditions)

Your job: analyze safety vs speed trade-offs and rank these routes.

Respond with ONLY a valid JSON object — no markdown, no explanation outside the JSON:
{
  "rankings": [
    {
      "routeIndex": 0,
      "safetyScore": 94,
      "badge": "AI PICK",
      "shortReason": "Fastest and completely clear"
    }
  ],
  "recommendation": "Write 2-3 natural, confident sentences recommending the best route. Mention specific conditions and time differences if relevant.",
  "overallCondition": "clear"
}

Rules:
- safetyScore: integer 0-100 (100 = perfectly safe, 0 = severe active flooding)
- badge must be one of: "AI PICK", "SAFEST", "FASTEST", "CAUTION", "AVOID"
- Assign exactly one "AI PICK" to the best overall route (balance safety + time)
- overallCondition: "clear", "moderate", or "severe"
- shortReason: max 6 words, no punctuation
- Include ALL routes in rankings array`;

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("No text response");

    // Strip any accidental markdown code fences
    const cleaned = textBlock.text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("AI route analysis error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
