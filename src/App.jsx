import { useState, useRef, useEffect } from "react";

// ── constants ──────────────────────────────────────────────────────────────────
const MODEL = "claude-sonnet-4-5";

const NICHES = [
  "E-commerce Stores", "SaaS Companies", "Real Estate Agencies",
  "Law Firms", "Medical Clinics", "Dental Offices", "Gyms & Fitness Studios",
  "Restaurants & Cafés", "Online Coaches & Consultants", "Digital Marketing Agencies",
  "Accounting & CPA Firms", "Insurance Agencies", "Mortgage Brokers",
  "Recruitment & HR Firms", "IT & Tech Startups", "Photography Studios",
  "Interior Design Firms", "Construction Companies", "Logistics & Freight",
  "Education & eLearning Platforms",
];

const SERVICES = [
  "Web Design & Development", "SEO & Content Marketing", "Social Media Management",
  "Google & Facebook Ads", "Email Marketing Automation", "Video Production & Editing",
  "Branding & Logo Design", "Mobile App Development", "CRM & Sales Automation",
  "Chatbot Development", "Shopify / WooCommerce Setup", "WordPress Development",
  "Lead Generation Systems", "Business Process Automation", "Data Analytics & Reporting",
  "Virtual Assistant Services", "Copywriting & Content Creation", "LinkedIn Outreach",
  "Podcast Production", "E-learning Course Creation",
];

const COUNTRIES = [
  { name: "United States", code: "US", flag: "🇺🇸", tier: "premium" },
  { name: "United Kingdom", code: "GB", flag: "🇬🇧", tier: "premium" },
  { name: "Canada", code: "CA", flag: "🇨🇦", tier: "premium" },
  { name: "Australia", code: "AU", flag: "🇦🇺", tier: "premium" },
  { name: "Germany", code: "DE", flag: "🇩🇪", tier: "premium" },
  { name: "Netherlands", code: "NL", flag: "🇳🇱", tier: "premium" },
  { name: "Singapore", code: "SG", flag: "🇸🇬", tier: "premium" },
  { name: "UAE", code: "AE", flag: "🇦🇪", tier: "premium" },
  { name: "New Zealand", code: "NZ", flag: "🇳🇿", tier: "premium" },
  { name: "Switzerland", code: "CH", flag: "🇨🇭", tier: "premium" },
  { name: "India", code: "IN", flag: "🇮🇳", tier: "growth" },
  { name: "Bangladesh", code: "BD", flag: "🇧🇩", tier: "growth" },
  { name: "Pakistan", code: "PK", flag: "🇵🇰", tier: "growth" },
  { name: "Philippines", code: "PH", flag: "🇵🇭", tier: "growth" },
  { name: "Vietnam", code: "VN", flag: "🇻🇳", tier: "growth" },
  { name: "Indonesia", code: "ID", flag: "🇮🇩", tier: "growth" },
  { name: "Malaysia", code: "MY", flag: "🇲🇾", tier: "growth" },
  { name: "Nigeria", code: "NG", flag: "🇳🇬", tier: "growth" },
  { name: "Kenya", code: "KE", flag: "🇰🇪", tier: "growth" },
  { name: "South Africa", code: "ZA", flag: "🇿🇦", tier: "growth" },
  { name: "Brazil", code: "BR", flag: "🇧🇷", tier: "growth" },
  { name: "Mexico", code: "MX", flag: "🇲🇽", tier: "growth" },
  { name: "Colombia", code: "CO", flag: "🇨🇴", tier: "growth" },
  { name: "France", code: "FR", flag: "🇫🇷", tier: "premium" },
  { name: "Spain", code: "ES", flag: "🇪🇸", tier: "premium" },
  { name: "Italy", code: "IT", flag: "🇮🇹", tier: "premium" },
  { name: "Japan", code: "JP", flag: "🇯🇵", tier: "premium" },
  { name: "South Korea", code: "KR", flag: "🇰🇷", tier: "premium" },
  { name: "Sweden", code: "SE", flag: "🇸🇪", tier: "premium" },
  { name: "Denmark", code: "DK", flag: "🇩🇰", tier: "premium" },
];

const NICHE_COUNTRY_RECOMMENDATIONS = {
  "E-commerce Stores": ["US", "GB", "CA", "AU", "IN"],
  "SaaS Companies": ["US", "GB", "CA", "DE", "SG"],
  "Real Estate Agencies": ["US", "GB", "AU", "AE", "CA"],
  "Law Firms": ["US", "GB", "CA", "AU", "SG"],
  "Medical Clinics": ["US", "GB", "AU", "CA", "AE"],
  "Dental Offices": ["US", "CA", "AU", "GB", "AE"],
  "Gyms & Fitness Studios": ["US", "GB", "CA", "AU", "IN"],
  "Restaurants & Cafés": ["US", "GB", "AU", "CA", "SG"],
  "Online Coaches & Consultants": ["US", "GB", "CA", "AU", "IN"],
  "Digital Marketing Agencies": ["US", "IN", "GB", "PH", "BD"],
  "Accounting & CPA Firms": ["US", "GB", "CA", "AU", "SG"],
  "Insurance Agencies": ["US", "GB", "AU", "IN", "CA"],
  "Mortgage Brokers": ["US", "CA", "AU", "GB", "NZ"],
  "IT & Tech Startups": ["US", "IN", "GB", "SG", "DE"],
  "Photography Studios": ["US", "GB", "AU", "CA", "IN"],
  "Web Design & Development": ["US", "AU", "GB", "CA", "IN"],
};

function getRecommendedCountries(niche) {
  const codes = NICHE_COUNTRY_RECOMMENDATIONS[niche] || ["US", "GB", "CA", "AU", "IN"];
  return codes.map(c => COUNTRIES.find(co => co.code === c)).filter(Boolean);
}

// ── Social Platform Config ────────────────────────────────────────────────────
const SOCIAL_PLATFORMS = [
  {
    key: "linkedin",
    name: "LinkedIn",
    icon: "💼",
    color: "#0077B5",
    bgColor: "#E8F4FD",
    description: "Best for B2B — decision makers, CEOs, founders",
    searchUrl: (niche, country) =>
      `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(niche + " " + country)}&origin=GLOBAL_SEARCH_HEADER`,
    companyUrl: (niche, country) =>
      `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(niche + " " + country)}`,
    outreachTips: [
      "Connect with a personalized note (300 char limit)",
      "Message after connection is accepted",
      "Engage with their posts before pitching",
      "Use Sales Navigator for advanced filters",
    ],
    searchTips: [
      `Search: "[Niche] [Country]" in People tab`,
      "Filter by: 2nd degree connections for warm leads",
      "Filter by: Company size (11–200 for SMBs)",
      "Sort by: Most recent activity",
    ],
  },
  {
    key: "instagram",
    name: "Instagram",
    icon: "📸",
    color: "#E1306C",
    bgColor: "#FDF0F5",
    description: "Great for visual businesses — restaurants, fitness, fashion, real estate",
    searchUrl: (niche) =>
      `https://www.instagram.com/explore/tags/${encodeURIComponent(niche.toLowerCase().replace(/\s+/g, ""))}`,
    outreachTips: [
      "DM after liking/commenting on 2–3 posts",
      "Mention specific content from their profile",
      "Use voice DM for higher open rates",
      "Check their bio for email contact first",
    ],
    searchTips: [
      "Search hashtags: #[niche] #[city]business",
      "Look for accounts with 500–50K followers (sweet spot)",
      "Check 'similar accounts' on competitor profiles",
      "Use location tags to find local businesses",
    ],
  },
  {
    key: "x",
    name: "X (Twitter)",
    icon: "𝕏",
    color: "#14171A",
    bgColor: "#F5F8FA",
    description: "Ideal for SaaS, tech, coaches — founders are very active",
    searchUrl: (niche, country) =>
      `https://twitter.com/search?q=${encodeURIComponent(niche + " " + country + " founder")}&f=user`,
    outreachTips: [
      "Reply to their tweets with value first",
      "Retweet with meaningful comment",
      "DM after 2–3 genuine interactions",
      "Reference a specific tweet in your DM",
    ],
    searchTips: [
      `Search: "[Niche] founder" or "[Niche] CEO"`,
      "Use Advanced Search: min_faves:10 for active users",
      "Check who replies to industry influencers",
      "Search: 'looking for [service]' for warm leads",
    ],
  },
];

// ── helpers ───────────────────────────────────────────────────────────────────
async function callClaude(apiKey, systemPrompt, userPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.content.map((b) => b.text || "").join("");
}

function parseJSON(raw) {
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function buildCalendarLink({ title, description, startISO, durationMins = 60, location = "" }) {
  const fmt = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const start = new Date(startISO);
  const end = new Date(start.getTime() + durationMins * 60000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details: description,
    location,
    dates: `${fmt(start)}/${fmt(end)}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ── Google Sheets Integration ──────────────────────────────────────────────────
async function appendToGoogleSheet(sheetsConfig, rows, sheetName = "Leads") {
  if (!sheetsConfig?.apiKey || !sheetsConfig?.sheetId) throw new Error("Google Sheets API key and Sheet ID are required");
  const range = `${sheetName}!A1`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetsConfig.sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS&key=${sheetsConfig.apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values: rows }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Sheets API error: HTTP ${res.status}`);
  }
  return await res.json();
}

async function initSheetHeaders(sheetsConfig, sheetName, headers) {
  if (!sheetsConfig?.apiKey || !sheetsConfig?.sheetId) return;
  const checkUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetsConfig.sheetId}/values/${encodeURIComponent(sheetName + "!A1")}?key=${sheetsConfig.apiKey}`;
  const checkRes = await fetch(checkUrl);
  if (!checkRes.ok) return;
  const checkData = await checkRes.json();
  if (checkData.values && checkData.values.length > 0) return;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetsConfig.sheetId}/values/${encodeURIComponent(sheetName + "!A1")}?valueInputOption=USER_ENTERED&key=${sheetsConfig.apiKey}`;
  await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values: [headers] }),
  });
}

async function exportLeadsToSheets(sheetsConfig, leads, config) {
  const sheetName = "Leads";
  const headers = ["Timestamp", "Business Name", "Contact", "Email", "Website", "Size", "Pain Point", "Platform", "Niche", "Service", "Country"];
  await initSheetHeaders(sheetsConfig, sheetName, headers);
  const timestamp = new Date().toLocaleString();
  const rows = leads.map(lead => [
    timestamp, lead.name || "", lead.contact || "", lead.email || "",
    lead.website || "", lead.size || "", lead.pain_point || "",
    lead.platform || "Direct", config.niche || "", config.service || "", config.country || "",
  ]);
  return appendToGoogleSheet(sheetsConfig, rows, sheetName);
}

async function exportWorkflowToSheets(sheetsConfig, stages, config) {
  const sheetName = "Workflows";
  const headers = ["Timestamp", "Niche", "Service", "Country", "Company", "Stage", "Status", "Content Preview"];
  await initSheetHeaders(sheetsConfig, sheetName, headers);
  const timestamp = new Date().toLocaleString();
  const stageLabels = { leads: "Lead Research", email: "Outreach Email", followup: "Follow Up", proposal: "Proposal", meeting: "Meeting" };
  const rows = Object.entries(stages).filter(([, v]) => v?.status === "done").map(([key, val]) => {
    const content = Array.isArray(val.result) ? `${val.result.length} leads found` : typeof val.result === "string" ? val.result.substring(0, 200) + "..." : "";
    return [timestamp, config.niche, config.service, config.country, config.companyName || config.yourName, stageLabels[key] || key, "Completed", content];
  });
  return appendToGoogleSheet(sheetsConfig, rows, sheetName);
}

async function saveLeadActionToSheets(sheetsConfig, lead, type, content, config) {
  const sheetName = "Actions";
  const headers = ["Timestamp", "Business Name", "Contact", "Email", "Platform", "Action Type", "Niche", "Service", "Country", "Content Preview"];
  await initSheetHeaders(sheetsConfig, sheetName, headers);
  const timestamp = new Date().toLocaleString();
  const rows = [[timestamp, lead.name, lead.contact, lead.email, lead.platform || "Direct", type, config.niche, config.service, config.country, content.substring(0, 300) + "..."]];
  return appendToGoogleSheet(sheetsConfig, rows, sheetName);
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = ["⚙️ Setup", "🔍 Find Leads", "🚀 Workflow", "👥 Leads", "📅 Meetings", "📊 Data Store"];

const DEFAULT_CONFIG = {
  niche: "E-commerce Stores",
  service: "Web Design & Development",
  country: "United States",
  price: "$500 – $2,000",
  calendlyLink: "",
  yourName: "",
  yourEmail: "",
  companyName: "",
};

const DEFAULT_SHEETS_CONFIG = { apiKey: "", sheetId: "", enabled: false };

const STAGE_KEYS = ["leads", "email", "followup", "proposal", "meeting"];
const STAGE_META = [
  { key: "leads",    icon: "🔍", label: "Lead Research" },
  { key: "email",    icon: "✉️",  label: "Outreach Email" },
  { key: "followup", icon: "🔁", label: "Follow Up" },
  { key: "proposal", icon: "📄", label: "Proposal" },
  { key: "meeting",  icon: "📅", label: "Meeting" },
];

// ── Dropdown ──────────────────────────────────────────────────────────────────
function SearchableDropdown({ label, value, onChange, options, placeholder, renderOption, renderValue, icon }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const filtered = typeof options[0] === "string"
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options.filter(o => (o.name || o).toLowerCase().includes(search.toLowerCase()));
  const displayValue = value ? (renderValue ? renderValue(value) : value) : placeholder;
  return (
    <div className="field" ref={ref}>
      <label>{icon && <span>{icon} </span>}{label}</label>
      <div className="dropdown-wrap">
        <button className="dropdown-trigger" onClick={() => { setOpen(!open); setSearch(""); }}>
          <span className={value ? "dropdown-val" : "dropdown-placeholder"}>{displayValue}</span>
          <span className="dropdown-arrow">{open ? "▲" : "▼"}</span>
        </button>
        {open && (
          <div className="dropdown-menu">
            <div className="dropdown-search-wrap">
              <input autoFocus className="dropdown-search" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="dropdown-list">
              {filtered.length === 0 && <div className="dropdown-empty">No results</div>}
              {filtered.map((opt, i) => {
                const optVal = typeof opt === "string" ? opt : opt.name;
                return (
                  <div key={i} className={`dropdown-item ${value === optVal ? "selected" : ""}`} onClick={() => { onChange(optVal); setOpen(false); }}>
                    {renderOption ? renderOption(opt) : opt}
                    {value === optVal && <span className="dropdown-check">✓</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Country Selector ──────────────────────────────────────────────────────────
function CountrySelector({ value, onChange, niche }) {
  const [mode, setMode] = useState("recommended");
  const recommended = getRecommendedCountries(niche);
  const currentCountry = COUNTRIES.find(c => c.name === value);
  return (
    <div className="field">
      <label>🌍 Target Country</label>
      <div className="country-tabs">
        <button className={`country-tab-btn ${mode === "recommended" ? "active" : ""}`} onClick={() => setMode("recommended")}>⭐ Recommended</button>
        <button className={`country-tab-btn ${mode === "all" ? "active" : ""}`} onClick={() => setMode("all")}>🌐 All Countries</button>
      </div>
      {mode === "recommended" && (
        <div className="country-grid">
          {recommended.map(c => (
            <button key={c.code} className={`country-chip ${value === c.name ? "selected" : ""}`} onClick={() => onChange(c.name)}>
              <span className="country-flag">{c.flag}</span>
              <span className="country-name">{c.name}</span>
              <span className={`country-tier ${c.tier}`}>{c.tier === "premium" ? "💰" : "📈"}</span>
            </button>
          ))}
          <div className="country-legend"><span>💰 Premium market</span><span>📈 Growth market</span></div>
        </div>
      )}
      {mode === "all" && (
        <SearchableDropdown value={value} onChange={onChange} options={COUNTRIES} placeholder="Select country…"
          renderOption={(c) => (<span className="country-option"><span>{c.flag} {c.name}</span><span className={`tier-badge ${c.tier}`}>{c.tier}</span></span>)}
          renderValue={(v) => { const c = COUNTRIES.find(x => x.name === v); return c ? `${c.flag} ${c.name}` : v; }}
        />
      )}
      {currentCountry && (
        <div className="country-selected-info">
          <span>{currentCountry.flag}</span><strong>{currentCountry.name}</strong>
          <span className={`tier-badge ${currentCountry.tier}`}>{currentCountry.tier === "premium" ? "High-budget market" : "Growth market"}</span>
        </div>
      )}
    </div>
  );
}

// ── API Key Banner ────────────────────────────────────────────────────────────
function ApiKeyBanner({ apiKey, setApiKey }) {
  const [draft, setDraft] = useState(apiKey);
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);
  const save = () => { setApiKey(draft.trim()); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  return (
    <div className="api-banner">
      <span className="api-label">🔑 Anthropic API Key</span>
      {apiKey && <span className="api-ok">✓ Key saved (session only)</span>}
      <div className="api-row">
        <input className="api-input" type={show ? "text" : "password"} placeholder="sk-ant-…" value={draft}
          onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
        <button className="btn-ghost" onClick={() => setShow(!show)}>{show ? "🙈" : "👁"}</button>
        <button className="btn-primary" onClick={save}>{saved ? "✓ Saved!" : "Save"}</button>
      </div>
    </div>
  );
}

// ── Setup Tab ─────────────────────────────────────────────────────────────────
function SetupTab({ config, setConfig, sheetsConfig, setSheetsConfig }) {
  const field = (key, label, placeholder, type = "text") => (
    <div className="field">
      <label>{label}</label>
      <input type={type} placeholder={placeholder} value={config[key]} onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.value }))} />
    </div>
  );
  return (
    <div className="setup-wrap">
      <div className="setup-grid">
        <div className="card">
          <h3>🎯 Target Configuration</h3>
          <SearchableDropdown label="Target Niche" icon="🏢" value={config.niche} onChange={(v) => setConfig(c => ({ ...c, niche: v }))} options={NICHES} placeholder="Select your target niche…" />
          <SearchableDropdown label="Your Service" icon="🛠️" value={config.service} onChange={(v) => setConfig(c => ({ ...c, service: v }))} options={SERVICES} placeholder="Select the service you offer…" />
          <CountrySelector value={config.country} onChange={(v) => setConfig(c => ({ ...c, country: v }))} niche={config.niche} />
          {field("price", "💵 Pricing Range", "$500 – $2,000")}
        </div>
        <div className="card">
          <h3>🏢 Your Business Info</h3>
          {field("yourName",    "👤 Your Name",              "Rubel Ahmed")}
          {field("yourEmail",   "📧 Your Email",             "you@example.com", "email")}
          {field("companyName", "🏷️ Company / Agency Name",  "Rubel SBS")}
          {field("calendlyLink","📅 Calendly / Booking Link","https://calendly.com/you")}
        </div>
        <div className="card config-preview">
          <h3>📋 Active Configuration</h3>
          <div className="config-preview-body">
            <div className="config-item"><span className="config-label">Niche</span><span className="tag">{config.niche || "—"}</span></div>
            <div className="config-item"><span className="config-label">Service</span><span className="tag tag-purple">{config.service || "—"}</span></div>
            <div className="config-item"><span className="config-label">Country</span><span className="tag tag-green">{COUNTRIES.find(c => c.name === config.country)?.flag || "🌍"} {config.country || "—"}</span></div>
            <div className="config-item"><span className="config-label">Pricing</span><span className="config-value">{config.price || "—"}</span></div>
            {config.yourName && (<div className="config-item"><span className="config-label">Sender</span><span className="config-value">{config.yourName}{config.companyName ? ` · ${config.companyName}` : ""}</span></div>)}
          </div>
          <p className="hint">Fill out both panels, then go to 🔍 Find Leads to discover prospects across LinkedIn, Instagram & X.</p>
        </div>
      </div>
      <div className="card sheets-card">
        <div className="sheets-header">
          <h3>📊 Google Sheets Data Store</h3>
          <label className="toggle-wrap">
            <input type="checkbox" checked={sheetsConfig.enabled} onChange={e => setSheetsConfig(c => ({ ...c, enabled: e.target.checked }))} />
            <span className="toggle-slider"></span>
            <span className="toggle-label">{sheetsConfig.enabled ? "Enabled" : "Disabled"}</span>
          </label>
        </div>
        <p className="sheets-desc">Automatically save leads, workflow results, and client actions to Google Sheets across 3 tabs: <strong>Leads</strong>, <strong>Workflows</strong>, and <strong>Actions</strong>.</p>
        {sheetsConfig.enabled && (
          <div className="sheets-fields">
            <div className="field">
              <label>🔑 Google Sheets API Key</label>
              <input type="password" placeholder="AIzaSy…" value={sheetsConfig.apiKey} onChange={e => setSheetsConfig(c => ({ ...c, apiKey: e.target.value }))} />
              <span className="field-hint">Get from Google Cloud Console → APIs & Services → Credentials</span>
            </div>
            <div className="field">
              <label>📋 Spreadsheet ID</label>
              <input type="text" placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" value={sheetsConfig.sheetId} onChange={e => setSheetsConfig(c => ({ ...c, sheetId: e.target.value }))} />
              <span className="field-hint">Found in your Google Sheets URL: …spreadsheets/d/<strong>ID</strong>/edit</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Lead Finder Tab ───────────────────────────────────────────────────────────
function LeadFinderTab({ config, apiKey, onLeadsFound }) {
  const [activePlatform, setActivePlatform] = useState("linkedin");
  const [generatedLeads, setGeneratedLeads] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [outreachScript, setOutreachScript] = useState(null);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedLeads, setCopiedLeads] = useState(false);

  const platform = SOCIAL_PLATFORMS.find(p => p.key === activePlatform);

  async function generateLeads() {
    if (!apiKey) { alert("Please enter your Anthropic API key first."); return; }
    setGenerating(true);
    setGeneratedLeads(null);
    try {
      const raw = await callClaude(apiKey,
        "You are a B2B lead research expert for social media platforms. Return ONLY valid JSON, no markdown.",
        `Generate 6 realistic ${config.niche} business leads in ${config.country} that would be found on ${platform.name}.
Each lead should be actively using ${platform.name} and needing ${config.service}.
Return JSON array:
[{
  "name": "Business Name",
  "contact": "Owner/Decision Maker Name",
  "email": "email@example.com",
  "website": "https://...",
  "pain_point": "specific problem they have",
  "size": "small/medium",
  "platform": "${platform.name}",
  "platform_handle": "@handle or profile URL hint",
  "platform_activity": "what they post about / how active",
  "best_approach": "specific opening line for ${platform.name} outreach"
}]`
      );
      const parsed = parseJSON(raw);
      if (!parsed) throw new Error("Could not parse lead data");
      setGeneratedLeads(parsed);
    } catch (e) {
      alert("Error generating leads: " + e.message);
    }
    setGenerating(false);
  }

  async function generateOutreachScript() {
    if (!apiKey || !generatedLeads) return;
    setGeneratingScript(true);
    setOutreachScript(null);
    try {
      const lead = generatedLeads[0];
      const text = await callClaude(apiKey,
        `You are an expert in ${platform.name} outreach and cold messaging for B2B services.`,
        `Write a ${platform.name} outreach sequence for ${config.yourName || "a service provider"} from ${config.companyName || config.service} targeting ${config.niche} in ${config.country}.
Service: ${config.service}. Pricing: ${config.price}.
Example lead: ${lead.name} — Pain point: ${lead.pain_point}.

Write:
1. CONNECTION REQUEST / FOLLOW message (${platform.key === "linkedin" ? "max 300 chars" : "casual, friendly"})
2. FIRST MESSAGE after connected/followed (value-first, no pitch yet)
3. FOLLOW-UP MESSAGE (day 3–5, soft pitch)
4. FINAL MESSAGE (day 7–10, clear CTA with Calendly or reply)

${platform.key === "linkedin" ? "LinkedIn format: professional but human" : platform.key === "instagram" ? "Instagram format: casual, mention their content" : "X format: brief, conversational, reference their tweets"}

Label each message clearly.`
      );
      setOutreachScript(text);
    } catch (e) {
      alert("Error generating script: " + e.message);
    }
    setGeneratingScript(false);
  }

  function useLeadsInWorkflow() {
    if (generatedLeads && onLeadsFound) {
      onLeadsFound(generatedLeads);
      alert(`✅ ${generatedLeads.length} leads from ${platform.name} loaded into Workflow & Leads tabs!`);
    }
  }

  return (
    <div className="lead-finder-wrap">
      <div className="lead-finder-header">
        <h2>🔍 Social Media Lead Finder</h2>
        <p className="sub">Find prospects on LinkedIn, Instagram & X — then generate platform-specific outreach scripts</p>
        <div className="workflow-target-badge">
          {COUNTRIES.find(c => c.name === config.country)?.flag} {config.country} · {config.niche} · {config.service}
        </div>
      </div>

      {/* Platform Selector */}
      <div className="platform-tabs">
        {SOCIAL_PLATFORMS.map(p => (
          <button
            key={p.key}
            className={`platform-tab ${activePlatform === p.key ? "active" : ""}`}
            style={activePlatform === p.key ? { borderColor: p.color, background: p.bgColor, color: p.color } : {}}
            onClick={() => { setActivePlatform(p.key); setGeneratedLeads(null); setOutreachScript(null); }}
          >
            <span className="platform-tab-icon">{p.icon}</span>
            <span className="platform-tab-name">{p.name}</span>
          </button>
        ))}
      </div>

      <div className="lead-finder-body">
        {/* Platform Info Panel */}
        <div className="platform-info-panel" style={{ borderColor: platform.color, background: platform.bgColor }}>
          <div className="platform-info-header" style={{ color: platform.color }}>
            <span className="platform-big-icon">{platform.icon}</span>
            <div>
              <h3 style={{ color: platform.color }}>{platform.name} Lead Finding</h3>
              <p className="platform-desc">{platform.description}</p>
            </div>
          </div>

          <div className="platform-tips-grid">
            <div className="tips-section">
              <div className="tips-title">🔎 Search Strategy</div>
              {platform.searchTips.map((tip, i) => (
                <div key={i} className="tip-item">✦ {tip}</div>
              ))}
            </div>
            <div className="tips-section">
              <div className="tips-title">💬 Outreach Tips</div>
              {platform.outreachTips.map((tip, i) => (
                <div key={i} className="tip-item">✦ {tip}</div>
              ))}
            </div>
          </div>

          <div className="platform-search-links">
            <a href={platform.searchUrl(config.niche, config.country)} target="_blank" rel="noreferrer"
              className="platform-link-btn" style={{ background: platform.color }}>
              🔗 Open {platform.name} Search for "{config.niche}"
            </a>
            {platform.companyUrl && (
              <a href={platform.companyUrl(config.niche, config.country)} target="_blank" rel="noreferrer"
                className="platform-link-btn-outline" style={{ color: platform.color, borderColor: platform.color }}>
                🏢 Search {platform.name} Companies
              </a>
            )}
          </div>
        </div>

        {/* AI Lead Generator */}
        <div className="card ai-lead-gen">
          <div className="ai-lead-gen-header">
            <h3>🤖 AI Lead Generator for {platform.name}</h3>
            <p className="sub">Generate realistic lead profiles to target on {platform.name}</p>
          </div>
          <div className="ai-lead-actions">
            <button className="btn-primary" onClick={generateLeads} disabled={generating}>
              {generating ? `⏳ Finding ${platform.name} leads…` : `${platform.icon} Generate ${platform.name} Leads`}
            </button>
            {generatedLeads && (
              <>
                <button className="btn-secondary" onClick={generateOutreachScript} disabled={generatingScript}>
                  {generatingScript ? "⏳ Writing script…" : "✍️ Generate Outreach Script"}
                </button>
                <button className="btn-success" onClick={useLeadsInWorkflow}>
                  🚀 Use in Full Workflow
                </button>
              </>
            )}
          </div>

          {generatedLeads && (
            <div className="generated-leads-list">
              <div className="gen-leads-header">
                <span>✅ {generatedLeads.length} {platform.name} leads found</span>
                <button className="btn-ghost copy-btn" onClick={() => { navigator.clipboard.writeText(JSON.stringify(generatedLeads, null, 2)); setCopiedLeads(true); setTimeout(() => setCopiedLeads(false), 2000); }}>
                  {copiedLeads ? "✓ Copied!" : "📋 Copy JSON"}
                </button>
              </div>
              {generatedLeads.map((lead, i) => (
                <div key={i} className="social-lead-card">
                  <div className="social-lead-top">
                    <div className="social-lead-identity">
                      <div className="platform-avatar" style={{ background: platform.bgColor, color: platform.color }}>{platform.icon}</div>
                      <div>
                        <strong>{lead.name}</strong>
                        <div className="social-lead-handle">{lead.platform_handle}</div>
                      </div>
                    </div>
                    <span className="tag">{lead.size}</span>
                  </div>
                  <div className="social-lead-details">
                    <div>👤 {lead.contact}</div>
                    <div>📧 {lead.email}</div>
                    <div>🌐 {lead.website}</div>
                    <div>📊 <em>{lead.platform_activity}</em></div>
                  </div>
                  <div className="social-lead-pain">💡 Pain: {lead.pain_point}</div>
                  <div className="social-lead-approach">
                    <span className="approach-label">Best Opening:</span> {lead.best_approach}
                  </div>
                </div>
              ))}
            </div>
          )}

          {outreachScript && (
            <div className="outreach-script-box">
              <div className="outreach-script-header">
                <h4>✉️ {platform.name} Outreach Script</h4>
                <button className="btn-ghost copy-btn" onClick={() => { navigator.clipboard.writeText(outreachScript); setCopiedScript(true); setTimeout(() => setCopiedScript(false), 2000); }}>
                  {copiedScript ? "✓ Copied!" : "📋 Copy Script"}
                </button>
              </div>
              <pre className="result-pre">{outreachScript}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
function ProgressBar({ pct }) {
  return (
    <div className="progress-wrap">
      <div className="progress-bar" style={{ width: `${pct}%` }} />
      <span className="progress-label">{Math.round(pct)}%</span>
    </div>
  );
}

// ── Stage Card ────────────────────────────────────────────────────────────────
function StageCard({ meta, status, result, onView }) {
  const cls = status === "done" ? "stage done" : status === "error" ? "stage error" : status === "running" ? "stage running" : "stage";
  const icon = status === "done" ? "✅" : status === "error" ? "❌" : status === "running" ? "⏳" : meta.icon;
  return (
    <div className={cls} onClick={status === "done" ? onView : undefined} title={status === "done" ? "Click to view" : ""}>
      <span className="stage-icon">{icon}</span>
      <span className="stage-label">{meta.label}</span>
      {status === "done" && <span className="stage-view">View →</span>}
    </div>
  );
}

// ── Workflow Tab ──────────────────────────────────────────────────────────────
function WorkflowTab({ config, apiKey, sheetsConfig, stages, setStages, logs, setLogs, running, setRunning }) {
  const logRef = useRef(null);
  const [modal, setModal] = useState(null);
  const [sheetsSaving, setSheetsSaving] = useState(false);
  const [sheetsStatus, setSheetsStatus] = useState(null);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);

  const log = (msg) => setLogs((l) => [...l, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  const pct = STAGE_KEYS.reduce((acc, k) => acc + (stages[k]?.status === "done" ? 20 : 0), 0);
  const setStage = (key, patch) => setStages((s) => ({ ...s, [key]: { ...s[key], ...patch } }));

  // Check if leads were pre-loaded from the Lead Finder tab
  const preloadedLeads = Array.isArray(stages.leads?.result) ? stages.leads.result : null;

  async function saveToSheets(finalStages) {
    if (!sheetsConfig.enabled || !sheetsConfig.apiKey || !sheetsConfig.sheetId) return;
    setSheetsSaving(true); setSheetsStatus(null);
    try {
      log("📊 Saving workflow data to Google Sheets…");
      if (Array.isArray(finalStages.leads?.result) && finalStages.leads.result.length > 0) {
        await exportLeadsToSheets(sheetsConfig, finalStages.leads.result, config);
        log("✅ Leads saved to Google Sheets");
      }
      await exportWorkflowToSheets(sheetsConfig, finalStages, config);
      log("✅ Workflow summary saved to Google Sheets");
      setSheetsStatus({ ok: true, msg: "All data saved to Google Sheets!" });
    } catch (e) {
      log("⚠️ Sheets save failed: " + e.message);
      setSheetsStatus({ ok: false, msg: e.message });
    }
    setSheetsSaving(false);
  }

  async function runAll() {
    if (!apiKey) { alert("Please enter your Anthropic API key first."); return; }
    setRunning(true); setLogs([]); setSheetsStatus(null);
    const freshStages = { leads: {}, email: {}, followup: {}, proposal: {}, meeting: {} };

    // Use pre-loaded leads from Lead Finder if available
    let leadData = preloadedLeads || null;

    // 1. LEADS
    if (leadData) {
      log(`🔍 Using ${leadData.length} pre-loaded leads from Lead Finder (${leadData[0]?.platform || "Social Media"})`);
      freshStages.leads = { status: "done", result: leadData };
      setStage("leads", { status: "done", result: leadData });
    } else {
      try {
        setStage("leads", { status: "running" });
        log("🔍 Researching leads for: " + config.niche + " in " + config.country);
        const raw = await callClaude(apiKey,
          "You are a B2B lead research expert. Return ONLY valid JSON, no markdown.",
          `Generate 5 realistic potential ${config.niche} business leads in ${config.country} needing ${config.service}. Return JSON array: [{"name":"Business Name","contact":"Owner Name","email":"email@example.com","website":"https://...","pain_point":"specific problem","size":"small/medium","platform":"Direct"}]`
        );
        const parsed = parseJSON(raw);
        if (!parsed) throw new Error("Could not parse lead data");
        leadData = parsed;
        setStage("leads", { status: "done", result: parsed });
        freshStages.leads = { status: "done", result: parsed };
        log("✅ Found " + parsed.length + " leads");
      } catch (e) {
        setStage("leads", { status: "error", result: e.message });
        log("❌ Lead research failed: " + e.message);
      }
    }

    // 2. OUTREACH EMAIL
    try {
      setStage("email", { status: "running" });
      log("✉️ Drafting personalized outreach email…");
      const lead = leadData?.[0];
      const platform = lead?.platform || "email";
      const text = await callClaude(apiKey,
        "You are an expert cold email copywriter. Write concise, personalized, high-converting emails.",
        `Write a cold outreach email from ${config.yourName || "us"} at ${config.companyName || config.service} to ${lead?.contact || "the owner"} at ${lead?.name || config.niche}.
Service: ${config.service}. Pain point: ${lead?.pain_point || "scaling their online presence"}.
Pricing starts at ${config.price}. Keep it under 150 words. Include subject line.
${platform !== "Direct" && platform !== "email" ? `Note: This lead was found on ${platform} — reference their online presence.` : ""}`
      );
      setStage("email", { status: "done", result: text });
      freshStages.email = { status: "done", result: text };
      log("✅ Outreach email drafted");
    } catch (e) {
      setStage("email", { status: "error", result: e.message });
      log("❌ Email drafting failed: " + e.message);
    }

    // 3. FOLLOW-UP SEQUENCE
    try {
      setStage("followup", { status: "running" });
      log("🔁 Building 3-email follow-up sequence…");
      const text = await callClaude(apiKey,
        "You are an expert in email follow-up sequences. Be concise and value-focused.",
        `Write a 3-email follow-up sequence for ${config.service} targeting ${config.niche} in ${config.country}.
Emails: Day 3 (value add), Day 7 (case study/social proof), Day 14 (final soft close).
Sender: ${config.yourName || "us"} from ${config.companyName || config.service}. Pricing: ${config.price}.
Label each email clearly with Day X and Subject line.`
      );
      setStage("followup", { status: "done", result: text });
      freshStages.followup = { status: "done", result: text };
      log("✅ Follow-up sequence ready");
    } catch (e) {
      setStage("followup", { status: "error", result: e.message });
      log("❌ Follow-up failed: " + e.message);
    }

    // 4. PROPOSAL
    try {
      setStage("proposal", { status: "running" });
      log("📄 Generating proposal template…");
      const text = await callClaude(apiKey,
        "You are a professional business proposal writer. Create detailed, persuasive proposals.",
        `Create a professional ${config.service} proposal for a ${config.niche} client in ${config.country}.
Include: Executive Summary, Problem Statement, Proposed Solution, Deliverables (with timeline), Investment (${config.price}), Why Us, Next Steps.
Sender: ${config.companyName || config.yourName || "Our Agency"}.`
      );
      setStage("proposal", { status: "done", result: text });
      freshStages.proposal = { status: "done", result: text };
      log("✅ Proposal template generated");
    } catch (e) {
      setStage("proposal", { status: "error", result: e.message });
      log("❌ Proposal failed: " + e.message);
    }

    // 5. MEETING
    try {
      setStage("meeting", { status: "running" });
      log("📅 Writing meeting booking message…");
      const lead = leadData?.[0];
      const text = await callClaude(apiKey,
        "You are a meeting scheduler expert. Write professional, friendly booking messages.",
        `Write a meeting booking message to ${lead?.contact || "the prospect"} at ${lead?.name || config.niche}.
Purpose: Discovery call about ${config.service}.
${config.calendlyLink ? `Booking link: ${config.calendlyLink}` : "Ask them to reply with availability."}
Duration: 30 mins. Sender: ${config.yourName || "us"} from ${config.companyName || config.service}.
Also suggest: next Tuesday 10 AM or Wednesday 2 PM ${config.country} time as options.`
      );
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 7);
      tomorrow.setHours(10, 0, 0, 0);
      const gcalLink = buildCalendarLink({
        title: `Discovery Call – ${config.companyName || config.service} × ${lead?.name || config.niche}`,
        description: `Discovery call to discuss ${config.service}.\nContact: ${lead?.contact || ""}\nWebsite: ${lead?.website || ""}`,
        startISO: tomorrow.toISOString(),
        durationMins: 30,
        location: config.calendlyLink || "Google Meet",
      });
      setStage("meeting", { status: "done", result: text, gcalLink });
      freshStages.meeting = { status: "done", result: text, gcalLink };
      log("✅ Meeting message ready");
    } catch (e) {
      setStage("meeting", { status: "error", result: e.message });
      log("❌ Meeting message failed: " + e.message);
    }

    log("🎉 Full workflow complete! Click any stage to view results.");
    setRunning(false);
    if (sheetsConfig.enabled) await saveToSheets(freshStages);
  }

  return (
    <div className="workflow-wrap">
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{STAGE_META.find((m) => m.key === modal)?.icon} {STAGE_META.find((m) => m.key === modal)?.label}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {modal === "leads" && Array.isArray(stages.leads?.result)
                ? <LeadTable leads={stages.leads.result} />
                : <pre className="result-pre">{typeof stages[modal]?.result === "string" ? stages[modal].result : JSON.stringify(stages[modal]?.result, null, 2)}</pre>
              }
              {modal === "meeting" && stages.meeting?.gcalLink && (
                <a className="btn-primary gcal-btn" href={stages.meeting.gcalLink} target="_blank" rel="noreferrer">📅 Add to Google Calendar</a>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="workflow-header">
        <div>
          <h2>🚀 Full Workflow</h2>
          <p className="sub">Find Lead → Research Site → Draft Email → Follow Up → Proposal → Book Meeting</p>
          {config.country && (
            <div className="workflow-target-badge">
              {COUNTRIES.find(c => c.name === config.country)?.flag} {config.country} · {config.niche} · {config.service}
            </div>
          )}
          {preloadedLeads && (
            <div className="preloaded-badge">
              ✅ {preloadedLeads.length} leads pre-loaded from {preloadedLeads[0]?.platform || "Lead Finder"} — will be used in Step 1
            </div>
          )}
        </div>
        <div className="workflow-actions">
          <button className="btn-primary btn-run" onClick={runAll} disabled={running}>
            {running ? "⏳ Running…" : "▶ Run Full Workflow"}
          </button>
          {sheetsConfig.enabled && pct === 100 && (
            <button className="btn-secondary" onClick={() => saveToSheets(stages)} disabled={sheetsSaving}>
              {sheetsSaving ? "⏳ Saving…" : "📊 Save to Sheets"}
            </button>
          )}
        </div>
      </div>

      {sheetsStatus && (
        <div className={`sheets-status ${sheetsStatus.ok ? "ok" : "error"}`}>
          {sheetsStatus.ok ? "✅" : "⚠️"} {sheetsStatus.msg}
        </div>
      )}
      {sheetsConfig.enabled && (
        <div className="sheets-indicator">📊 Google Sheets sync <strong>enabled</strong> — results will auto-save after workflow completes</div>
      )}

      <ProgressBar pct={pct} />

      <div className="stages">
        {STAGE_META.map((m) => (
          <StageCard key={m.key} meta={m} status={stages[m.key]?.status || "idle"} result={stages[m.key]?.result} onView={() => setModal(m.key)} />
        ))}
      </div>

      <div className="log-box" ref={logRef}>
        <div className="log-title">📟 Activity Log</div>
        {logs.length === 0 && <div className="log-empty">Logs will appear here when you run the workflow…</div>}
        {logs.map((l, i) => <div key={i} className="log-line">{l}</div>)}
      </div>
    </div>
  );
}

// ── Lead Table ────────────────────────────────────────────────────────────────
function LeadTable({ leads }) {
  return (
    <div className="lead-table-wrap">
      {leads.map((lead, i) => (
        <div key={i} className="lead-card">
          <div className="lead-card-header">
            <strong>{lead.name}</strong>
            <div className="lead-tags">
              <span className="tag">{lead.size}</span>
              {lead.platform && lead.platform !== "Direct" && <span className="tag tag-platform">{lead.platform}</span>}
            </div>
          </div>
          <div className="lead-detail">👤 {lead.contact}</div>
          <div className="lead-detail">📧 <a href={`mailto:${lead.email}`}>{lead.email}</a></div>
          <div className="lead-detail">🌐 <a href={lead.website} target="_blank" rel="noreferrer">{lead.website}</a></div>
          {lead.platform_handle && <div className="lead-detail">🔗 {lead.platform_handle}</div>}
          <div className="lead-pain">💡 {lead.pain_point}</div>
          {lead.best_approach && <div className="lead-approach">🎯 {lead.best_approach}</div>}
        </div>
      ))}
    </div>
  );
}

// ── Leads Tab ─────────────────────────────────────────────────────────────────
function LeadsTab({ apiKey, config, stages, sheetsConfig }) {
  const leads = Array.isArray(stages.leads?.result) ? stages.leads.result : [];
  const [selected, setSelected] = useState(null);
  const [content, setContent] = useState({});
  const [loading, setLoading] = useState({});
  const [sheetsSaved, setSheetsSaved] = useState({});

  async function generate(lead, type) {
    if (!apiKey) { alert("API key required"); return; }
    const key = `${lead.email}-${type}`;
    setLoading((l) => ({ ...l, [key]: true }));
    try {
      let prompt = "";
      const platformNote = lead.platform && lead.platform !== "Direct" ? `Note: Lead found on ${lead.platform}. ${lead.platform_handle ? `Handle: ${lead.platform_handle}.` : ""}` : "";
      if (type === "email")
        prompt = `Write a short personalized cold email to ${lead.contact} at ${lead.name} about ${config.service}. Their pain point: ${lead.pain_point}. Pricing: ${config.price}. Sender: ${config.yourName || "us"} from ${config.companyName || config.service}. Include subject line. Max 120 words. ${platformNote}`;
      else if (type === "proposal")
        prompt = `Write a concise proposal for ${lead.name} (${lead.contact}) for ${config.service}. Pain point: ${lead.pain_point}. Investment: ${config.price}. Agency: ${config.companyName || config.service}.`;
      else if (type === "meeting")
        prompt = `Write a meeting request to ${lead.contact} at ${lead.name} for a 30-min discovery call about ${config.service}. ${config.calendlyLink ? `Booking link: ${config.calendlyLink}` : "Ask for their availability."} Sender: ${config.yourName || "us"}.`;
      else if (type === "dm")
        prompt = `Write a ${lead.platform || "social media"} DM to ${lead.contact} at ${lead.name} about ${config.service}. Their pain point: ${lead.pain_point}. Keep it casual, under 100 words, no pitch yet — build rapport first. ${lead.best_approach ? `Suggested opening approach: ${lead.best_approach}` : ""}`;

      const text = await callClaude(apiKey, "You are a professional B2B sales expert.", prompt);
      setContent((c) => ({ ...c, [key]: text }));

      if (sheetsConfig.enabled && sheetsConfig.apiKey && sheetsConfig.sheetId) {
        try { await saveLeadActionToSheets(sheetsConfig, lead, type, text, config); setSheetsSaved(s => ({ ...s, [key]: true })); }
        catch (e) { console.warn("Sheets save failed:", e.message); }
      }
    } catch (e) {
      setContent((c) => ({ ...c, [key]: "Error: " + e.message }));
    }
    setLoading((l) => ({ ...l, [key]: false }));
  }

  if (leads.length === 0)
    return (
      <div className="empty-state">
        <div className="empty-icon">👥</div>
        <p>No leads yet. Use <strong>🔍 Find Leads</strong> to find prospects on LinkedIn, Instagram or X, then run the <strong>🚀 Workflow</strong>.</p>
      </div>
    );

  const selectedLead = selected !== null ? leads[selected] : null;
  const actions = ["email", "dm", "proposal", "meeting"];
  const actionIcons = { email: "✉️", dm: "💬", proposal: "📄", meeting: "📅" };
  const actionLabels = { email: "Cold Email", dm: "Social DM", proposal: "Proposal", meeting: "Meeting Request" };

  return (
    <div className="leads-tab">
      <div className="leads-list">
        {leads.map((lead, i) => (
          <div key={i} className={`lead-row ${selected === i ? "active" : ""}`} onClick={() => setSelected(i)}>
            <div className="lead-row-main">
              <strong>{lead.name}</strong>
              {lead.platform && lead.platform !== "Direct" && <span className="platform-badge">{lead.platform}</span>}
            </div>
            <span className="lead-row-sub">{lead.contact}</span>
          </div>
        ))}
      </div>
      {selectedLead && (
        <div className="lead-detail-panel">
          <div className="lead-detail-header">
            <h3>{selectedLead.name}</h3>
            <div className="lead-tags">
              <span className="tag">{selectedLead.size}</span>
              {selectedLead.platform && selectedLead.platform !== "Direct" && <span className="tag tag-platform">{selectedLead.platform}</span>}
            </div>
          </div>
          <div className="lead-info-grid">
            <div>👤 {selectedLead.contact}</div>
            <div>📧 <a href={`mailto:${selectedLead.email}`}>{selectedLead.email}</a></div>
            <div>🌐 <a href={selectedLead.website} target="_blank" rel="noreferrer">{selectedLead.website}</a></div>
            {selectedLead.platform_handle && <div>🔗 {selectedLead.platform_handle}</div>}
            <div>💡 {selectedLead.pain_point}</div>
            {selectedLead.best_approach && <div>🎯 {selectedLead.best_approach}</div>}
          </div>
          <div className="lead-actions">
            {actions.map((type) => {
              const key = `${selectedLead.email}-${type}`;
              return (
                <div key={type} className="lead-action-block">
                  <div className="lead-action-header">
                    <button className="btn-secondary" disabled={loading[key]} onClick={() => generate(selectedLead, type)}>
                      {loading[key] ? "⏳ Generating…" : `${actionIcons[type]} Generate ${actionLabels[type]}`}
                    </button>
                    {sheetsSaved[key] && <span className="sheets-saved-badge">📊 Saved</span>}
                  </div>
                  {content[key] && (
                    <div className="generated-content">
                      <pre>{content[key]}</pre>
                      <div className="generated-actions">
                        <button className="btn-ghost copy-btn" onClick={() => navigator.clipboard.writeText(content[key])}>📋 Copy</button>
                        {type === "meeting" && (
                          <a className="btn-primary gcal-btn"
                            href={buildCalendarLink({
                              title: `Discovery Call – ${config.companyName || config.service} × ${selectedLead.name}`,
                              description: content[key],
                              startISO: (() => { const d = new Date(); d.setDate(d.getDate()+7); d.setHours(10,0,0,0); return d.toISOString(); })(),
                              durationMins: 30, location: config.calendlyLink || "Google Meet",
                            })}
                            target="_blank" rel="noreferrer">📅 Add to Google Calendar</a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Meetings Tab ──────────────────────────────────────────────────────────────
function MeetingsTab({ config, stages }) {
  const leads = Array.isArray(stages.leads?.result) ? stages.leads.result : [];
  const slots = [
    { label: "This Tuesday 10:00 AM", offset: 2, hour: 10 },
    { label: "This Wednesday 2:00 PM", offset: 3, hour: 14 },
    { label: "Next Monday 11:00 AM", offset: 8, hour: 11 },
    { label: "Next Thursday 3:00 PM", offset: 11, hour: 15 },
  ];
  function makeCalLink(lead, slot) {
    const d = new Date();
    d.setDate(d.getDate() + slot.offset);
    d.setHours(slot.hour, 0, 0, 0);
    return buildCalendarLink({
      title: `Discovery Call – ${config.companyName || config.service} × ${lead?.name || "Prospect"}`,
      description: `30-min discovery call to discuss ${config.service}.\nContact: ${lead?.contact || ""}\nEmail: ${lead?.email || ""}`,
      startISO: d.toISOString(), durationMins: 30, location: config.calendlyLink || "Google Meet",
    });
  }
  return (
    <div className="meetings-tab">
      <div className="meetings-header"><h2>📅 Meeting Scheduler</h2><p className="sub">Schedule discovery calls directly to Google Calendar</p></div>
      {leads.length === 0 && <div className="empty-state"><div className="empty-icon">📅</div><p>Run the 🚀 Workflow first to generate leads, then schedule meetings here.</p></div>}
      <div className="meetings-grid">
        {leads.map((lead, li) => (
          <div key={li} className="meeting-card">
            <div className="meeting-card-header">
              <div>
                <strong>{lead.name}</strong>
                <div className="meeting-sub">{lead.contact} · {lead.email}</div>
              </div>
              <div className="lead-tags">
                <span className="tag">{lead.size}</span>
                {lead.platform && lead.platform !== "Direct" && <span className="tag tag-platform">{lead.platform}</span>}
              </div>
            </div>
            <div className="meeting-pain">💡 {lead.pain_point}</div>
            <div className="slots-label">📆 Pick a slot:</div>
            <div className="slots">
              {slots.map((slot, si) => (<a key={si} href={makeCalLink(lead, slot)} target="_blank" rel="noreferrer" className="slot-btn">🗓 {slot.label}</a>))}
            </div>
            {config.calendlyLink && (<a href={config.calendlyLink} target="_blank" rel="noreferrer" className="btn-primary calendly-btn">📎 Open Calendly Link</a>)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Data Store Tab ────────────────────────────────────────────────────────────
function DataStoreTab({ sheetsConfig, setSheetsConfig, stages, config }) {
  const leads = Array.isArray(stages.leads?.result) ? stages.leads.result : [];
  const [testStatus, setTestStatus] = useState(null);
  const [testing, setTesting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);

  async function testConnection() {
    if (!sheetsConfig.apiKey || !sheetsConfig.sheetId) { setTestStatus({ ok: false, msg: "Please enter API Key and Sheet ID first." }); return; }
    setTesting(true); setTestStatus(null);
    try {
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetsConfig.sheetId}?key=${sheetsConfig.apiKey}`);
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error?.message || `HTTP ${res.status}`); }
      const data = await res.json();
      setTestStatus({ ok: true, msg: `Connected to: "${data.properties?.title || "Untitled Sheet"}"` });
    } catch (e) { setTestStatus({ ok: false, msg: e.message }); }
    setTesting(false);
  }

  async function manualExport() {
    if (!sheetsConfig.enabled || !sheetsConfig.apiKey || !sheetsConfig.sheetId) { setExportStatus({ ok: false, msg: "Enable Google Sheets and configure credentials first." }); return; }
    setExporting(true); setExportStatus(null);
    try {
      if (leads.length > 0) {
        await exportLeadsToSheets(sheetsConfig, leads, config);
        await exportWorkflowToSheets(sheetsConfig, stages, config);
        setExportStatus({ ok: true, msg: `Exported ${leads.length} leads and workflow data to Google Sheets!` });
      } else { setExportStatus({ ok: false, msg: "No leads to export. Run the Workflow first." }); }
    } catch (e) { setExportStatus({ ok: false, msg: e.message }); }
    setExporting(false);
  }

  const completedStages = STAGE_META.filter(m => stages[m.key]?.status === "done");
  const platformBreakdown = leads.reduce((acc, l) => { const p = l.platform || "Direct"; acc[p] = (acc[p] || 0) + 1; return acc; }, {});

  return (
    <div className="datastore-tab">
      <div className="datastore-header"><h2>📊 Data Store — Google Sheets</h2><p className="sub">All client data, leads, and workflow results synced here</p></div>
      <div className="datastore-grid">
        <div className="card datastore-stat"><div className="stat-icon">👥</div><div className="stat-value">{leads.length}</div><div className="stat-label">Leads Generated</div></div>
        <div className="card datastore-stat"><div className="stat-icon">✅</div><div className="stat-value">{completedStages.length}</div><div className="stat-label">Stages Completed</div></div>
        <div className="card datastore-stat"><div className="stat-icon">📊</div><div className="stat-value">{sheetsConfig.enabled ? "ON" : "OFF"}</div><div className="stat-label">Sheets Sync</div></div>
        <div className="card datastore-stat"><div className="stat-icon">🌍</div><div className="stat-value">{COUNTRIES.find(c => c.name === config.country)?.flag || "—"}</div><div className="stat-label">{config.country || "No country set"}</div></div>
      </div>

      {Object.keys(platformBreakdown).length > 0 && (
        <div className="card">
          <h3>📡 Lead Sources</h3>
          <div className="platform-breakdown">
            {Object.entries(platformBreakdown).map(([platform, count]) => {
              const p = SOCIAL_PLATFORMS.find(p => p.name === platform);
              return (
                <div key={platform} className="platform-stat-item">
                  <span className="platform-stat-icon">{p?.icon || "🌐"}</span>
                  <span className="platform-stat-name">{platform}</span>
                  <span className="platform-stat-count">{count} leads</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card">
        <h3>🔗 Google Sheets Connection</h3>
        <div className="sheets-connection-row">
          <div className="field"><label>API Key</label><input type="password" placeholder="AIzaSy…" value={sheetsConfig.apiKey} onChange={e => setSheetsConfig(c => ({ ...c, apiKey: e.target.value }))} /></div>
          <div className="field"><label>Spreadsheet ID</label><input type="text" placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" value={sheetsConfig.sheetId} onChange={e => setSheetsConfig(c => ({ ...c, sheetId: e.target.value }))} /></div>
          <div className="field toggle-field"><label>Auto-Sync</label><label className="toggle-wrap"><input type="checkbox" checked={sheetsConfig.enabled} onChange={e => setSheetsConfig(c => ({ ...c, enabled: e.target.checked }))} /><span className="toggle-slider"></span></label></div>
        </div>
        <div className="connection-actions">
          <button className="btn-secondary" onClick={testConnection} disabled={testing}>{testing ? "⏳ Testing…" : "🔌 Test Connection"}</button>
          <button className="btn-primary" onClick={manualExport} disabled={exporting || !sheetsConfig.enabled}>{exporting ? "⏳ Exporting…" : "📤 Export All Data Now"}</button>
        </div>
        {testStatus && <div className={`sheets-status ${testStatus.ok ? "ok" : "error"}`}>{testStatus.ok ? "✅" : "❌"} {testStatus.msg}</div>}
        {exportStatus && <div className={`sheets-status ${exportStatus.ok ? "ok" : "error"}`}>{exportStatus.ok ? "✅" : "❌"} {exportStatus.msg}</div>}
      </div>

      {leads.length > 0 && (
        <div className="card">
          <h3>👥 Current Lead Data</h3>
          <div className="leads-preview-table">
            <div className="leads-table-header"><span>Business</span><span>Contact</span><span>Platform</span><span>Email</span><span>Pain Point</span></div>
            {leads.map((lead, i) => (
              <div key={i} className="leads-table-row">
                <span><strong>{lead.name}</strong></span>
                <span>{lead.contact}</span>
                <span>{lead.platform || "Direct"}</span>
                <span className="email-cell">{lead.email}</span>
                <span className="pain-cell">{lead.pain_point}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState(0);
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem("cf_key") || "");
  const [config, setConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cf_config") || "null") || DEFAULT_CONFIG; }
    catch { return DEFAULT_CONFIG; }
  });
  const [sheetsConfig, setSheetsConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cf_sheets") || "null") || DEFAULT_SHEETS_CONFIG; }
    catch { return DEFAULT_SHEETS_CONFIG; }
  });
  const [stages, setStages] = useState({});
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);

  useEffect(() => { if (apiKey) sessionStorage.setItem("cf_key", apiKey); }, [apiKey]);
  useEffect(() => { localStorage.setItem("cf_config", JSON.stringify(config)); }, [config]);
  useEffect(() => { localStorage.setItem("cf_sheets", JSON.stringify({ ...sheetsConfig, apiKey: "" })); }, [sheetsConfig]);

  // When leads are found in the LeadFinder tab, store them in stages
  function handleLeadsFound(leads) {
    setStages(s => ({ ...s, leads: { status: "done", result: leads } }));
    setTab(2); // Switch to Workflow tab
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <div>
              <div className="logo-name">ClientFlow AI</div>
              <div className="logo-sub">Find Lead → Research Site → Draft Email → Send → Follow Up → Book Meeting → Send Proposal</div>
            </div>
          </div>
          {sheetsConfig.enabled && <div className="sheets-badge">📊 Sheets Sync Active</div>}
        </div>
        <ApiKeyBanner apiKey={apiKey} setApiKey={setApiKey} />
        <nav className="tabs">
          {TABS.map((t, i) => (<button key={i} className={`tab ${tab === i ? "active" : ""}`} onClick={() => setTab(i)}>{t}</button>))}
        </nav>
      </header>
      <main className="main">
        {tab === 0 && <SetupTab config={config} setConfig={setConfig} sheetsConfig={sheetsConfig} setSheetsConfig={setSheetsConfig} />}
        {tab === 1 && <LeadFinderTab config={config} apiKey={apiKey} onLeadsFound={handleLeadsFound} />}
        {tab === 2 && <WorkflowTab config={config} apiKey={apiKey} sheetsConfig={sheetsConfig} stages={stages} setStages={setStages} logs={logs} setLogs={setLogs} running={running} setRunning={setRunning} />}
        {tab === 3 && <LeadsTab apiKey={apiKey} config={config} stages={stages} sheetsConfig={sheetsConfig} />}
        {tab === 4 && <MeetingsTab config={config} stages={stages} />}
        {tab === 5 && <DataStoreTab sheetsConfig={sheetsConfig} setSheetsConfig={setSheetsConfig} stages={stages} config={config} />}
      </main>
    </div>
  );
}
