// api/generate.js
// Vercel Serverless Function — runs at /api/generate
// This proxies the Anthropic API so your API key NEVER goes to the browser.
// The frontend calls /api/generate, this calls Anthropic with the secret key.

const SYSTEM_PROMPTS = {
  kdp: `You are an expert Amazon KDP book marketer. Generate a compelling, SEO-optimized book description (150-200 words) that: opens with a hook, identifies the reader's pain point, presents the book as the solution, includes 3 key benefits/takeaways, and ends with a strong call to action. Format with short paragraphs. Do not use markdown headers.`,
  payhip: `You are a digital product copywriter. Generate a persuasive Payhip product description (120-160 words) that: hooks with the transformation the product delivers, lists 4-5 specific things included, clarifies who it's for, and ends with urgency. Keep it scannable and conversion-focused.`,
  instagram: `You are a social media strategist. Generate an engaging Instagram caption (80-120 words) that: opens with a scroll-stopping first line, delivers value or emotion in the body, uses 2-3 relevant hashtags naturally embedded, and ends with a question or CTA. Do not use markdown.`,
  tiktok: `You are a TikTok content strategist. Generate a punchy TikTok caption (40-60 words) with: a strong hook in the first 5 words, the key message, and 5-8 relevant hashtags. Make it feel native to TikTok's fast-paced culture.`,
  amazon: `You are an Amazon listing specialist. Generate exactly 5 Amazon product bullet points. Each bullet: starts with a bold benefit keyword in ALL CAPS, followed by a dash, then a 15-20 word explanation of the feature/benefit. Focus on customer outcomes.`,
  email: `You are an email marketing specialist. Generate exactly 5 different email subject lines for this product/topic. Number them 1-5. Vary the styles: one curiosity gap, one benefit-led, one question, one urgency/scarcity, one personalization. Keep each under 50 characters.`,
  pinterest: `You are a Pinterest SEO expert. Generate an optimized Pinterest pin description (100-150 words) that: opens with the primary keyword naturally, describes what the pin delivers, includes secondary keywords woven naturally, and ends with a soft CTA.`,
  youtube: `You are a YouTube SEO strategist. Generate an optimized YouTube video description (150-200 words) that: opens with the hook/value prop in the first 2 lines, includes the main keyword 2-3 times naturally, lists what viewers will learn, and ends with a subscribe CTA. Add 5 relevant hashtags at the bottom.`,
};

// Plan permissions — which output types each plan can access
const PLAN_PERMISSIONS = {
  free: ["kdp", "payhip", "instagram"],
  pro: ["kdp", "payhip", "instagram", "tiktok", "amazon", "email", "pinterest", "youtube"],
  business: ["kdp", "payhip", "instagram", "tiktok", "amazon", "email", "pinterest", "youtube"],
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const { outputType, tone, input, plan = "free" } = req.body;

  // Validate inputs
  if (!input || !outputType) {
    return res.status(400).json({ error: "Missing input or output type." });
  }

  // Check plan permissions
  const allowed = PLAN_PERMISSIONS[plan] || PLAN_PERMISSIONS.free;
  if (!allowed.includes(outputType)) {
    return res.status(403).json({ error: "This output type requires a Pro plan.", requiresUpgrade: true });
  }

  const systemPrompt = SYSTEM_PROMPTS[outputType];
  if (!systemPrompt) {
    return res.status(400).json({ error: "Invalid output type." });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // API key stored in Vercel env vars — never exposed to browser
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: `Product/Topic: ${input}\nTone: ${tone || "Professional"}\n\nGenerate the output now. Do not add any preamble like "Here is your..." — go straight to the content.`,
        }],
      }),
    });

    const data = await response.json();

    if (data.content?.[0]?.text) {
      return res.status(200).json({ result: data.content[0].text });
    }

    return res.status(500).json({ error: "No response from AI. Please try again." });
  } catch (err) {
    console.error("Anthropic API error:", err);
    return res.status(500).json({ error: "AI generation failed. Please try again." });
  }
}
