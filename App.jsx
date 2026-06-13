import { useState, useEffect } from "react";

const PLANS = {
  free: { label: "Free", dailyLimit: 3, price: 0 },
  pro: { label: "Pro", dailyLimit: 999, price: 9 },
  business: { label: "Business", dailyLimit: 999, price: 19 },
};

const OUTPUT_TYPES = [
  { value: "kdp",       label: "KDP Book Description",        icon: "ti-book",        pro: false },
  { value: "payhip",    label: "Payhip Product Description",  icon: "ti-shopping-bag",pro: false },
  { value: "instagram", label: "Instagram Caption",           icon: "ti-camera",      pro: false },
  { value: "tiktok",    label: "TikTok Caption",              icon: "ti-music",       pro: true  },
  { value: "amazon",    label: "Amazon Listing Bullets",      icon: "ti-package",     pro: true  },
  { value: "email",     label: "Email Subject Lines (5x)",    icon: "ti-mail",        pro: true  },
  { value: "pinterest", label: "Pinterest Description",       icon: "ti-pin",         pro: true  },
  { value: "youtube",   label: "YouTube Description",         icon: "ti-player-play", pro: true  },
];

const TONES = ["Professional", "Conversational", "Bold & Punchy", "Warm & Inspiring", "Minimalist"];

export default function App() {
  const [plan, setPlan]               = useState("free");
  const [usageToday, setUsageToday]   = useState(0);
  const [outputType, setOutputType]   = useState("kdp");
  const [tone, setTone]               = useState("Professional");
  const [input, setInput]             = useState("");
  const [result, setResult]           = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [copied, setCopied]           = useState(false);
  const [view, setView]               = useState("app");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason]       = useState("");

  // License key activation state
  const [licenseKey, setLicenseKey]       = useState("");
  const [licenseLoading, setLicenseLoading] = useState(false);
  const [licenseMsg, setLicenseMsg]         = useState({ text: "", ok: true });

  // Load saved plan + usage from localStorage on mount
  useEffect(() => {
    const today = new Date().toDateString();
    const stored = JSON.parse(localStorage.getItem("cc_usage") || "{}");
    if (stored.date === today) setUsageToday(stored.count || 0);
    else localStorage.setItem("cc_usage", JSON.stringify({ date: today, count: 0 }));

    const savedPlan = localStorage.getItem("cc_plan") || "free";
    setPlan(savedPlan);
  }, []);

  const trackUsage = () => {
    const today = new Date().toDateString();
    const n = usageToday + 1;
    setUsageToday(n);
    localStorage.setItem("cc_usage", JSON.stringify({ date: today, count: n }));
  };

  // Verify license key against backend
  const handleActivateLicense = async () => {
    if (!licenseKey.trim()) {
      setLicenseMsg({ text: "Please enter a license key.", ok: false });
      return;
    }
    setLicenseLoading(true);
    setLicenseMsg({ text: "", ok: true });
    try {
      const res = await fetch("/api/verify-license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: licenseKey.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setPlan(data.plan);
        localStorage.setItem("cc_plan", data.plan);
        setLicenseMsg({ text: data.message, ok: true });
        setLicenseKey("");
      } else {
        setLicenseMsg({ text: data.error || "Invalid key.", ok: false });
      }
    } catch {
      setLicenseMsg({ text: "Could not verify key. Check your connection.", ok: false });
    }
    setLicenseLoading(false);
  };

  const selectedType  = OUTPUT_TYPES.find((t) => t.value === outputType);
  const isProLocked   = selectedType?.pro && plan === "free";
  const isLimitReached = plan === "free" && usageToday >= PLANS.free.dailyLimit;
  const remaining     = Math.max(0, PLANS.free.dailyLimit - usageToday);

  const handleGenerate = async () => {
    if (!input.trim()) { setError("Please describe your product or topic first."); return; }
    if (isProLocked) {
      setUpgradeReason(`${selectedType.label} is a Pro feature.`);
      setShowUpgradeModal(true);
      return;
    }
    if (isLimitReached) {
      setUpgradeReason("You've used all 3 free generations today.");
      setShowUpgradeModal(true);
      return;
    }
    setLoading(true);
    setError("");
    setResult("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputType, tone, input, plan }),
      });
      const data = await res.json();
      if (data.result) {
        setResult(data.result);
        trackUsage();
      } else if (data.requiresUpgrade) {
        setUpgradeReason(data.error);
        setShowUpgradeModal(true);
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Connection error. Please try again.");
    }
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Styles ─────────────────────────────────────────────────────────────────
  const card  = { background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1.25rem" };
  const label = { fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 8, display: "block" };
  const btn   = (active) => ({ padding: "9px 14px", fontSize: 13, fontWeight: active ? 500 : 400, border: active ? "2px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: active ? "var(--color-background-info)" : "var(--color-background-primary)", color: active ? "var(--color-text-info)" : "var(--color-text-primary)", cursor: "pointer" });

  return (
    <div style={{ fontFamily: "var(--font-sans)", maxWidth: 720, margin: "0 auto", padding: "1.5rem 1rem", color: "var(--color-text-primary)" }}>
      <h2 className="sr-only" style={{ position:"absolute",width:1,height:1,overflow:"hidden" }}>CaptionCraft AI — Caption and Description Generator</h2>

      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem", borderBottom:"0.5px solid var(--color-border-tertiary)", paddingBottom:"1rem" }}>
        <div>
          <div style={{ fontSize:22, fontWeight:500 }}>CaptionCraft AI</div>
          <div style={{ fontSize:13, color:"var(--color-text-secondary)" }}>Descriptions that convert — for authors & digital creators</div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ fontSize:12, padding:"3px 10px", borderRadius:"var(--border-radius-md)", background: plan==="free" ? "var(--color-background-secondary)" : "var(--color-background-info)", color: plan==="free" ? "var(--color-text-secondary)" : "var(--color-text-info)", border:"0.5px solid var(--color-border-tertiary)" }}>
            {PLANS[plan].label} plan
          </span>
          <button onClick={() => setView(view==="pricing" ? "app" : "pricing")} style={{ fontSize:13, padding:"4px 12px", border:"0.5px solid var(--color-border-secondary)", borderRadius:"var(--border-radius-md)", background:"transparent", cursor:"pointer", color:"var(--color-text-primary)" }}>
            {view==="pricing" ? "← Back" : "Upgrade"}
          </button>
        </div>
      </div>

      {/* ── Nav ── */}
      <div style={{ display:"flex", gap:4, marginBottom:"1.5rem" }}>
        {[["app","Generator"],["pricing","Pricing"],["activate","Activate License"],["privacy","Privacy"]].map(([v,l]) => (
          <button key={v} onClick={() => setView(v)} style={{ fontSize:13, padding:"5px 14px", border:"0.5px solid var(--color-border-tertiary)", borderRadius:"var(--border-radius-md)", background: view===v ? "var(--color-background-secondary)" : "transparent", cursor:"pointer", color: view===v ? "var(--color-text-primary)" : "var(--color-text-secondary)", fontWeight: view===v ? 500 : 400 }}>
            {l}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════
          GENERATOR VIEW
      ═══════════════════════════════════════════════════ */}
      {view === "app" && (
        <div>
          {plan === "free" && (
            <div style={{ background:"var(--color-background-secondary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:"var(--border-radius-md)", padding:"10px 14px", marginBottom:"1.25rem", fontSize:13, color:"var(--color-text-secondary)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span><i className="ti ti-bolt" aria-hidden="true" style={{ fontSize:14, marginRight:4 }}></i>{remaining} free generation{remaining!==1?"s":""} left today</span>
              <button onClick={() => setView("pricing")} style={{ fontSize:12, color:"var(--color-text-info)", background:"none", border:"none", cursor:"pointer", padding:0 }}>Upgrade for unlimited →</button>
            </div>
          )}

          {/* Output type */}
          <div style={{ marginBottom:"1.25rem" }}>
            <span style={label}>Output type</span>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:8 }}>
              {OUTPUT_TYPES.map((t) => {
                const locked   = t.pro && plan==="free";
                const selected = outputType===t.value;
                return (
                  <button key={t.value} onClick={() => setOutputType(t.value)} style={{ ...btn(selected), textAlign:"left", opacity: locked ? 0.6 : 1, position:"relative" }}>
                    <i className={`ti ${t.icon}`} aria-hidden="true" style={{ fontSize:14, marginRight:6 }}></i>
                    <span style={{ fontSize:12 }}>{t.label}</span>
                    {locked && <div style={{ fontSize:10, color:"var(--color-text-warning)", marginTop:3 }}>Pro only — activate key</div>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tone */}
          <div style={{ marginBottom:"1.25rem" }}>
            <span style={label}>Tone</span>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {TONES.map((t) => (
                <button key={t} onClick={() => setTone(t)} style={{ fontSize:12, padding:"5px 12px", border: tone===t ? "2px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)", borderRadius:20, background: tone===t ? "var(--color-background-info)" : "transparent", color: tone===t ? "var(--color-text-info)" : "var(--color-text-secondary)", cursor:"pointer", fontWeight: tone===t ? 500 : 400 }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div style={{ marginBottom:"1.25rem" }}>
            <span style={label}>Describe your product or topic</span>
            <textarea value={input} onChange={(e) => setInput(e.target.value)}
              placeholder={outputType==="kdp"
                ? "e.g. A self-help book for women who struggle with self-worth and setting boundaries..."
                : "e.g. A Canva template pack with 30 social media designs for coaches..."}
              style={{ width:"100%", minHeight:90, padding:"10px 12px", border:"0.5px solid var(--color-border-secondary)", borderRadius:"var(--border-radius-md)", fontSize:14, fontFamily:"var(--font-sans)", resize:"vertical", background:"var(--color-background-primary)", color:"var(--color-text-primary)", boxSizing:"border-box" }}
            />
          </div>

          {error && (
            <div style={{ fontSize:13, color:"var(--color-text-danger)", marginBottom:12, padding:"8px 12px", background:"var(--color-background-danger)", borderRadius:"var(--border-radius-md)", border:"0.5px solid var(--color-border-danger)" }}>
              <i className="ti ti-alert-circle" aria-hidden="true" style={{ marginRight:6 }}></i>{error}
            </div>
          )}

          <button onClick={handleGenerate} disabled={loading} style={{ width:"100%", padding:"12px", fontSize:15, fontWeight:500, border:"0.5px solid var(--color-border-secondary)", borderRadius:"var(--border-radius-lg)", background: loading ? "var(--color-background-secondary)" : "var(--color-background-primary)", cursor: loading ? "not-allowed" : "pointer", color:"var(--color-text-primary)", marginBottom:"1.25rem" }}>
            {loading
              ? <span><i className="ti ti-loader" aria-hidden="true" style={{ marginRight:6 }}></i>Generating...</span>
              : <span><i className="ti ti-sparkles" aria-hidden="true" style={{ marginRight:6 }}></i>Generate {selectedType?.label || "Copy"}</span>
            }
          </button>

          {/* Result */}
          {result && (
            <div style={{ ...card, overflow:"hidden", padding:0 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", borderBottom:"0.5px solid var(--color-border-tertiary)", background:"var(--color-background-secondary)" }}>
                <span style={{ fontSize:13, fontWeight:500, color:"var(--color-text-secondary)" }}>
                  <i className="ti ti-check" aria-hidden="true" style={{ color:"var(--color-text-success)", marginRight:6 }}></i>Your generated copy
                </span>
                <button onClick={handleCopy} style={{ fontSize:12, padding:"4px 12px", border:"0.5px solid var(--color-border-secondary)", borderRadius:"var(--border-radius-md)", background: copied ? "var(--color-background-success)" : "var(--color-background-primary)", color: copied ? "var(--color-text-success)" : "var(--color-text-primary)", cursor:"pointer" }}>
                  <i className={`ti ${copied ? "ti-check" : "ti-copy"}`} aria-hidden="true" style={{ marginRight:4 }}></i>{copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div style={{ padding:"1rem 1.25rem", fontSize:14, lineHeight:1.8, whiteSpace:"pre-wrap", color:"var(--color-text-primary)" }}>{result}</div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          ACTIVATE LICENSE VIEW
      ═══════════════════════════════════════════════════ */}
      {view === "activate" && (
        <div>
          <div style={{ ...card, marginBottom:"1rem" }}>
            <div style={{ fontSize:16, fontWeight:500, marginBottom:6 }}>
              <i className="ti ti-key" aria-hidden="true" style={{ marginRight:8 }}></i>Activate your license
            </div>
            <div style={{ fontSize:13, color:"var(--color-text-secondary)", marginBottom:"1.25rem", lineHeight:1.7 }}>
              After purchasing on Payhip, you'll receive a license key by email. Enter it below to unlock your plan instantly. Your plan is verified against our backend — no browser tricks.
            </div>

            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              <input
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                onKeyDown={(e) => e.key==="Enter" && handleActivateLicense()}
                placeholder="e.g. PRO-XXXX-XXXX"
                style={{ flex:1, padding:"9px 12px", border:"0.5px solid var(--color-border-secondary)", borderRadius:"var(--border-radius-md)", fontSize:14, fontFamily:"var(--font-mono)", background:"var(--color-background-primary)", color:"var(--color-text-primary)" }}
              />
              <button onClick={handleActivateLicense} disabled={licenseLoading} style={{ padding:"9px 18px", fontSize:13, fontWeight:500, border:"0.5px solid var(--color-border-info)", borderRadius:"var(--border-radius-md)", background:"var(--color-background-info)", color:"var(--color-text-info)", cursor: licenseLoading ? "not-allowed" : "pointer" }}>
                {licenseLoading ? "Checking..." : "Activate"}
              </button>
            </div>

            {licenseMsg.text && (
              <div style={{ fontSize:13, padding:"8px 12px", borderRadius:"var(--border-radius-md)", background: licenseMsg.ok ? "var(--color-background-success)" : "var(--color-background-danger)", color: licenseMsg.ok ? "var(--color-text-success)" : "var(--color-text-danger)", border: `0.5px solid ${licenseMsg.ok ? "var(--color-border-success)" : "var(--color-border-danger)"}` }}>
                <i className={`ti ${licenseMsg.ok ? "ti-check" : "ti-alert-circle"}`} aria-hidden="true" style={{ marginRight:6 }}></i>
                {licenseMsg.text}
              </div>
            )}
          </div>

          <div style={{ ...card, fontSize:13, color:"var(--color-text-secondary)", lineHeight:1.8 }}>
            <div style={{ fontWeight:500, color:"var(--color-text-primary)", marginBottom:6 }}>Current plan: <span style={{ color:"var(--color-text-info)" }}>{PLANS[plan].label}</span></div>
            {plan === "free" && <div>You're on the free plan (3 generations/day, 3 output types). <button onClick={() => setView("pricing")} style={{ color:"var(--color-text-info)", background:"none", border:"none", cursor:"pointer", padding:0, fontSize:13 }}>See upgrade options →</button></div>}
            {plan !== "free" && <div style={{ color:"var(--color-text-success)" }}><i className="ti ti-circle-check" aria-hidden="true" style={{ marginRight:6 }}></i>Your Pro plan is active. All features unlocked.</div>}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          PRICING VIEW
      ═══════════════════════════════════════════════════ */}
      {view === "pricing" && (
        <div>
          <div style={{ fontSize:18, fontWeight:500, marginBottom:4 }}>Simple, honest pricing</div>
          <div style={{ fontSize:14, color:"var(--color-text-secondary)", marginBottom:"1.5rem" }}>Start free. Upgrade when you need more. Pay once, use forever.</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:12, marginBottom:"1.5rem" }}>
            {[
              { key:"free",     name:"Free",     price:"$0",  period:"forever",  highlight:false, features:["3 generations per day","KDP, Payhip & Instagram","All 5 tones","Copy to clipboard"] },
              { key:"pro",      name:"Pro",       price:"$9",  period:"/month",   highlight:true,  features:["Unlimited generations","All 8 output types","TikTok, Amazon, Email, Pinterest, YouTube","Backend plan verification","Priority generation"] },
              { key:"business", name:"Business",  price:"$19", period:"/month",   highlight:false, features:["Everything in Pro","Team license key","API access ready","White-label option","Priority email support"] },
            ].map((p) => (
              <div key={p.key} style={{ ...card, border: p.highlight ? "2px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)", position:"relative" }}>
                {p.highlight && <div style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)", fontSize:11, padding:"3px 10px", background:"var(--color-background-info)", color:"var(--color-text-info)", borderRadius:20, border:"0.5px solid var(--color-border-info)", whiteSpace:"nowrap" }}>Most popular</div>}
                <div style={{ fontSize:16, fontWeight:500, marginBottom:4 }}>{p.name}</div>
                <div style={{ marginBottom:"1rem" }}>
                  <span style={{ fontSize:24, fontWeight:500 }}>{p.price}</span>
                  <span style={{ fontSize:13, color:"var(--color-text-secondary)" }}>{p.period}</span>
                </div>
                <ul style={{ listStyle:"none", padding:0, margin:"0 0 1.25rem", fontSize:13, lineHeight:2.2 }}>
                  {p.features.map((f) => <li key={f} style={{ color:"var(--color-text-secondary)" }}><i className="ti ti-check" aria-hidden="true" style={{ color:"var(--color-text-success)", marginRight:6 }}></i>{f}</li>)}
                </ul>
                {p.key === "free"
                  ? <div style={{ fontSize:12, color:"var(--color-text-secondary)", textAlign:"center", padding:"8px 0" }}>{plan==="free" ? "Your current plan" : "Downgrade by clearing plan"}</div>
                  : <a href={p.key==="pro" ? "https://payhip.com/AmiisukyokCreatives" : "https://payhip.com/AmiisukyokCreatives"} target="_blank" rel="noopener noreferrer" style={{ display:"block", width:"100%", padding:"9px", fontSize:13, fontWeight:500, border: p.highlight ? "0.5px solid var(--color-border-info)" : "0.5px solid var(--color-border-secondary)", borderRadius:"var(--border-radius-md)", background: p.highlight ? "var(--color-background-info)" : "var(--color-background-secondary)", color: p.highlight ? "var(--color-text-info)" : "var(--color-text-primary)", cursor:"pointer", textAlign:"center", textDecoration:"none" }}>
                    {plan===p.key ? "Current plan" : `Buy ${p.name} on Payhip`}
                  </a>
                }
              </div>
            ))}
          </div>
          <div style={{ ...card, fontSize:13, color:"var(--color-text-secondary)", lineHeight:1.8 }}>
            <i className="ti ti-info-circle" aria-hidden="true" style={{ marginRight:6 }}></i>
            After purchase on Payhip, go to <strong style={{ color:"var(--color-text-primary)" }}>Activate License</strong> tab and enter your key to unlock instantly. Keys are verified by our backend — secure and instant.
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          PRIVACY VIEW
      ═══════════════════════════════════════════════════ */}
      {view === "privacy" && (
        <div style={{ lineHeight:1.8, fontSize:14 }}>
          <div style={{ fontSize:18, fontWeight:500, marginBottom:6 }}>Privacy Policy</div>
          <div style={{ fontSize:12, color:"var(--color-text-secondary)", marginBottom:"1.5rem" }}>Last updated: June 2026 · Amiisukyok Creatives</div>
          {[
            ["What we collect", "We collect only what's needed to operate this service. Your product descriptions are sent to the Anthropic Claude API to generate copy, and are not stored on our servers after your session. If you activate a license, only your key is verified — no personal data is stored on our backend."],
            ["How your data is used", "Inputs are processed solely to generate your requested copy. We do not sell, share, or rent your data to third parties. Your plan tier and daily usage count are stored locally on your device using browser localStorage only."],
            ["API key security", "Your Anthropic API key is stored as a Vercel environment variable and never exposed to the browser. All AI generation goes through our secure backend endpoint (/api/generate)."],
            ["Cookies and local storage", "This app uses browser localStorage to remember your plan tier and daily usage. No tracking cookies, analytics, or advertising trackers are used."],
            ["Payments", "Payments are processed by Payhip. We never see or store your card details. Your billing information is governed by Payhip's privacy policy."],
            ["Your rights", "You can clear all local data at any time by clearing your browser's localStorage. To request deletion of any account data, email privacy@amiisukyokcreatives.com within 30 days."],
            ["Contact", "Privacy questions? Email privacy@amiisukyokcreatives.com or visit kyokusiimadiana.com."],
          ].map(([title, body]) => (
            <div key={title} style={{ marginBottom:"1.25rem", paddingBottom:"1.25rem", borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
              <div style={{ fontSize:15, fontWeight:500, marginBottom:6 }}>{title}</div>
              <div style={{ color:"var(--color-text-secondary)" }}>{body}</div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          UPGRADE MODAL
      ═══════════════════════════════════════════════════ */}
      {showUpgradeModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"var(--color-background-primary)", borderRadius:"var(--border-radius-lg)", padding:"1.5rem", maxWidth:380, width:"90%", border:"0.5px solid var(--color-border-secondary)" }}>
            <div style={{ fontSize:17, fontWeight:500, marginBottom:8 }}>Upgrade to continue</div>
            <div style={{ fontSize:14, color:"var(--color-text-secondary)", marginBottom:"1.25rem", lineHeight:1.6 }}>{upgradeReason} Get Pro for unlimited generations and all 8 output types.</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:"1rem" }}>
              <a href="https://payhip.com/AmiisukyokCreatives" target="_blank" rel="noopener noreferrer" style={{ display:"block", padding:"10px", fontSize:14, fontWeight:500, border:"0.5px solid var(--color-border-info)", borderRadius:"var(--border-radius-md)", background:"var(--color-background-info)", color:"var(--color-text-info)", cursor:"pointer", textAlign:"center", textDecoration:"none" }}>
                Buy Pro on Payhip — $9/month
              </a>
              <button onClick={() => { setShowUpgradeModal(false); setView("activate"); }} style={{ padding:"10px", fontSize:13, border:"0.5px solid var(--color-border-secondary)", borderRadius:"var(--border-radius-md)", background:"transparent", cursor:"pointer", color:"var(--color-text-secondary)" }}>
                I already have a key — Activate it
              </button>
            </div>
            <button onClick={() => setShowUpgradeModal(false)} style={{ width:"100%", fontSize:13, color:"var(--color-text-secondary)", background:"none", border:"none", cursor:"pointer", padding:"4px 0" }}>
              Continue with free plan
            </button>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ marginTop:"2rem", paddingTop:"1rem", borderTop:"0.5px solid var(--color-border-tertiary)", display:"flex", justifyContent:"space-between", fontSize:12, color:"var(--color-text-secondary)" }}>
        <span>© 2026 CaptionCraft AI · Amiisukyok Creatives</span>
        <div style={{ display:"flex", gap:12 }}>
          <button onClick={() => setView("privacy")} style={{ fontSize:12, color:"var(--color-text-secondary)", background:"none", border:"none", cursor:"pointer", padding:0 }}>Privacy</button>
          <button onClick={() => setView("pricing")} style={{ fontSize:12, color:"var(--color-text-secondary)", background:"none", border:"none", cursor:"pointer", padding:0 }}>Pricing</button>
          <button onClick={() => setView("activate")} style={{ fontSize:12, color:"var(--color-text-secondary)", background:"none", border:"none", cursor:"pointer", padding:0 }}>Activate</button>
        </div>
      </div>
    </div>
  );
}
