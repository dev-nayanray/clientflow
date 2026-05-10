import { useState, useRef, useEffect, useCallback } from "react";

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

// Country recommendations based on niche
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

// ── helpers ──────────────────────────────────────────────────────────────────
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

// ── Google Sheets Integration ─────────────────────────────────────────────────
async function appendToGoogleSheet(sheetsConfig, rows, sheetName = "Leads") {
  if (!sheetsConfig?.apiKey || !sheetsConfig?.sheetId) {
    throw new Error("Google Sheets API key and Sheet ID are required");
  }

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

  // Check if sheet has data first
  const checkUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetsConfig.sheetId}/values/${encodeURIComponent(sheetName + "!A1")}?key=${sheetsConfig.apiKey}`;
  const checkRes = await fetch(checkUrl);
  if (!checkRes.ok) return;
  const checkData = await checkRes.json();
  if (checkData.values && checkData.values.length > 0) return; // Already has data

  // Write headers
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetsConfig.sheetId}/values/${encodeURIComponent(sheetName + "!A1")}?valueInputOption=USER_ENTERED&key=${sheetsConfig.apiKey}`;
  await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values: [headers] }),
  });
}

async function exportLeadsToSheets(sheetsConfig, leads, config) {
  const sheetName = "Leads";
  const headers = ["Timestamp", "Business Name", "Contact", "Email", "Website", "Size", "Pain Point", "Niche", "Service", "Country"];
  await initSheetHeaders(sheetsConfig, sheetName, headers);

  const timestamp = new Date().toLocaleString();
  const rows = leads.map(lead => [
    timestamp,
    lead.name || "",
    lead.contact || "",
    lead.email || "",
    lead.website || "",
    lead.size || "",
    lead.pain_point || "",
    config.niche || "",
    config.service || "",
    config.country || "",
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
    const content = Array.isArray(val.result)
      ? `${val.result.length} leads found`
      : typeof val.result === "string"
        ? val.result.substring(0, 200) + "..."
        : "";
    return [timestamp, config.niche, config.service, config.country, config.companyName || config.yourName, stageLabels[key] || key, "Completed", content];
  });
  return appendToGoogleSheet(sheetsConfig, rows, sheetName);
}

async function saveLeadActionToSheets(sheetsConfig, lead, type, content, config) {
  const sheetName = "Actions";
  const headers = ["Timestamp", "Business Name", "Contact", "Email", "Action Type", "Niche", "Service", "Country", "Content Preview"];
  await initSheetHeaders(sheetsConfig, sheetName, headers);

  const timestamp = new Date().toLocaleString();
  const rows = [[
    timestamp, lead.name, lead.contact, lead.email, type,
    config.niche, config.service, config.country,
    content.substring(0, 300) + "..."
  ]];
  return appendToGoogleSheet(sheetsConfig, rows, sheetName);
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = ["⚙️ Setup", "🚀 Workflow", "👥 Leads", "📅 Meetings", "📊 Data Store"];

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

const DEFAULT_SHEETS_CONFIG = {
  apiKey: "",
  sheetId: "",
  enabled: false,
};

const STAGE_KEYS = ["leads", "email", "followup", "proposal", "meeting"];
const STAGE_META = [
  { key: "leads",    icon: "🔍", label: "Lead Research" },
  { key: "email",    icon: "✉️",  label: "Outreach Email" },
  { key: "followup", icon: "🔁", label: "Follow Up" },
  { key: "proposal", icon: "📄", label: "Proposal" },
  { key: "meeting",  icon: "📅", label: "Meeting" },
];

// ── Dropdown Component ─────────────────────────────────────────────────────────
function SearchableDropdown({ label, value, onChange, options, placeholder, renderOption, renderValue, icon }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = typeof options[0] === "string"
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options.filter(o => (o.name || o).toLowerCase().includes(search.toLowerCase()));

  const displayValue = value
    ? (renderValue ? renderValue(value) : value)
    : placeholder;

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
              <input
                autoFocus
                className="dropdown-search"
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="dropdown-list">
              {filtered.length === 0 && <div className="dropdown-empty">No results</div>}
              {filtered.map((opt, i) => {
                const optVal = typeof opt === "string" ? opt : opt.name;
                return (
                  <div
                    key={i}
                    className={`dropdown-item ${value === optVal ? "selected" : ""}`}
                    onClick={() => { onChange(optVal); setOpen(false); }}
                  >
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

// ── Country Selector with Recommendations ─────────────────────────────────────
function CountrySelector({ value, onChange, niche }) {
  const [mode, setMode] = useState("recommended"); // "recommended" | "all"
  const recommended = getRecommendedCountries(niche);
  const currentCountry = COUNTRIES.find(c => c.name === value);

  return (
    <div className="field">
      <label>🌍 Target Country</label>
      <div className="country-tabs">
        <button className={`country-tab-btn ${mode === "recommended" ? "active" : ""}`} onClick={() => setMode("recommended")}>
          ⭐ Recommended
        </button>
        <button className={`country-tab-btn ${mode === "all" ? "active" : ""}`} onClick={() => setMode("all")}>
          🌐 All Countries
        </button>
      </div>

      {mode === "recommended" && (
        <div className="country-grid">
          {recommended.map(c => (
            <button
              key={c.code}
              className={`country-chip ${value === c.name ? "selected" : ""}`}
              onClick={() => onChange(c.name)}
              title={c.tier === "premium" ? "Premium market — higher budgets" : "Growth market — high volume"}
            >
              <span className="country-flag">{c.flag}</span>
              <span className="country-name">{c.name}</span>
              <span className={`country-tier ${c.tier}`}>{c.tier === "premium" ? "💰" : "📈"}</span>
            </button>
          ))}
          <div className="country-legend">
            <span>💰 Premium market</span>
            <span>📈 Growth market</span>
          </div>
        </div>
      )}

      {mode === "all" && (
        <SearchableDropdown
          value={value}
          onChange={onChange}
          options={COUNTRIES}
          placeholder="Select country…"
          renderOption={(c) => (
            <span className="country-option">
              <span>{c.flag} {c.name}</span>
              <span className={`tier-badge ${c.tier}`}>{c.tier}</span>
            </span>
          )}
          renderValue={(v) => {
            const c = COUNTRIES.find(x => x.name === v);
            return c ? `${c.flag} ${c.name}` : v;
          }}
        />
      )}

      {currentCountry && (
        <div className="country-selected-info">
          <span>{currentCountry.flag}</span>
          <strong>{currentCountry.name}</strong>
          <span className={`tier-badge ${currentCountry.tier}`}>{currentCountry.tier === "premium" ? "High-budget market" : "Growth market"}</span>
        </div>
      )}
    </div>
  );
}

// ── ApiKeyBanner ──────────────────────────────────────────────────────────────
function ApiKeyBanner({ apiKey, setApiKey }) {
  const [draft, setDraft] = useState(apiKey);
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = () => {
    setApiKey(draft.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="api-banner">
      <span className="api-label">🔑 Anthropic API Key</span>
      {apiKey && <span className="api-ok">✓ Key saved (session only)</span>}
      <div className="api-row">
        <input
          className="api-input"
          type={show ? "text" : "password"}
          placeholder="sk-ant-…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
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
      <input
        type={type}
        placeholder={placeholder}
        value={config[key]}
        onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="setup-wrap">
      <div className="setup-grid">
        {/* Target Config */}
        <div className="card">
          <h3>🎯 Target Configuration</h3>
          <SearchableDropdown
            label="Target Niche"
            icon="🏢"
            value={config.niche}
            onChange={(v) => setConfig(c => ({ ...c, niche: v }))}
            options={NICHES}
            placeholder="Select your target niche…"
          />
          <SearchableDropdown
            label="Your Service"
            icon="🛠️"
            value={config.service}
            onChange={(v) => setConfig(c => ({ ...c, service: v }))}
            options={SERVICES}
            placeholder="Select the service you offer…"
          />
          <CountrySelector
            value={config.country}
            onChange={(v) => setConfig(c => ({ ...c, country: v }))}
            niche={config.niche}
          />
          {field("price", "💵 Pricing Range", "$500 – $2,000")}
        </div>

        {/* Your Info */}
        <div className="card">
          <h3>🏢 Your Business Info</h3>
          {field("yourName",    "👤 Your Name",             "Rubel Ahmed")}
          {field("yourEmail",   "📧 Your Email",            "you@example.com", "email")}
          {field("companyName", "🏷️ Company / Agency Name", "Rubel SBS")}
          {field("calendlyLink","📅 Calendly / Booking Link","https://calendly.com/you")}
        </div>

        {/* Config Preview */}
        <div className="card config-preview">
          <h3>📋 Active Configuration</h3>
          <div className="config-preview-body">
            <div className="config-item">
              <span className="config-label">Niche</span>
              <span className="tag">{config.niche || "—"}</span>
            </div>
            <div className="config-item">
              <span className="config-label">Service</span>
              <span className="tag tag-purple">{config.service || "—"}</span>
            </div>
            <div className="config-item">
              <span className="config-label">Country</span>
              <span className="tag tag-green">
                {COUNTRIES.find(c => c.name === config.country)?.flag || "🌍"} {config.country || "—"}
              </span>
            </div>
            <div className="config-item">
              <span className="config-label">Pricing</span>
              <span className="config-value">{config.price || "—"}</span>
            </div>
            {config.yourName && (
              <div className="config-item">
                <span className="config-label">Sender</span>
                <span className="config-value">{config.yourName}{config.companyName ? ` · ${config.companyName}` : ""}</span>
              </div>
            )}
          </div>
          <p className="hint">Fill out both panels, then go to 🚀 Workflow to run the full pipeline.</p>
        </div>
      </div>

      {/* Google Sheets Section */}
      <div className="card sheets-card">
        <div className="sheets-header">
          <h3>📊 Google Sheets Data Store</h3>
          <label className="toggle-wrap">
            <input
              type="checkbox"
              checked={sheetsConfig.enabled}
              onChange={e => setSheetsConfig(c => ({ ...c, enabled: e.target.checked }))}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-label">{sheetsConfig.enabled ? "Enabled" : "Disabled"}</span>
          </label>
        </div>
        <p className="sheets-desc">
          Automatically save leads, workflow results, and client actions to Google Sheets. 
          Data is organized across 3 tabs: <strong>Leads</strong>, <strong>Workflows</strong>, and <strong>Actions</strong>.
        </p>
        {sheetsConfig.enabled && (
          <div className="sheets-fields">
            <div className="field">
              <label>🔑 Google Sheets API Key</label>
              <input
                type="password"
                placeholder="AIzaSy…"
                value={sheetsConfig.apiKey}
                onChange={e => setSheetsConfig(c => ({ ...c, apiKey: e.target.value }))}
              />
              <span className="field-hint">Get from Google Cloud Console → APIs & Services → Credentials</span>
            </div>
            <div className="field">
              <label>📋 Spreadsheet ID</label>
              <input
                type="text"
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                value={sheetsConfig.sheetId}
                onChange={e => setSheetsConfig(c => ({ ...c, sheetId: e.target.value }))}
              />
              <span className="field-hint">Found in your Google Sheets URL: …spreadsheets/d/<strong>ID</strong>/edit</span>
            </div>
            <div className="sheets-setup-steps">
              <div className="setup-step">
                <span className="step-num">1</span>
                <span>Create a new Google Sheet at <a href="https://sheets.google.com" target="_blank" rel="noreferrer">sheets.google.com</a></span>
              </div>
              <div className="setup-step">
                <span className="step-num">2</span>
                <span>Enable Google Sheets API in <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer">Google Cloud Console</a></span>
              </div>
              <div className="setup-step">
                <span className="step-num">3</span>
                <span>Create an API Key (restrict to Sheets API) and paste above</span>
              </div>
              <div className="setup-step">
                <span className="step-num">4</span>
                <span>Share your Sheet with <strong>Anyone with the link (Editor)</strong> or use a Service Account</span>
              </div>
            </div>
          </div>
        )}
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

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const log = (msg) => setLogs((l) => [...l, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  const pct = STAGE_KEYS.reduce((acc, k) => acc + (stages[k]?.status === "done" ? 20 : 0), 0);
  const setStage = (key, patch) => setStages((s) => ({ ...s, [key]: { ...s[key], ...patch } }));

  async function saveToSheets(finalStages) {
    if (!sheetsConfig.enabled || !sheetsConfig.apiKey || !sheetsConfig.sheetId) return;
    setSheetsSaving(true);
    setSheetsStatus(null);
    try {
      log("📊 Saving workflow data to Google Sheets…");
      // Export leads
      if (Array.isArray(finalStages.leads?.result) && finalStages.leads.result.length > 0) {
        await exportLeadsToSheets(sheetsConfig, finalStages.leads.result, config);
        log("✅ Leads saved to Google Sheets (Leads tab)");
      }
      // Export workflow summary
      await exportWorkflowToSheets(sheetsConfig, finalStages, config);
      log("✅ Workflow summary saved to Google Sheets (Workflows tab)");
      setSheetsStatus({ ok: true, msg: "All data saved to Google Sheets!" });
    } catch (e) {
      log("⚠️ Sheets save failed: " + e.message);
      setSheetsStatus({ ok: false, msg: e.message });
    }
    setSheetsSaving(false);
  }

  async function runAll() {
    if (!apiKey) { alert("Please enter your Anthropic API key first."); return; }
    setRunning(true);
    setLogs([]);
    setSheetsStatus(null);
    const freshStages = { leads: {}, email: {}, followup: {}, proposal: {}, meeting: {} };
    setStages(freshStages);

    const ctx = config;
    let leadData = null;

    // 1. LEADS
    try {
      setStage("leads", { status: "running" });
      log("🔍 Researching leads for: " + ctx.niche + " in " + ctx.country);
      const raw = await callClaude(apiKey,
        "You are a B2B lead research expert. Return ONLY valid JSON, no markdown.",
        `Generate 5 realistic potential ${ctx.niche} business leads in ${ctx.country} needing ${ctx.service}.\nReturn JSON array: [{"name":"Business Name","contact":"Owner Name","email":"email@example.com","website":"https://...","pain_point":"specific problem","size":"small/medium"}]`
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

    // 2. OUTREACH EMAIL
    try {
      setStage("email", { status: "running" });
      log("✉️ Drafting personalized outreach email…");
      const lead = leadData?.[0];
      const text = await callClaude(apiKey,
        "You are an expert cold email copywriter. Write concise, personalized, high-converting emails.",
        `Write a cold outreach email from ${ctx.yourName || "us"} at ${ctx.companyName || ctx.service} to ${lead?.contact || "the owner"} at ${lead?.name || ctx.niche}.\nService: ${ctx.service}. Pain point: ${lead?.pain_point || "scaling their online presence"}.\nPricing starts at ${ctx.price}. Keep it under 150 words. Include subject line.`
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
        `Write a 3-email follow-up sequence for ${ctx.service} targeting ${ctx.niche} in ${ctx.country}.\nEmails: Day 3 (value add), Day 7 (case study/social proof), Day 14 (final soft close).\nSender: ${ctx.yourName || "us"} from ${ctx.companyName || ctx.service}. Pricing: ${ctx.price}.\nLabel each email clearly with Day X and Subject line.`
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
        `Create a professional ${ctx.service} proposal for a ${ctx.niche} client in ${ctx.country}.\nInclude: Executive Summary, Problem Statement, Proposed Solution, Deliverables (with timeline), Investment (${ctx.price}), Why Us, Next Steps.\nSender: ${ctx.companyName || ctx.yourName || "Our Agency"}.`
      );
      setStage("proposal", { status: "done", result: text });
      freshStages.proposal = { status: "done", result: text };
      log("✅ Proposal template generated");
    } catch (e) {
      setStage("proposal", { status: "error", result: e.message });
      log("❌ Proposal failed: " + e.message);
    }

    // 5. MEETING MESSAGE
    try {
      setStage("meeting", { status: "running" });
      log("📅 Writing meeting booking message…");
      const lead = leadData?.[0];
      const text = await callClaude(apiKey,
        "You are a meeting scheduler expert. Write professional, friendly booking messages.",
        `Write a meeting booking message to ${lead?.contact || "the prospect"} at ${lead?.name || ctx.niche}.\nPurpose: Discovery call about ${ctx.service}.\n${ctx.calendlyLink ? `Booking link: ${ctx.calendlyLink}` : "Ask them to reply with availability."}\nDuration: 30 mins. Sender: ${ctx.yourName || "us"} from ${ctx.companyName || ctx.service}.\nAlso suggest: next Tuesday 10 AM or Wednesday 2 PM ${ctx.country} time as options.`
      );

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 7);
      tomorrow.setHours(10, 0, 0, 0);
      const gcalLink = buildCalendarLink({
        title: `Discovery Call – ${ctx.companyName || ctx.service} × ${lead?.name || ctx.niche}`,
        description: `Discovery call to discuss ${ctx.service} proposal.\nContact: ${lead?.contact || ""}\nWebsite: ${lead?.website || ""}`,
        startISO: tomorrow.toISOString(),
        durationMins: 30,
        location: ctx.calendlyLink || "Google Meet",
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

    // Auto-save to Google Sheets if enabled
    if (sheetsConfig.enabled) {
      await saveToSheets(freshStages);
    }
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
                <a className="btn-primary gcal-btn" href={stages.meeting.gcalLink} target="_blank" rel="noreferrer">
                  📅 Add to Google Calendar
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="workflow-header">
        <div>
          <h2>🚀 Full Workflow</h2>
          <p className="sub">Find Lead → Research → Draft Email → Follow Up → Proposal → Book Meeting</p>
          {config.country && (
            <div className="workflow-target-badge">
              {COUNTRIES.find(c => c.name === config.country)?.flag} {config.country} · {config.niche} · {config.service}
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
        <div className="sheets-indicator">
          📊 Google Sheets sync <strong>enabled</strong> — results will auto-save after workflow completes
        </div>
      )}

      <ProgressBar pct={pct} />

      <div className="stages">
        {STAGE_META.map((m) => (
          <StageCard
            key={m.key}
            meta={m}
            status={stages[m.key]?.status || "idle"}
            result={stages[m.key]?.result}
            onView={() => setModal(m.key)}
          />
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
            <span className="tag">{lead.size}</span>
          </div>
          <div className="lead-detail">👤 {lead.contact}</div>
          <div className="lead-detail">📧 <a href={`mailto:${lead.email}`}>{lead.email}</a></div>
          <div className="lead-detail">🌐 <a href={lead.website} target="_blank" rel="noreferrer">{lead.website}</a></div>
          <div className="lead-pain">💡 {lead.pain_point}</div>
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
      if (type === "email")
        prompt = `Write a short personalized cold email to ${lead.contact} at ${lead.name} about ${config.service}. Their pain point: ${lead.pain_point}. Pricing: ${config.price}. Sender: ${config.yourName || "us"} from ${config.companyName || config.service}. Include subject line. Max 120 words.`;
      else if (type === "proposal")
        prompt = `Write a concise proposal for ${lead.name} (${lead.contact}) for ${config.service}. Pain point: ${lead.pain_point}. Investment: ${config.price}. Agency: ${config.companyName || config.service}.`;
      else if (type === "meeting")
        prompt = `Write a meeting request to ${lead.contact} at ${lead.name} for a 30-min discovery call about ${config.service}. ${config.calendlyLink ? `Booking link: ${config.calendlyLink}` : "Ask for their availability."} Sender: ${config.yourName || "us"}.`;

      const text = await callClaude(apiKey, "You are a professional B2B sales expert.", prompt);
      setContent((c) => ({ ...c, [key]: text }));

      // Auto-save to Sheets if enabled
      if (sheetsConfig.enabled && sheetsConfig.apiKey && sheetsConfig.sheetId) {
        try {
          await saveLeadActionToSheets(sheetsConfig, lead, type, text, config);
          setSheetsSaved(s => ({ ...s, [key]: true }));
        } catch (e) {
          console.warn("Sheets save failed:", e.message);
        }
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
        <p>No leads yet. Run the 🚀 Workflow first to generate leads.</p>
      </div>
    );

  return (
    <div className="leads-tab">
      <div className="leads-list">
        {leads.map((lead, i) => (
          <div key={i} className={`lead-row ${selected === i ? "active" : ""}`} onClick={() => setSelected(i)}>
            <strong>{lead.name}</strong>
            <span className="lead-row-sub">{lead.contact}</span>
          </div>
        ))}
      </div>
      {selected !== null && (
        <div className="lead-detail-panel">
          <div className="lead-detail-header">
            <h3>{leads[selected].name}</h3>
            <span className="tag">{leads[selected].size}</span>
          </div>
          <div className="lead-info-grid">
            <div>👤 {leads[selected].contact}</div>
            <div>📧 <a href={`mailto:${leads[selected].email}`}>{leads[selected].email}</a></div>
            <div>🌐 <a href={leads[selected].website} target="_blank" rel="noreferrer">{leads[selected].website}</a></div>
            <div>💡 {leads[selected].pain_point}</div>
          </div>
          <div className="lead-actions">
            {["email","proposal","meeting"].map((type) => {
              const key = `${leads[selected].email}-${type}`;
              const icons = { email: "✉️", proposal: "📄", meeting: "📅" };
              return (
                <div key={type} className="lead-action-block">
                  <div className="lead-action-header">
                    <button
                      className="btn-secondary"
                      disabled={loading[key]}
                      onClick={() => generate(leads[selected], type)}
                    >
                      {loading[key] ? "⏳ Generating…" : `${icons[type]} Generate ${type.charAt(0).toUpperCase()+type.slice(1)}`}
                    </button>
                    {sheetsSaved[key] && <span className="sheets-saved-badge">📊 Saved to Sheets</span>}
                  </div>
                  {content[key] && (
                    <div className="generated-content">
                      <pre>{content[key]}</pre>
                      <div className="generated-actions">
                        <button className="btn-ghost copy-btn" onClick={() => navigator.clipboard.writeText(content[key])}>📋 Copy</button>
                        {type === "meeting" && (
                          <a className="btn-primary gcal-btn"
                            href={buildCalendarLink({
                              title: `Discovery Call – ${config.companyName || config.service} × ${leads[selected].name}`,
                              description: content[key],
                              startISO: (() => { const d = new Date(); d.setDate(d.getDate()+7); d.setHours(10,0,0,0); return d.toISOString(); })(),
                              durationMins: 30,
                              location: config.calendlyLink || "Google Meet",
                            })}
                            target="_blank" rel="noreferrer"
                          >📅 Add to Google Calendar</a>
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
    { label: "This Tuesday 10:00 AM", offset: 2 },
    { label: "This Wednesday 2:00 PM", offset: 3, hour: 14 },
    { label: "Next Monday 11:00 AM", offset: 8, hour: 11 },
    { label: "Next Thursday 3:00 PM", offset: 11, hour: 15 },
  ];

  function makeCalLink(lead, slot) {
    const d = new Date();
    d.setDate(d.getDate() + slot.offset);
    d.setHours(slot.hour || 10, 0, 0, 0);
    return buildCalendarLink({
      title: `Discovery Call – ${config.companyName || config.service} × ${lead?.name || "Prospect"}`,
      description: `30-min discovery call to discuss ${config.service}.\nContact: ${lead?.contact || ""}\nEmail: ${lead?.email || ""}`,
      startISO: d.toISOString(),
      durationMins: 30,
      location: config.calendlyLink || "Google Meet",
    });
  }

  return (
    <div className="meetings-tab">
      <div className="meetings-header">
        <h2>📅 Meeting Scheduler</h2>
        <p className="sub">Schedule discovery calls directly to Google Calendar</p>
      </div>

      {leads.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <p>Run the 🚀 Workflow first to generate leads, then schedule meetings here.</p>
        </div>
      )}

      <div className="meetings-grid">
        {leads.map((lead, li) => (
          <div key={li} className="meeting-card">
            <div className="meeting-card-header">
              <div>
                <strong>{lead.name}</strong>
                <div className="meeting-sub">{lead.contact} · {lead.email}</div>
              </div>
              <span className="tag">{lead.size}</span>
            </div>
            <div className="meeting-pain">💡 {lead.pain_point}</div>
            <div className="slots-label">📆 Pick a slot:</div>
            <div className="slots">
              {slots.map((slot, si) => (
                <a key={si} href={makeCalLink(lead, slot)} target="_blank" rel="noreferrer" className="slot-btn">
                  🗓 {slot.label}
                </a>
              ))}
            </div>
            {config.calendlyLink && (
              <a href={config.calendlyLink} target="_blank" rel="noreferrer" className="btn-primary calendly-btn">
                📎 Open Calendly Link
              </a>
            )}
          </div>
        ))}
      </div>

      <div className="gcal-info card">
        <h3>ℹ️ How Google Calendar Integration Works</h3>
        <ol>
          <li>Click any slot button above — it opens Google Calendar pre-filled with meeting details.</li>
          <li>Review the event (title, time, description) then click <strong>Save</strong>.</li>
          <li>Google Calendar will send invites to guests you add.</li>
          <li>Add your Calendly link in ⚙️ Setup to share a self-booking link with leads.</li>
        </ol>
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
    if (!sheetsConfig.apiKey || !sheetsConfig.sheetId) {
      setTestStatus({ ok: false, msg: "Please enter API Key and Sheet ID first." });
      return;
    }
    setTesting(true);
    setTestStatus(null);
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetsConfig.sheetId}?key=${sheetsConfig.apiKey}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setTestStatus({ ok: true, msg: `Connected to: "${data.properties?.title || "Untitled Sheet"}"` });
    } catch (e) {
      setTestStatus({ ok: false, msg: e.message });
    }
    setTesting(false);
  }

  async function manualExport() {
    if (!sheetsConfig.enabled || !sheetsConfig.apiKey || !sheetsConfig.sheetId) {
      setExportStatus({ ok: false, msg: "Enable Google Sheets and configure credentials first." });
      return;
    }
    setExporting(true);
    setExportStatus(null);
    try {
      if (leads.length > 0) {
        await exportLeadsToSheets(sheetsConfig, leads, config);
        await exportWorkflowToSheets(sheetsConfig, stages, config);
        setExportStatus({ ok: true, msg: `Exported ${leads.length} leads and workflow data to Google Sheets!` });
      } else {
        setExportStatus({ ok: false, msg: "No leads to export. Run the Workflow first." });
      }
    } catch (e) {
      setExportStatus({ ok: false, msg: e.message });
    }
    setExporting(false);
  }

  const completedStages = STAGE_META.filter(m => stages[m.key]?.status === "done");

  return (
    <div className="datastore-tab">
      <div className="datastore-header">
        <h2>📊 Data Store — Google Sheets</h2>
        <p className="sub">All client data, leads, and workflow results are synced here</p>
      </div>

      {/* Status Overview */}
      <div className="datastore-grid">
        <div className="card datastore-stat">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{leads.length}</div>
          <div className="stat-label">Leads Generated</div>
        </div>
        <div className="card datastore-stat">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{completedStages.length}</div>
          <div className="stat-label">Stages Completed</div>
        </div>
        <div className="card datastore-stat">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{sheetsConfig.enabled ? "ON" : "OFF"}</div>
          <div className="stat-label">Sheets Sync</div>
        </div>
        <div className="card datastore-stat">
          <div className="stat-icon">🌍</div>
          <div className="stat-value">{COUNTRIES.find(c => c.name === config.country)?.flag || "—"}</div>
          <div className="stat-label">{config.country || "No country set"}</div>
        </div>
      </div>

      {/* Connection Config */}
      <div className="card">
        <h3>🔗 Google Sheets Connection</h3>
        <div className="sheets-connection-row">
          <div className="field">
            <label>API Key</label>
            <input
              type="password"
              placeholder="AIzaSy…"
              value={sheetsConfig.apiKey}
              onChange={e => setSheetsConfig(c => ({ ...c, apiKey: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Spreadsheet ID</label>
            <input
              type="text"
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              value={sheetsConfig.sheetId}
              onChange={e => setSheetsConfig(c => ({ ...c, sheetId: e.target.value }))}
            />
          </div>
          <div className="field toggle-field">
            <label>Auto-Sync</label>
            <label className="toggle-wrap">
              <input
                type="checkbox"
                checked={sheetsConfig.enabled}
                onChange={e => setSheetsConfig(c => ({ ...c, enabled: e.target.checked }))}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
        <div className="connection-actions">
          <button className="btn-secondary" onClick={testConnection} disabled={testing}>
            {testing ? "⏳ Testing…" : "🔌 Test Connection"}
          </button>
          <button className="btn-primary" onClick={manualExport} disabled={exporting || !sheetsConfig.enabled}>
            {exporting ? "⏳ Exporting…" : "📤 Export All Data Now"}
          </button>
        </div>
        {testStatus && (
          <div className={`sheets-status ${testStatus.ok ? "ok" : "error"}`}>
            {testStatus.ok ? "✅" : "❌"} {testStatus.msg}
          </div>
        )}
        {exportStatus && (
          <div className={`sheets-status ${exportStatus.ok ? "ok" : "error"}`}>
            {exportStatus.ok ? "✅" : "❌"} {exportStatus.msg}
          </div>
        )}
      </div>

      {/* Sheet Structure */}
      <div className="card">
        <h3>📋 Sheet Structure</h3>
        <p className="sheets-desc">Your spreadsheet will be organized across 3 automatic tabs:</p>
        <div className="sheet-tabs-preview">
          <div className="sheet-tab-item">
            <div className="sheet-tab-name">👥 Leads</div>
            <div className="sheet-tab-cols">Timestamp · Business Name · Contact · Email · Website · Size · Pain Point · Niche · Service · Country</div>
          </div>
          <div className="sheet-tab-item">
            <div className="sheet-tab-name">🚀 Workflows</div>
            <div className="sheet-tab-cols">Timestamp · Niche · Service · Country · Company · Stage · Status · Content Preview</div>
          </div>
          <div className="sheet-tab-item">
            <div className="sheet-tab-name">⚡ Actions</div>
            <div className="sheet-tab-cols">Timestamp · Business Name · Contact · Email · Action Type · Niche · Service · Country · Content Preview</div>
          </div>
        </div>
      </div>

      {/* Lead Preview */}
      {leads.length > 0 && (
        <div className="card">
          <h3>👥 Current Lead Data</h3>
          <div className="leads-preview-table">
            <div className="leads-table-header">
              <span>Business</span>
              <span>Contact</span>
              <span>Email</span>
              <span>Size</span>
              <span>Pain Point</span>
            </div>
            {leads.map((lead, i) => (
              <div key={i} className="leads-table-row">
                <span><strong>{lead.name}</strong></span>
                <span>{lead.contact}</span>
                <span className="email-cell">{lead.email}</span>
                <span><span className="tag">{lead.size}</span></span>
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

  useEffect(() => {
    if (apiKey) sessionStorage.setItem("cf_key", apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem("cf_config", JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    // Don't save apiKey to localStorage for security, only sheetsConfig (no sensitive keys)
    const toSave = { ...sheetsConfig, apiKey: "" }; // strip api key from localStorage
    localStorage.setItem("cf_sheets", JSON.stringify(toSave));
  }, [sheetsConfig]);

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <div>
              <div className="logo-name">ClientFlow AI</div>
              <div className="logo-sub">Automated Client Acquisition · Find → Email → Follow-up → Proposal → Book</div>
            </div>
          </div>
          {sheetsConfig.enabled && (
            <div className="sheets-badge">📊 Sheets Sync Active</div>
          )}
        </div>
        <ApiKeyBanner apiKey={apiKey} setApiKey={setApiKey} />
        <nav className="tabs">
          {TABS.map((t, i) => (
            <button key={i} className={`tab ${tab === i ? "active" : ""}`} onClick={() => setTab(i)}>{t}</button>
          ))}
        </nav>
      </header>

      <main className="main">
        {tab === 0 && <SetupTab config={config} setConfig={setConfig} sheetsConfig={sheetsConfig} setSheetsConfig={setSheetsConfig} />}
        {tab === 1 && (
          <WorkflowTab
            config={config} apiKey={apiKey}
            sheetsConfig={sheetsConfig}
            stages={stages} setStages={setStages}
            logs={logs} setLogs={setLogs}
            running={running} setRunning={setRunning}
          />
        )}
        {tab === 2 && <LeadsTab apiKey={apiKey} config={config} stages={stages} sheetsConfig={sheetsConfig} />}
        {tab === 3 && <MeetingsTab config={config} stages={stages} />}
        {tab === 4 && <DataStoreTab sheetsConfig={sheetsConfig} setSheetsConfig={setSheetsConfig} stages={stages} config={config} />}
      </main>
    </div>
  );
}
