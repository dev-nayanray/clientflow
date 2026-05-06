
import { useState, useRef, useEffect } from "react";

// ── helpers ──────────────────────────────────────────────────────────────────
const MODEL = "claude-sonnet-4-5";

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

const TABS = ["⚙️ Setup", "🚀 Workflow", "👥 Leads", "📅 Meetings"];

const DEFAULT_CONFIG = {
  niche: "E-commerce Stores",
  service: "Web Design & Development",
  country: "Bangladesh",
  price: "$500 – $2,000",
  calendlyLink: "",
  yourName: "",
  yourEmail: "",
  companyName: "",
};

const STAGE_KEYS = ["leads", "email", "followup", "proposal", "meeting"];
const STAGE_META = [
  { key: "leads",    icon: "🔍", label: "Lead Research" },
  { key: "email",    icon: "✉️",  label: "Outreach Email" },
  { key: "followup", icon: "🔁", label: "Follow Up" },
  { key: "proposal", icon: "📄", label: "Proposal" },
  { key: "meeting",  icon: "📅", label: "Meeting" },
];

// ── sub-components ────────────────────────────────────────────────────────────

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

function SetupTab({ config, setConfig }) {
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
    <div className="setup-grid">
      <div className="card">
        <h3>🎯 Target</h3>
        {field("niche",   "Target Niche",    "E-commerce Stores")}
        {field("service", "Your Service",    "Web Design & Development")}
        {field("country", "Target Country",  "Bangladesh")}
        {field("price",   "Pricing Range",   "$500 – $2,000")}
      </div>
      <div className="card">
        <h3>🏢 Your Info</h3>
        {field("yourName",    "Your Name",      "Rubel Ahmed")}
        {field("yourEmail",   "Your Email",     "you@example.com", "email")}
        {field("companyName", "Company Name",   "Rubel SBS")}
        {field("calendlyLink","Calendly / Booking Link", "https://calendly.com/you")}
      </div>
      <div className="card config-preview">
        <h3>📋 Active Configuration</h3>
        <div className="tags">
          {[config.niche, config.service, config.country].filter(Boolean).map((t) => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>
        <p className="hint">Fill out both panels, then go to 🚀 Workflow to run the full pipeline.</p>
      </div>
    </div>
  );
}

function ProgressBar({ pct }) {
  return (
    <div className="progress-wrap">
      <div className="progress-bar" style={{ width: `${pct}%` }} />
      <span className="progress-label">{Math.round(pct)}%</span>
    </div>
  );
}

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

function WorkflowTab({ config, apiKey, stages, setStages, logs, setLogs, running, setRunning }) {
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const log = (msg) => setLogs((l) => [...l, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const pct = STAGE_KEYS.reduce((acc, k) => acc + (stages[k]?.status === "done" ? 20 : 0), 0);

  const setStage = (key, patch) => setStages((s) => ({ ...s, [key]: { ...s[key], ...patch } }));

  async function runAll() {
    if (!apiKey) { alert("Please enter your Anthropic API key first."); return; }
    setRunning(true);
    setLogs([]);
    setStages({ leads: {}, email: {}, followup: {}, proposal: {}, meeting: {} });

    const ctx = config;
    let leadData = null;

    // 1. LEADS
    try {
      setStage("leads", { status: "running" });
      log("🔍 Researching leads for: " + ctx.niche);
      const raw = await callClaude(apiKey,
        "You are a B2B lead research expert. Return ONLY valid JSON, no markdown.",
        `Generate 5 realistic potential ${ctx.niche} business leads in ${ctx.country} needing ${ctx.service}.
Return JSON array: [{"name":"Business Name","contact":"Owner Name","email":"email@example.com","website":"https://...","pain_point":"specific problem","size":"small/medium"}]`
      );
      const parsed = parseJSON(raw);
      if (!parsed) throw new Error("Could not parse lead data");
      leadData = parsed;
      setStage("leads", { status: "done", result: parsed });
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
        `Write a cold outreach email from ${ctx.yourName || "us"} at ${ctx.companyName || ctx.service} to ${lead?.contact || "the owner"} at ${lead?.name || ctx.niche}.
Service: ${ctx.service}. Pain point: ${lead?.pain_point || "scaling their online presence"}.
Pricing starts at ${ctx.price}. Keep it under 150 words. Include subject line.`
      );
      setStage("email", { status: "done", result: text });
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
        `Write a 3-email follow-up sequence for ${ctx.service} targeting ${ctx.niche} in ${ctx.country}.
Emails: Day 3 (value add), Day 7 (case study/social proof), Day 14 (final soft close).
Sender: ${ctx.yourName || "us"} from ${ctx.companyName || ctx.service}. Pricing: ${ctx.price}.
Label each email clearly with Day X and Subject line.`
      );
      setStage("followup", { status: "done", result: text });
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
        `Create a professional ${ctx.service} proposal for a ${ctx.niche} client in ${ctx.country}.
Include: Executive Summary, Problem Statement, Proposed Solution, Deliverables (with timeline), Investment (${ctx.price}), Why Us, Next Steps.
Sender: ${ctx.companyName || ctx.yourName || "Our Agency"}.`
      );
      setStage("proposal", { status: "done", result: text });
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
        `Write a meeting booking message to ${lead?.contact || "the prospect"} at ${lead?.name || ctx.niche}.
Purpose: Discovery call about ${ctx.service}.
${ctx.calendlyLink ? `Booking link: ${ctx.calendlyLink}` : "Ask them to reply with availability."}
Duration: 30 mins. Sender: ${ctx.yourName || "us"} from ${ctx.companyName || ctx.service}.
Also suggest: next Tuesday 10 AM or Wednesday 2 PM Bangladesh time as options.`
      );

      // Build Google Calendar link for the suggested slot
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
      log("✅ Meeting message ready");
    } catch (e) {
      setStage("meeting", { status: "error", result: e.message });
      log("❌ Meeting message failed: " + e.message);
    }

    log("🎉 Full workflow complete! Click any stage to view results.");
    setRunning(false);
  }

  const [modal, setModal] = useState(null);

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
        </div>
        <button className="btn-primary btn-run" onClick={runAll} disabled={running}>
          {running ? "⏳ Running…" : "▶ Run Full Workflow"}
        </button>
      </div>

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

function LeadsTab({ apiKey, config, stages }) {
  const leads = Array.isArray(stages.leads?.result) ? stages.leads.result : [];
  const [selected, setSelected] = useState(null);
  const [content, setContent] = useState({});
  const [loading, setLoading] = useState({});

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
      else if (type === "meeting") {
        prompt = `Write a meeting request to ${lead.contact} at ${lead.name} for a 30-min discovery call about ${config.service}. ${config.calendlyLink ? `Booking link: ${config.calendlyLink}` : "Ask for their availability."} Sender: ${config.yourName || "us"}.`;
      }
      const text = await callClaude(apiKey, "You are a professional B2B sales expert.", prompt);
      setContent((c) => ({ ...c, [key]: text }));
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
                  <button
                    className="btn-secondary"
                    disabled={loading[key]}
                    onClick={() => generate(leads[selected], type)}
                  >
                    {loading[key] ? "⏳ Generating…" : `${icons[type]} Generate ${type.charAt(0).toUpperCase()+type.slice(1)}`}
                  </button>
                  {content[key] && (
                    <div className="generated-content">
                      <pre>{content[key]}</pre>
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
                <a
                  key={si}
                  href={makeCalLink(lead, slot)}
                  target="_blank"
                  rel="noreferrer"
                  className="slot-btn"
                >
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

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState(0);
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem("cf_key") || "");
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [stages, setStages] = useState({});
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (apiKey) sessionStorage.setItem("cf_key", apiKey);
  }, [apiKey]);

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
        </div>
        <ApiKeyBanner apiKey={apiKey} setApiKey={setApiKey} />
        <nav className="tabs">
          {TABS.map((t, i) => (
            <button key={i} className={`tab ${tab === i ? "active" : ""}`} onClick={() => setTab(i)}>{t}</button>
          ))}
        </nav>
      </header>

      <main className="main">
        {tab === 0 && <SetupTab config={config} setConfig={setConfig} />}
        {tab === 1 && (
          <WorkflowTab
            config={config} apiKey={apiKey}
            stages={stages} setStages={setStages}
            logs={logs} setLogs={setLogs}
            running={running} setRunning={setRunning}
          />
        )}
        {tab === 2 && <LeadsTab apiKey={apiKey} config={config} stages={stages} />}
        {tab === 3 && <MeetingsTab config={config} stages={stages} />}
      </main>
    </div>
  );
}

