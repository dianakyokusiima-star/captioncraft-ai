// api/verify-license.js
// Vercel Serverless Function — runs at /api/verify-license
// No extra server needed. Vercel hosts this for free.

export default function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // CORS — allow your frontend domain
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const { licenseKey } = req.body;

  if (!licenseKey || typeof licenseKey !== "string") {
    return res.status(400).json({ valid: false, error: "No license key provided." });
  }

  // License key registry
  // Format: KEY -> { plan, email, expiresAt (null = lifetime) }
  // Add keys here when someone pays on Payhip/Stripe
  // In future: replace this with a real database (PlanetScale, Supabase, etc.)
  const LICENSE_KEYS = {
    // PRO KEYS — $9/month
    // Generate these with: Math.random().toString(36).substring(2,10).toUpperCase()
    "PRO-DEMO-2026": { plan: "pro", email: "demo@example.com", expiresAt: null },
    "PRO-KYOK-TEST": { plan: "pro", email: "kyokusiima@example.com", expiresAt: null },

    // BUSINESS KEYS — $19/month
    "BIZ-DEMO-2026": { plan: "business", email: "demo@example.com", expiresAt: null },

    // Add more keys here as people buy:
    // "PRO-XXXX-XXXX": { plan: "pro", email: "buyer@email.com", expiresAt: null },
  };

  const cleaned = licenseKey.trim().toUpperCase();
  const entry = LICENSE_KEYS[cleaned];

  if (!entry) {
    return res.status(200).json({ valid: false, error: "Invalid license key. Please check and try again." });
  }

  // Check expiry if set
  if (entry.expiresAt && new Date() > new Date(entry.expiresAt)) {
    return res.status(200).json({ valid: false, error: "This license key has expired. Please renew your subscription." });
  }

  return res.status(200).json({
    valid: true,
    plan: entry.plan,
    message: `Welcome! Your ${entry.plan.charAt(0).toUpperCase() + entry.plan.slice(1)} plan is now active.`,
  });
}
