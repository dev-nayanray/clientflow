import { useState, useRef, useEffect, useCallback } from "react";
import {
  REAL_LEAD_SOURCES, hunterDomainSearch, hunterCompanySearch,
  apolloSearch, googlePlacesSearch, parseCSVLeads
} from "./RealLeadFinder";
import {
  initGmailAuth, gmailSend, gmailListSent, gmailGetMessage,
  getGmailToken, setGmailToken, clearGmailToken,
  getGmailProfile, parseEmailText
} from "./GmailSender";
import {
  supabase, signOut, getProfile,
  getSubscription, isSubscriptionActive, getPlanLabel, getPlanColor
} from "./supabase";
import AuthPage from "./Auth";
import { PricingPage, SubBanner, ManageSubscription } from "./Subscription";
import AdminPanel from "./AdminPanel";
import UserProfile from "./UserProfile";
import SetupWizard from "./SetupWizard";

// ── Constants ─────────────────────────────────────────────────────────────────
const MODEL = "claude-sonnet-4-5";
const NICHES = ["E-commerce Stores","SaaS Companies","Real Estate Agencies","Law Firms","Medical Clinics","Dental Offices","Gyms & Fitness Studios","Restaurants & Cafés","Online Coaches & Consultants","Digital Marketing Agencies","Accounting & CPA Firms","Insurance Agencies","Mortgage Brokers","Recruitment & HR Firms","IT & Tech Startups","Photography Studios","Interior Design Firms","Construction Companies","Logistics & Freight","Education & eLearning Platforms"];
const SERVICES = ["Web Design & Development","SEO & Content Marketing","Social Media Management","Google & Facebook Ads","Email Marketing Automation","Video Production & Editing","Branding & Logo Design","Mobile App Development","CRM & Sales Automation","Chatbot Development","Shopify / WooCommerce Setup","WordPress Development","Lead Generation Systems","Business Process Automation","Data Analytics & Reporting","Virtual Assistant Services","Copywriting & Content Creation","LinkedIn Outreach","Podcast Production","E-learning Course Creation"];
const COUNTRIES = [
  {name:"United States",code:"US",flag:"🇺🇸",tier:"premium"},{name:"United Kingdom",code:"GB",flag:"🇬🇧",tier:"premium"},
  {name:"Canada",code:"CA",flag:"🇨🇦",tier:"premium"},{name:"Australia",code:"AU",flag:"🇦🇺",tier:"premium"},
  {name:"Germany",code:"DE",flag:"🇩🇪",tier:"premium"},{name:"Netherlands",code:"NL",flag:"🇳🇱",tier:"premium"},
  {name:"Singapore",code:"SG",flag:"🇸🇬",tier:"premium"},{name:"UAE",code:"AE",flag:"🇦🇪",tier:"premium"},
  {name:"New Zealand",code:"NZ",flag:"🇳🇿",tier:"premium"},{name:"Switzerland",code:"CH",flag:"🇨🇭",tier:"premium"},
  {name:"India",code:"IN",flag:"🇮🇳",tier:"growth"},{name:"Bangladesh",code:"BD",flag:"🇧🇩",tier:"growth"},
  {name:"Pakistan",code:"PK",flag:"🇵🇰",tier:"growth"},{name:"Philippines",code:"PH",flag:"🇵🇭",tier:"growth"},
  {name:"Vietnam",code:"VN",flag:"🇻🇳",tier:"growth"},{name:"Indonesia",code:"ID",flag:"🇮🇩",tier:"growth"},
  {name:"Malaysia",code:"MY",flag:"🇲🇾",tier:"growth"},{name:"Nigeria",code:"NG",flag:"🇳🇬",tier:"growth"},
  {name:"Kenya",code:"KE",flag:"🇰🇪",tier:"growth"},{name:"South Africa",code:"ZA",flag:"🇿🇦",tier:"growth"},
  {name:"Brazil",code:"BR",flag:"🇧🇷",tier:"growth"},{name:"Mexico",code:"MX",flag:"🇲🇽",tier:"growth"},
  {name:"Colombia",code:"CO",flag:"🇨🇴",tier:"growth"},{name:"France",code:"FR",flag:"🇫🇷",tier:"premium"},
  {name:"Spain",code:"ES",flag:"🇪🇸",tier:"premium"},{name:"Italy",code:"IT",flag:"🇮🇹",tier:"premium"},
  {name:"Japan",code:"JP",flag:"🇯🇵",tier:"premium"},{name:"South Korea",code:"KR",flag:"🇰🇷",tier:"premium"},
  {name:"Sweden",code:"SE",flag:"🇸🇪",tier:"premium"},{name:"Denmark",code:"DK",flag:"🇩🇰",tier:"premium"},
];
const NICHE_COUNTRY_REC = {
  "E-commerce Stores":["US","GB","CA","AU","IN"],"SaaS Companies":["US","GB","CA","DE","SG"],
  "Real Estate Agencies":["US","GB","AU","AE","CA"],"Law Firms":["US","GB","CA","AU","SG"],
  "Medical Clinics":["US","GB","AU","CA","AE"],"Dental Offices":["US","CA","AU","GB","AE"],
  "Gyms & Fitness Studios":["US","GB","CA","AU","IN"],"Restaurants & Cafés":["US","GB","AU","CA","SG"],
  "Online Coaches & Consultants":["US","GB","CA","AU","IN"],"Digital Marketing Agencies":["US","IN","GB","PH","BD"],
  "IT & Tech Startups":["US","IN","GB","SG","DE"],
};
function getRecCountries(n){const c=(NICHE_COUNTRY_REC[n]||["US","GB","CA","AU","IN"]);return c.map(x=>COUNTRIES.find(co=>co.code===x)).filter(Boolean);}

const SOCIAL_PLATFORMS = [
  {key:"linkedin",name:"LinkedIn",icon:"💼",color:"#0077B5",bgColor:"#E8F4FD",description:"Best for B2B — decision makers, CEOs, founders",
   searchUrl:(n,c)=>`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(n+" "+c)}`,
   companyUrl:(n,c)=>`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(n+" "+c)}`,
   searchTips:["Search: \"[Niche] [Country]\" in People tab","Filter: 2nd degree connections","Filter: Company size 11–200","Sort: Most recent activity"],
   outreachTips:["Connect with personalized note (300 chars)","Message after connection accepted","Engage with posts before pitching","Use Sales Navigator for filters"]},
  {key:"instagram",name:"Instagram",icon:"📸",color:"#E1306C",bgColor:"#FDF0F5",description:"Great for visual businesses — restaurants, fitness, real estate",
   searchUrl:(n)=>`https://www.instagram.com/explore/tags/${encodeURIComponent(n.toLowerCase().replace(/\s+/g,""))}`,
   searchTips:["Search hashtags: #[niche] #[city]business","Accounts 500–50K followers","Check 'similar accounts' on competitors","Use location tags"],
   outreachTips:["DM after liking/commenting 2–3 posts","Mention specific content","Voice DM for higher open rates","Check bio for email first"]},
  {key:"x",name:"X (Twitter)",icon:"𝕏",color:"#14171A",bgColor:"#F5F8FA",description:"Ideal for SaaS, tech, coaches — founders very active",
   searchUrl:(n,c)=>`https://twitter.com/search?q=${encodeURIComponent(n+" "+c+" founder")}&f=user`,
   searchTips:["Search: \"[Niche] founder\" or \"[Niche] CEO\"","Advanced: min_faves:10 for active users","Check who replies to industry influencers","Search: 'looking for [service]'"],
   outreachTips:["Reply to tweets with value first","Retweet with meaningful comment","DM after 2–3 genuine interactions","Reference a specific tweet in DM"]},
];

// ── Helpers ───────────────────────────────────────────────────────────────────
async function callClaude(apiKey, sys, user) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:MODEL,max_tokens:1500,system:sys,messages:[{role:"user",content:user}]}),
  });
  if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e?.error?.message||`HTTP ${res.status}`);}
  return (await res.json()).content.map(b=>b.text||"").join("");
}
function parseJSON(raw){try{return JSON.parse(raw.replace(/```json|```/g,"").trim());}catch{return null;}}
function buildCalendarLink({title,description,startISO,durationMins=60,location=""}){
  const fmt=d=>d.toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
  const s=new Date(startISO),e=new Date(s.getTime()+durationMins*60000);
  return `https://calendar.google.com/calendar/render?${new URLSearchParams({action:"TEMPLATE",text:title,details:description,location,dates:`${fmt(s)}/${fmt(e)}`})}`;
}

// ── Sheets ────────────────────────────────────────────────────────────────────
async function appendSheet(sc,rows,sheet="Leads"){
  if(!sc?.apiKey||!sc?.sheetId) throw new Error("Sheets credentials missing");
  const url=`https://sheets.googleapis.com/v4/spreadsheets/${sc.sheetId}/values/${encodeURIComponent(sheet+"!A1")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS&key=${sc.apiKey}`;
  const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({values:rows})});
  if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e?.error?.message||`Sheets ${res.status}`);}
  return res.json();
}
async function initHeaders(sc,sheet,headers){
  if(!sc?.apiKey||!sc?.sheetId) return;
  const r=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sc.sheetId}/values/${encodeURIComponent(sheet+"!A1")}?key=${sc.apiKey}`);
  if(!r.ok) return;
  const d=await r.json();if(d.values?.length>0) return;
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sc.sheetId}/values/${encodeURIComponent(sheet+"!A1")}?valueInputOption=USER_ENTERED&key=${sc.apiKey}`,
    {method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({values:[headers]})});
}
async function exportLeads(sc,leads,cfg){
  await initHeaders(sc,"Leads",["Timestamp","Business Name","Contact","Title","Email","Website","Phone","Size","Pain Point","Source","Niche","Service","Country","Verified"]);
  const ts=new Date().toLocaleString();
  await appendSheet(sc,leads.map(l=>[ts,l.name||"",l.contact||"",l.title||"",l.email||"",l.website||"",l.phone||"",l.size||"",l.pain_point||"",l.platform||"",cfg.niche||"",cfg.service||"",cfg.country||"",l.verified?"✅":"❓"]),"Leads");
}
async function exportWorkflow(sc,stages,cfg){
  await initHeaders(sc,"Workflows",["Timestamp","Niche","Service","Country","Company","Stage","Status","Content Preview"]);
  const ts=new Date().toLocaleString();const labels={leads:"Lead Research",email:"Outreach Email",followup:"Follow Up",proposal:"Proposal",meeting:"Meeting"};
  const rows=Object.entries(stages).filter(([,v])=>v?.status==="done").map(([k,v])=>[ts,cfg.niche,cfg.service,cfg.country,cfg.companyName||cfg.yourName,labels[k]||k,"Completed",(Array.isArray(v.result)?`${v.result.length} leads`:(v.result||"").substring(0,200))]);
  if(rows.length>0) await appendSheet(sc,rows,"Workflows");
}
async function exportAction(sc,lead,type,content,cfg){
  await initHeaders(sc,"Actions",["Timestamp","Business Name","Contact","Email","Source","Action","Niche","Service","Country","Content"]);
  await appendSheet(sc,[[new Date().toLocaleString(),lead.name,lead.contact,lead.email,lead.platform||"",type,cfg.niche,cfg.service,cfg.country,content.substring(0,300)]],"Actions");
}
async function logSentEmail(sc,{to,subject,lead,cfg}){
  await initHeaders(sc,"Sent Emails",["Timestamp","To","Subject","Business","Contact","Niche","Service","Country","Status"]);
  await appendSheet(sc,[[new Date().toLocaleString(),to,subject,lead?.name||"",lead?.contact||"",cfg.niche,cfg.service,cfg.country,"✅ Sent"]],"Sent Emails");
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS=["⚙️ Setup","📥 Real Leads","🔍 Social","🚀 Workflow","📧 Send Emails","👥 Pipeline","📅 Meetings","📁 Portfolio","🎯 Freelance","🗂️ Projects","📊 Data Store","👑 Admin"];
const DEFAULT_CONFIG={niche:"E-commerce Stores",service:"Web Design & Development",country:"United States",price:"$500 – $2,000",calendlyLink:"",yourName:"",yourEmail:"",companyName:"",googleClientId:""};
const DEFAULT_SHEETS={apiKey:"",sheetId:"",enabled:false};
const DEFAULT_API_KEYS={hunter:"",apollo:"",places:""};
const STAGE_KEYS=["leads","email","followup","proposal","meeting"];
const STAGE_META=[{key:"leads",icon:"🔍",label:"Lead Research"},{key:"email",icon:"✉️",label:"Outreach Email"},{key:"followup",icon:"🔁",label:"Follow Up"},{key:"proposal",icon:"📄",label:"Proposal"},{key:"meeting",icon:"📅",label:"Meeting"}];

// ── Reusable UI ───────────────────────────────────────────────────────────────
function SearchableDropdown({label,value,onChange,options,placeholder,renderOption,renderValue,icon}){
  const [open,setOpen]=useState(false);const [search,setSearch]=useState("");const ref=useRef(null);
  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  const filtered=typeof options[0]==="string"?options.filter(o=>o.toLowerCase().includes(search.toLowerCase())):options.filter(o=>(o.name||o).toLowerCase().includes(search.toLowerCase()));
  return(<div className="field" ref={ref}><label>{icon&&<span>{icon} </span>}{label}</label>
    <div className="dropdown-wrap">
      <button className="dropdown-trigger" onClick={()=>{setOpen(!open);setSearch("");}}>
        <span className={value?"dropdown-val":"dropdown-placeholder"}>{value?(renderValue?renderValue(value):value):placeholder}</span>
        <span className="dropdown-arrow">{open?"▲":"▼"}</span>
      </button>
      {open&&<div className="dropdown-menu">
        <div className="dropdown-search-wrap"><input autoFocus className="dropdown-search" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <div className="dropdown-list">
          {filtered.length===0&&<div className="dropdown-empty">No results</div>}
          {filtered.map((opt,i)=>{const v=typeof opt==="string"?opt:opt.name;return(
            <div key={i} className={`dropdown-item ${value===v?"selected":""}`} onClick={()=>{onChange(v);setOpen(false);}}>
              {renderOption?renderOption(opt):opt}{value===v&&<span className="dropdown-check">✓</span>}
            </div>);})}
        </div>
      </div>}
    </div>
  </div>);
}
function CountrySelector({value,onChange,niche}){
  const [mode,setMode]=useState("recommended");
  const rec=getRecCountries(niche);const cur=COUNTRIES.find(c=>c.name===value);
  return(<div className="field"><label>🌍 Target Country</label>
    <div className="country-tabs">
      <button className={`country-tab-btn ${mode==="recommended"?"active":""}`} onClick={()=>setMode("recommended")}>⭐ Recommended</button>
      <button className={`country-tab-btn ${mode==="all"?"active":""}`} onClick={()=>setMode("all")}>🌐 All</button>
    </div>
    {mode==="recommended"&&<div className="country-grid">
      {rec.map(c=><button key={c.code} className={`country-chip ${value===c.name?"selected":""}`} onClick={()=>onChange(c.name)}>
        <span>{c.flag}</span><span className="country-name">{c.name}</span><span>{c.tier==="premium"?"💰":"📈"}</span>
      </button>)}
      <div className="country-legend"><span>💰 Premium</span><span>📈 Growth</span></div>
    </div>}
    {mode==="all"&&<SearchableDropdown value={value} onChange={onChange} options={COUNTRIES} placeholder="Select country…"
      renderOption={c=><span className="country-option"><span>{c.flag} {c.name}</span><span className={`tier-badge ${c.tier}`}>{c.tier}</span></span>}
      renderValue={v=>{const c=COUNTRIES.find(x=>x.name===v);return c?`${c.flag} ${c.name}`:v;}}/>}
    {cur&&<div className="country-selected-info"><span>{cur.flag}</span><strong>{cur.name}</strong><span className={`tier-badge ${cur.tier}`}>{cur.tier==="premium"?"High-budget":"Growth"}</span></div>}
  </div>);
}
function ApiKeyBanner({apiKey,setApiKey}){
  const [draft,setDraft]=useState(apiKey);const [show,setShow]=useState(false);const [saved,setSaved]=useState(false);
  const save=()=>{setApiKey(draft.trim());setSaved(true);setTimeout(()=>setSaved(false),2000);};
  return(<div className="api-banner">
    <span className="api-label">🔑 Anthropic API Key</span>{apiKey&&<span className="api-ok">✓ Saved</span>}
    <div className="api-row">
      <input className="api-input" type={show?"text":"password"} placeholder="sk-ant-…" value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&save()}/>
      <button className="btn-ghost" onClick={()=>setShow(!show)}>{show?"🙈":"👁"}</button>
      <button className="btn-primary" onClick={save}>{saved?"✓ Saved!":"Save"}</button>
    </div>
  </div>);
}

// ── Send Approval Modal ───────────────────────────────────────────────────────
function SendApprovalModal({draft,onConfirm,onCancel,sending,gmailProfile}){
  const [subject,setSubject]=useState(draft.subject||"");
  const [body,setBody]=useState(draft.body||"");
  const [to,setTo]=useState(draft.to||"");
  return(<div className="modal-overlay">
    <div className="modal send-modal">
      <div className="modal-header">
        <h3>📧 Review & Send Email</h3>
        <button className="modal-close" onClick={onCancel}>✕</button>
      </div>
      <div className="modal-body">
        <div className="send-from-badge">
          <span>📤 Sending from:</span>
          <strong>{gmailProfile?.emailAddress||"Your Gmail"}</strong>
        </div>
        <div className="field">
          <label>To</label>
          <input type="email" value={to} onChange={e=>setTo(e.target.value)} placeholder="recipient@company.com"/>
        </div>
        <div className="field">
          <label>Subject</label>
          <input type="text" value={subject} onChange={e=>setSubject(e.target.value)}/>
        </div>
        <div className="field">
          <label>Email Body</label>
          <textarea className="email-body-edit" value={body} onChange={e=>setBody(e.target.value)} rows={12}/>
        </div>
        <div className="send-modal-actions">
          <button className="btn-ghost" onClick={onCancel} disabled={sending}>Cancel</button>
          <button className="btn-send" onClick={()=>onConfirm({to,subject,body})} disabled={sending||!to||!subject||!body}>
            {sending?"⏳ Sending…":"📤 Send from Gmail"}
          </button>
        </div>
        <p className="send-note">✅ You're reviewing before sending — nothing goes out until you click Send.</p>
      </div>
    </div>
  </div>);
}

// ── Gmail Setup in Setup Tab ──────────────────────────────────────────────────
function SetupTab({config,setConfig,sheetsConfig,setSheetsConfig,apiKeys,setApiKeys}){
  const f=(key,label,ph,type="text")=>(<div className="field"><label>{label}</label>
    <input type={type} placeholder={ph} value={config[key]||""} onChange={e=>setConfig(c=>({...c,[key]:e.target.value}))}/></div>);
  return(<div className="setup-wrap">
    <div className="setup-grid">
      <div className="card">
        <h3>🎯 Target Configuration</h3>
        <SearchableDropdown label="Target Niche" icon="🏢" value={config.niche} onChange={v=>setConfig(c=>({...c,niche:v}))} options={NICHES} placeholder="Select niche…"/>
        <SearchableDropdown label="Your Service" icon="🛠️" value={config.service} onChange={v=>setConfig(c=>({...c,service:v}))} options={SERVICES} placeholder="Select service…"/>
        <CountrySelector value={config.country} onChange={v=>setConfig(c=>({...c,country:v}))} niche={config.niche}/>
        {f("price","💵 Pricing Range","$500 – $2,000")}
      </div>
      <div className="card">
        <h3>🏢 Your Business Info</h3>
        {f("yourName","👤 Your Name","Rubel Ahmed")}
        {f("yourEmail","📧 Your Email","you@example.com","email")}
        {f("companyName","🏷️ Company Name","Rubel SBS")}
        {f("calendlyLink","📅 Calendly Link","https://calendly.com/you")}
      </div>
      <div className="card api-keys-card">
        <h3>🔑 Lead Source API Keys</h3>
        <p className="hint" style={{marginTop:0,marginBottom:12}}>Add to find <strong>real verified contacts</strong>.</p>
        <div className="field">
          <label>🎯 Hunter.io API Key <a href="https://hunter.io/api-keys" target="_blank" rel="noreferrer" className="get-key-link">Get free →</a></label>
          <input type="password" placeholder="hunter_xxxxxxxxxxxx" value={apiKeys.hunter} onChange={e=>setApiKeys(k=>({...k,hunter:e.target.value}))}/>
          <span className="field-hint">50 free/month • Real emails by domain or company</span>
        </div>
        <div className="field">
          <label>🚀 Apollo.io API Key <a href="https://developer.apollo.io" target="_blank" rel="noreferrer" className="get-key-link">Get free →</a></label>
          <input type="password" placeholder="apollo_xxxxxxxxxxxx" value={apiKeys.apollo} onChange={e=>setApiKeys(k=>({...k,apollo:e.target.value}))}/>
          <span className="field-hint">Free: 50 contacts/month • 275M+ database</span>
        </div>
        <div className="field">
          <label>📍 Google Places API Key <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="get-key-link">Get key →</a></label>
          <input type="password" placeholder="AIzaSy…" value={apiKeys.places} onChange={e=>setApiKeys(k=>({...k,places:e.target.value}))}/>
          <span className="field-hint">Find local businesses with phone + address</span>
        </div>
        <div className="api-keys-status">
          {["hunter","apollo","places"].map(k=>(
            <div key={k} className={`api-key-badge ${apiKeys[k]?"active":""}`}>{apiKeys[k]?"✅":"⬜"} {k.charAt(0).toUpperCase()+k.slice(1)}</div>
          ))}
        </div>
      </div>
    </div>
    {/* Gmail OAuth */}
    <div className="card gmail-setup-card">
      <h3>📧 Gmail Integration — Send Emails Directly</h3>
      <p className="hint" style={{marginTop:0,marginBottom:14}}>Connect your Gmail to send outreach emails with one click — with your approval before every send.</p>
      <div className="field">
        <label>🔑 Google OAuth Client ID <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="get-key-link">Create credential →</a></label>
        <input type="text" placeholder="123456789-abc.apps.googleusercontent.com" value={config.googleClientId||""} onChange={e=>setConfig(c=>({...c,googleClientId:e.target.value}))}/>
        <span className="field-hint">Create OAuth 2.0 Client ID → Web Application → Authorized origins: your domain</span>
      </div>
      <div className="gmail-setup-steps">
        <div className="step"><span className="step-num">1</span><span>Go to Google Cloud Console → APIs & Services → Credentials</span></div>
        <div className="step"><span className="step-num">2</span><span>Create Credentials → OAuth 2.0 Client ID → Web Application</span></div>
        <div className="step"><span className="step-num">3</span><span>Add your site URL to "Authorized JavaScript origins"</span></div>
        <div className="step"><span className="step-num">4</span><span>Enable Gmail API in APIs & Services → Library</span></div>
        <div className="step"><span className="step-num">5</span><span>Paste Client ID above → go to 📧 Send Emails tab → Connect</span></div>
      </div>
    </div>
    {/* Google Sheets */}
    <div className="card sheets-card">
      <div className="sheets-header">
        <h3>📊 Google Sheets Auto-Save</h3>
        <label className="toggle-wrap">
          <input type="checkbox" checked={sheetsConfig.enabled} onChange={e=>setSheetsConfig(c=>({...c,enabled:e.target.checked}))}/>
          <span className="toggle-slider"></span><span className="toggle-label">{sheetsConfig.enabled?"Enabled":"Disabled"}</span>
        </label>
      </div>
      {sheetsConfig.enabled&&<div className="sheets-fields">
        <div className="field"><label>🔑 Sheets API Key</label><input type="password" placeholder="AIzaSy…" value={sheetsConfig.apiKey} onChange={e=>setSheetsConfig(c=>({...c,apiKey:e.target.value}))}/></div>
        <div className="field"><label>📋 Spreadsheet ID</label><input type="text" placeholder="1BxiMVs0X…" value={sheetsConfig.sheetId} onChange={e=>setSheetsConfig(c=>({...c,sheetId:e.target.value}))}/></div>
      </div>}
    </div>
  </div>);
}

// ── EMAIL SENDER TAB ──────────────────────────────────────────────────────────
function EmailSenderTab({config,apiKey,stages,sheetsConfig,gmailState,setGmailState}){
  const {token,profile,connected} = gmailState;
  const [connecting,setConnecting]=useState(false);
  const [connectError,setConnectError]=useState("");
  const [leads,setLeads]=useState(()=>Array.isArray(stages.leads?.result)?stages.leads.result:[]);
  const [selectedLead,setSelectedLead]=useState(null);
  const [generating,setGenerating]=useState(false);
  const [emailType,setEmailType]=useState("cold");
  const [draft,setDraft]=useState(null);
  const [showApproval,setShowApproval]=useState(false);
  const [sending,setSending]=useState(false);
  const [sentLog,setSentLog]=useState(()=>{try{return JSON.parse(localStorage.getItem("cf_sent")||"[]");}catch{return [];}});
  const [sendSuccess,setSendSuccess]=useState(null);
  const [bulkMode,setBulkMode]=useState(false);
  const [bulkQueue,setBulkQueue]=useState([]);
  const [bulkIdx,setBulkIdx]=useState(0);

  // Sync leads from stages
  useEffect(()=>{
    if(Array.isArray(stages.leads?.result)&&stages.leads.result.length>0) setLeads(stages.leads.result);
  },[stages.leads]);

  useEffect(()=>{localStorage.setItem("cf_sent",JSON.stringify(sentLog));},[sentLog]);

  async function connectGmail(){
    if(!config.googleClientId){setConnectError("Add your Google OAuth Client ID in ⚙️ Setup first.");return;}
    setConnecting(true);setConnectError("");
    try{
      const t=await initGmailAuth(config.googleClientId);
      const p=await getGmailProfile(t);
      setGmailState({token:t,profile:p,connected:true});
    }catch(e){setConnectError(e.message);}
    setConnecting(false);
  }

  function disconnectGmail(){
    clearGmailToken();setGmailState({token:null,profile:null,connected:false});
  }

  async function generateDraft(lead,type){
    if(!apiKey){alert("Anthropic API key required.");return;}
    setGenerating(true);setDraft(null);setSendSuccess(null);
    try{
      let prompt="";
      const baseInfo=`Sender: ${config.yourName||"us"} from ${config.companyName||config.service}. Price: ${config.price}.`;
      if(type==="cold")
        prompt=`Write a cold outreach email to ${lead.contact} at ${lead.name}. Service: ${config.service}. Pain: ${lead.pain_point||"scaling online presence"}. ${baseInfo} Max 130 words. Include subject line on first line as "Subject: ...".`;
      else if(type==="followup")
        prompt=`Write a follow-up email to ${lead.contact} at ${lead.name} who hasn't replied yet. Reference our ${config.service} offer. Add a new value point. ${baseInfo} Max 100 words. Include subject line as "Subject: Re: ...".`;
      else if(type==="proposal")
        prompt=`Write a brief proposal email to ${lead.contact} at ${lead.name} attaching a proposal for ${config.service}. Pain: ${lead.pain_point}. Investment: ${config.price}. ${baseInfo} Max 150 words. Include subject line as "Subject: Proposal for ...".`;
      else if(type==="meeting")
        prompt=`Write a meeting request email to ${lead.contact} at ${lead.name} for a 30-min discovery call about ${config.service}. ${config.calendlyLink?`Booking: ${config.calendlyLink}`:"Ask for availability."} ${baseInfo} Max 100 words. Include subject line as "Subject: Quick 30-min chat ...".`;

      const raw=await callClaude(apiKey,"You are an expert cold email copywriter. Write concise, human, high-converting emails.",prompt);
      const parsed=parseEmailText(raw);
      setDraft({...parsed,to:lead.email,lead});
    }catch(e){alert("Error: "+e.message);}
    setGenerating(false);
  }

  async function confirmSend({to,subject,body}){
    if(!token){alert("Connect Gmail first.");return;}
    setSending(true);
    try{
      const from=`${config.yourName||config.companyName||""} <${profile?.emailAddress||""}>`;
      await gmailSend(token,{from,to,subject,body});
      const entry={to,subject,leadName:draft?.lead?.name||"",sentAt:new Date().toISOString(),type:emailType};
      setSentLog(l=>[entry,...l]);
      if(sheetsConfig.enabled&&sheetsConfig.apiKey&&sheetsConfig.sheetId){
        try{await logSentEmail(sheetsConfig,{to,subject,lead:draft?.lead,cfg:config});}catch(e){console.warn(e);}
      }
      setSendSuccess({to,subject});
      setShowApproval(false);setDraft(null);
    }catch(e){alert("Send failed: "+e.message);}
    setSending(false);
  }

  // Bulk: generate + queue all leads
  async function startBulkSend(){
    if(!apiKey){alert("API key required.");return;}
    if(!connected){alert("Connect Gmail first.");return;}
    if(leads.filter(l=>l.email).length===0){alert("No leads with email addresses.");return;}
    setBulkMode(true);setBulkIdx(0);
    const queue=leads.filter(l=>l.email);
    setBulkQueue(queue);
    // Generate first draft
    await generateDraft(queue[0],emailType);
  }

  async function bulkNext(){
    const next=bulkIdx+1;
    if(next>=bulkQueue.length){setBulkMode(false);alert("✅ Bulk send complete!");return;}
    setBulkIdx(next);
    await generateDraft(bulkQueue[next],emailType);
  }

  const hasEmail=leads.filter(l=>l.email).length;

  return(<div className="email-sender-wrap">
    {showApproval&&draft&&(
      <SendApprovalModal draft={draft} onConfirm={confirmSend} onCancel={()=>setShowApproval(false)} sending={sending} gmailProfile={profile}/>
    )}

    <div className="email-sender-header">
      <h2>📧 Send Emails</h2>
      <p className="sub">Generate → Review → Send with one click from your Gmail</p>
    </div>

    {/* Gmail Connection */}
    <div className={`gmail-connect-card card ${connected?"connected":""}`}>
      {connected?(
        <div className="gmail-connected">
          <div className="gmail-profile">
            <div className="gmail-avatar">📧</div>
            <div><div className="gmail-email">{profile?.emailAddress}</div><div className="gmail-status">✅ Gmail Connected</div></div>
          </div>
          <button className="btn-ghost" onClick={disconnectGmail}>Disconnect</button>
        </div>
      ):(
        <div className="gmail-disconnected">
          <div className="gmail-icon-big">📧</div>
          <div>
            <h3>Connect Your Gmail</h3>
            <p>Authorize once — then send outreach emails directly from your account with your approval before every send.</p>
            {connectError&&<div className="error-banner" style={{marginTop:8}}>❌ {connectError}</div>}
            {!config.googleClientId&&<div className="needs-key-banner" style={{marginTop:8}}>⚠️ Add Google OAuth Client ID in ⚙️ Setup first.</div>}
          </div>
          <button className="btn-primary btn-gmail-connect" onClick={connectGmail} disabled={connecting||!config.googleClientId}>
            {connecting?"⏳ Connecting…":"🔐 Connect Gmail"}
          </button>
        </div>
      )}
    </div>

    {connected&&(<>
      {/* Workflow */}
      <div className="send-workflow card">
        <h3>⚡ How it works</h3>
        <div className="send-steps">
          <div className="send-step"><span>1️⃣</span><span>Select lead</span></div>
          <div className="send-arrow">→</div>
          <div className="send-step"><span>2️⃣</span><span>Choose email type</span></div>
          <div className="send-arrow">→</div>
          <div className="send-step"><span>3️⃣</span><span>AI drafts email</span></div>
          <div className="send-arrow">→</div>
          <div className="send-step"><span>4️⃣</span><span>You review & edit</span></div>
          <div className="send-arrow">→</div>
          <div className="send-step"><span>5️⃣</span><span>Click Send ✅</span></div>
        </div>
      </div>

      {/* Email type selector */}
      <div className="card">
        <h3>📨 Email Type</h3>
        <div className="email-type-grid">
          {[["cold","❄️","Cold Outreach","First contact — introduces you and the problem"],
            ["followup","🔁","Follow Up","For leads who haven't replied in 3–5 days"],
            ["proposal","📄","Proposal Email","Sending your proposal / pricing"],
            ["meeting","📅","Meeting Request","Asking for a 30-min discovery call"]].map(([k,icon,label,desc])=>(
            <button key={k} className={`email-type-card ${emailType===k?"active":""}`} onClick={()=>setEmailType(k)}>
              <span className="et-icon">{icon}</span>
              <div><div className="et-label">{label}</div><div className="et-desc">{desc}</div></div>
            </button>
          ))}
        </div>
      </div>

      {/* Lead selector + generator */}
      <div className="send-panel">
        {/* Lead List */}
        <div className="card send-leads-list">
          <h3>👥 Leads ({hasEmail} with email)</h3>
          {leads.length===0&&<div className="empty-mini">Import leads first in 📥 Real Leads tab.</div>}
          {leads.map((lead,i)=>(
            <div key={i} className={`send-lead-row ${selectedLead===i?"active":""} ${!lead.email?"no-email":""}`}
              onClick={()=>lead.email&&setSelectedLead(i)}>
              <div>
                <div className="send-lead-name">{lead.name}</div>
                <div className="send-lead-email">{lead.email||"❌ No email"}</div>
              </div>
              {lead.verified&&<span className="badge-verified">✅</span>}
            </div>
          ))}
        </div>

        {/* Draft area */}
        <div className="card send-draft-area">
          {selectedLead===null?(
            <div className="empty-mini" style={{padding:40,textAlign:"center"}}>
              <div style={{fontSize:40,marginBottom:12}}>👈</div>
              <p>Select a lead to generate an email</p>
            </div>
          ):(()=>{
            const lead=leads[selectedLead];
            return(<div>
              <div className="draft-lead-info">
                <strong>{lead.name}</strong>
                <span>{lead.contact}</span>
                <a href={`mailto:${lead.email}`}>{lead.email}</a>
                {lead.pain_point&&<span className="draft-pain">💡 {lead.pain_point}</span>}
              </div>
              <div className="draft-actions">
                <button className="btn-primary" onClick={()=>generateDraft(lead,emailType)} disabled={generating}>
                  {generating?"⏳ Drafting…":"🤖 Generate Draft"}
                </button>
                {bulkMode?(
                  <div className="bulk-progress">
                    <span>Bulk send: {bulkIdx+1}/{bulkQueue.length}</span>
                    <button className="btn-ghost" onClick={()=>setBulkMode(false)}>Stop bulk</button>
                  </div>
                ):(
                  hasEmail>1&&<button className="btn-secondary" onClick={startBulkSend} disabled={generating}>📨 Bulk Send All ({hasEmail})</button>
                )}
              </div>

              {sendSuccess&&<div className="send-success">✅ Sent to {sendSuccess.to} — "{sendSuccess.subject}"</div>}

              {draft&&draft.lead===lead&&(
                <div className="draft-preview">
                  <div className="draft-preview-header">
                    <h4>📝 Draft Preview</h4>
                    <span className="draft-hint">Review below — you can edit before sending</span>
                  </div>
                  <div className="draft-field"><label>To</label><div className="draft-val">{draft.to}</div></div>
                  <div className="draft-field"><label>Subject</label><div className="draft-val">{draft.subject}</div></div>
                  <div className="draft-field"><label>Body</label><div className="draft-body">{draft.body}</div></div>
                  <div className="draft-send-actions">
                    <button className="btn-ghost copy-btn" onClick={()=>navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`)}>📋 Copy</button>
                    <button className="btn-send" onClick={()=>setShowApproval(true)}>📤 Review & Send</button>
                    {bulkMode&&<button className="btn-secondary" onClick={bulkNext}>Skip → Next Lead</button>}
                  </div>
                </div>
              )}
            </div>);
          })()}
        </div>
      </div>

      {/* Sent Log */}
      {sentLog.length>0&&(
        <div className="card">
          <h3>📬 Sent Emails ({sentLog.length})</h3>
          <div className="sent-log">
            {sentLog.slice(0,20).map((s,i)=>(
              <div key={i} className="sent-row">
                <div className="sent-row-main">
                  <span className="sent-to">{s.to}</span>
                  <span className="sent-subject">{s.subject}</span>
                </div>
                <div className="sent-row-meta">
                  <span className="sent-type">{s.type}</span>
                  <span className="sent-time">{new Date(s.sentAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>)}
  </div>);
}

// ── REAL LEAD FINDER TAB ──────────────────────────────────────────────────────
function RealLeadFinderTab({config,apiKey,apiKeys,sheetsConfig,onLeadsFound}){
  const [source,setSource]=useState("csv");const [loading,setLoading]=useState(false);
  const [results,setResults]=useState([]);const [error,setError]=useState("");
  const [enriching,setEnriching]=useState(false);const [enriched,setEnriched]=useState({});
  const [csvText,setCsvText]=useState("");
  const [hunterMode,setHunterMode]=useState("domain");const [hunterInput,setHunterInput]=useState("");
  const [apolloTitle,setApolloTitle]=useState("owner,founder,ceo,director");const [apolloPage,setApolloPage]=useState(1);
  const [placesLocation,setPlacesLocation]=useState("");const [placesKeyword,setPlacesKeyword]=useState("");

  async function find(){
    setLoading(true);setError("");setResults([]);setEnriched({});
    try{
      let leads=[];
      if(source==="csv"){leads=parseCSVLeads(csvText);if(leads.length===0)throw new Error("No leads found. Check your CSV format.");}
      else if(source==="hunter"){
        if(!apiKeys.hunter)throw new Error("Hunter.io API key required — add in ⚙️ Setup.");
        if(!hunterInput.trim())throw new Error("Enter a domain or company name.");
        leads=hunterMode==="domain"?await hunterDomainSearch(apiKeys.hunter,hunterInput.trim()):await hunterCompanySearch(apiKeys.hunter,hunterInput.trim());
        if(leads.length===0)throw new Error("No emails found. Try a different domain.");
      }
      else if(source==="apollo"){
        if(!apiKeys.apollo)throw new Error("Apollo.io API key required — add in ⚙️ Setup.");
        leads=await apolloSearch(apiKeys.apollo,{niche:config.niche,country:config.country,title:apolloTitle,page:apolloPage});
        if(leads.length===0)throw new Error("No results. Try broader niche or different country.");
      }
      else if(source==="places"){
        if(!apiKeys.places)throw new Error("Google Places API key required — add in ⚙️ Setup.");
        leads=await googlePlacesSearch(apiKeys.places,{keyword:placesKeyword||config.niche,location:placesLocation||config.country});
        if(leads.length===0)throw new Error("No places found. Try a specific city.");
      }
      else if(source==="ai"){
        if(!apiKey)throw new Error("Anthropic API key required.");
        const raw=await callClaude(apiKey,"You are a B2B lead expert. Return ONLY valid JSON.",
          `Generate 6 sample ${config.niche} leads in ${config.country} needing ${config.service}.
JSON: [{"name":"Biz","contact":"Name","email":"name@bizname.com","website":"https://bizname.com","pain_point":"specific problem","size":"small","platform":"AI Demo","verified":false}]
Use realistic domains matching the business name. Not example.com.`);
        leads=parseJSON(raw)||[];
      }
      setResults(leads);
    }catch(e){setError(e.message);}
    setLoading(false);
  }

  async function enrichLead(lead,idx){
    if(!apiKey){alert("API key required.");return;}
    setEnriching(true);
    try{
      const text=await callClaude(apiKey,"You are a B2B sales researcher. Return ONLY valid JSON.",
        `Research and identify pain points for:
Business: ${lead.name}, Website: ${lead.website||"unknown"}, Industry: ${config.niche}, Country: ${config.country}
Return JSON: {"pain_point":"specific pain","best_service":"which service fits","opening_line":"1 sentence ice-breaker","score":1-10}`);
      const data=parseJSON(text)||{};
      setEnriched(e=>({...e,[idx]:{...data,enriched:true}}));
      setResults(r=>r.map((l,i)=>i===idx?{...l,pain_point:data.pain_point||l.pain_point,opening_line:data.opening_line||"",score:data.score}:l));
    }catch(e){console.warn("Enrich failed:",e.message);}
    setEnriching(false);
  }

  const realLeads=results.filter(l=>l.email);const verifiedLeads=results.filter(l=>l.verified);
  const src=REAL_LEAD_SOURCES.find(s=>s.key===source);

  return(<div className="real-lead-wrap">
    <div className="real-lead-header"><h2>📥 Real Lead Finder</h2>
      <p className="sub">Find <strong>real verified contacts</strong> — import from Hunter.io, Apollo.io, Google Places, or paste CSV.</p>
    </div>
    <div className="source-tabs">
      {REAL_LEAD_SOURCES.map(s=>(
        <button key={s.key} className={`source-tab ${source===s.key?"active":""}`} onClick={()=>{setSource(s.key);setResults([]);setError("");}}>
          <span className="source-tab-icon">{s.icon}</span>
          <div><div className="source-tab-name">{s.name}</div><div className="source-tab-desc">{s.desc}</div></div>
          {s.key!=="ai"&&s.key!=="csv"&&!apiKeys[s.key]&&<span className="needs-key">needs key</span>}
          {(s.key==="hunter"||s.key==="apollo"||s.key==="places")&&apiKeys[s.key]&&<span className="key-ok">✅ ready</span>}
        </button>
      ))}
    </div>
    <div className="source-form card">
      {source==="csv"&&<div>
        <h3>📋 Paste CSV / Tab-Separated Data</h3>
        <p className="hint" style={{marginBottom:12}}>Paste from LinkedIn Sales Nav, Apollo export, or any spreadsheet. Headers auto-detected.<br/><strong>Columns:</strong> Company, Contact, Email, Website, Phone, LinkedIn, Title, Size, Notes</p>
        <div className="csv-example"><div className="csv-example-title">📌 Example:</div>
          <code>Company,Contact,Email,Website,Title{"\n"}Acme Corp,John Smith,john@acme.com,https://acme.com,CEO</code></div>
        <textarea className="csv-textarea" placeholder={"Paste your CSV here…"} value={csvText} onChange={e=>setCsvText(e.target.value)} rows={8}/>
        <div className="form-actions"><button className="btn-primary" onClick={find} disabled={loading||!csvText.trim()}>{loading?"⏳ Parsing…":"📋 Import Leads"}</button></div>
      </div>}
      {source==="hunter"&&<div>
        <h3>🎯 Hunter.io — Find Real Emails</h3>
        {!apiKeys.hunter&&<div className="needs-key-banner">⚠️ Add Hunter.io API key in ⚙️ Setup. <a href="https://hunter.io/api-keys" target="_blank" rel="noreferrer">Get free →</a></div>}
        <div className="mode-toggle">
          <button className={`mode-btn ${hunterMode==="domain"?"active":""}`} onClick={()=>setHunterMode("domain")}>🌐 By Domain</button>
          <button className={`mode-btn ${hunterMode==="company"?"active":""}`} onClick={()=>setHunterMode("company")}>🏢 By Company</button>
        </div>
        <div className="field"><label>{hunterMode==="domain"?"Domain":"Company Name"}</label>
          <input type="text" placeholder={hunterMode==="domain"?"shopify.com":"Shopify Inc"} value={hunterInput} onChange={e=>setHunterInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&find()}/>
          <span className="field-hint">{hunterMode==="domain"?"No https:// needed":"Exact company name"}</span>
        </div>
        <div className="form-actions"><button className="btn-primary" onClick={find} disabled={loading||!apiKeys.hunter||!hunterInput.trim()}>{loading?"⏳ Searching…":"🎯 Find Emails"}</button></div>
        <div className="hunter-tips"><div className="tip-item">✦ 50 free searches/month</div><div className="tip-item">✦ Find domain from LinkedIn → Company Page → Website</div></div>
      </div>}
      {source==="apollo"&&<div>
        <h3>🚀 Apollo.io — 275M+ Real Contacts</h3>
        {!apiKeys.apollo&&<div className="needs-key-banner">⚠️ Add Apollo.io API key in ⚙️ Setup. <a href="https://developer.apollo.io" target="_blank" rel="noreferrer">Get free →</a></div>}
        <div className="apollo-fields">
          <div className="field"><label>🏢 Industry</label><input value={config.niche} readOnly style={{opacity:.7}}/><span className="field-hint">From Setup</span></div>
          <div className="field"><label>👤 Titles</label><input value={apolloTitle} onChange={e=>setApolloTitle(e.target.value)} placeholder="owner,founder,ceo,director"/></div>
          <div className="field"><label>🌍 Country</label><input value={config.country} readOnly style={{opacity:.7}}/></div>
          <div className="field"><label>📄 Page</label><input type="number" min="1" max="10" value={apolloPage} onChange={e=>setApolloPage(+e.target.value)}/><span className="field-hint">10 results per page</span></div>
        </div>
        <div className="form-actions">
          <button className="btn-primary" onClick={find} disabled={loading||!apiKeys.apollo}>{loading?"⏳ Searching…":"🚀 Search Apollo"}</button>
        </div>
        <div className="hunter-tips"><div className="tip-item">✦ Free: 50 contacts/month, 10 email exports</div><div className="tip-item">✦ Upgrade for more real emails</div></div>
      </div>}
      {source==="places"&&<div>
        <h3>📍 Google Places — Local Businesses</h3>
        {!apiKeys.places&&<div className="needs-key-banner">⚠️ Add Google Places API key in ⚙️ Setup. <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer">Get key →</a></div>}
        <div className="apollo-fields">
          <div className="field"><label>🔍 Business Type</label><input value={placesKeyword||config.niche} onChange={e=>setPlacesKeyword(e.target.value)} placeholder="gym, restaurant, dental…"/></div>
          <div className="field"><label>📍 City</label><input value={placesLocation} onChange={e=>setPlacesLocation(e.target.value)} placeholder="New York City, London…"/></div>
        </div>
        <div className="form-actions"><button className="btn-primary" onClick={find} disabled={loading||!apiKeys.places||!placesLocation}>{loading?"⏳ Searching…":"📍 Find Local Businesses"}</button></div>
        <div className="places-note"><strong>Note:</strong> Places gives phone + address. Use Hunter.io to find emails after importing.</div>
      </div>}
      {source==="ai"&&<div>
        <h3>🤖 AI Demo Leads</h3>
        <div className="ai-demo-warning">⚠️ <strong>NOT real people.</strong> For outreach, use Hunter.io, Apollo, Places, or CSV.</div>
        <p className="hint">Sample leads for: <strong>{config.niche}</strong> in <strong>{config.country}</strong></p>
        <div className="form-actions"><button className="btn-primary" onClick={find} disabled={loading||!apiKey}>{loading?"⏳ Generating…":"🤖 Generate Demo"}</button></div>
      </div>}
    </div>
    {error&&<div className="error-banner">❌ {error}</div>}
    {results.length>0&&<div className="results-section">
      <div className="results-header">
        <div className="results-stats">
          <span className="stat-pill">{results.length} leads</span>
          {realLeads.length>0&&<span className="stat-pill green">{realLeads.length} with email</span>}
          {verifiedLeads.length>0&&<span className="stat-pill blue">{verifiedLeads.length} verified ✅</span>}
        </div>
        <div className="results-actions">
          {apiKey&&<button className="btn-secondary" onClick={async()=>{for(let i=0;i<results.length;i++){if(!enriched[i])await enrichLead(results[i],i);}}} disabled={enriching}>{enriching?"⏳ Enriching…":"🤖 Enrich All"}</button>}
          <button className="btn-success" onClick={()=>onLeadsFound(results)}>🚀 Use in Workflow</button>
          {sheetsConfig.enabled&&<button className="btn-secondary" onClick={async()=>{try{await exportLeads(sheetsConfig,results,config);alert("✅ Exported!");}catch(e){alert("❌ "+e.message);}}}>📊 Save to Sheets</button>}
        </div>
      </div>
      <div className="leads-grid">
        {results.map((lead,i)=>(
          <div key={i} className={`real-lead-card ${lead.verified?"verified":""}`}>
            <div className="rlc-header">
              <div><strong className="rlc-name">{lead.name}</strong>{lead.title&&<div className="rlc-title">{lead.title}</div>}</div>
              <div className="rlc-badges">
                {lead.verified&&<span className="badge-verified">✅ Verified</span>}
                {lead.score&&<span className="badge-score">⭐ {lead.score}/10</span>}
                <span className="badge-source">{lead.platform}</span>
              </div>
            </div>
            <div className="rlc-contact">👤 {lead.contact}</div>
            {lead.email?<div className="rlc-email">📧 <a href={`mailto:${lead.email}`}>{lead.email}</a>{lead.confidence&&<span className="confidence">{lead.confidence}%</span>}</div>
              :<div className="rlc-email no-email">📧 No email — use Hunter.io to find</div>}
            {lead.website&&<div className="rlc-site">🌐 <a href={lead.website} target="_blank" rel="noreferrer">{lead.website}</a></div>}
            {lead.phone&&<div className="rlc-phone">📞 {lead.phone}</div>}
            {lead.linkedin&&<div className="rlc-li">💼 <a href={lead.linkedin} target="_blank" rel="noreferrer">LinkedIn</a></div>}
            {lead.address&&<div className="rlc-addr">📍 {lead.address}</div>}
            {lead.rating&&<div className="rlc-rating">⭐ {lead.rating} Google Rating</div>}
            <div className="rlc-pain">💡 {enriched[i]?.pain_point||lead.pain_point}</div>
            {lead.opening_line&&<div className="rlc-opener">🎯 {lead.opening_line}</div>}
            {!enriched[i]&&lead.website&&<button className="btn-enrich" onClick={()=>enrichLead(lead,i)} disabled={enriching}>🤖 Enrich</button>}
          </div>
        ))}
      </div>
    </div>}
  </div>);
}

// ── Social Lead Finder Tab ────────────────────────────────────────────────────
function SocialLeadFinderTab({config,apiKey,onLeadsFound}){
  const [activePlatform,setActivePlatform]=useState("linkedin");
  const [leads,setLeads]=useState(null);const [generating,setGenerating]=useState(false);
  const [script,setScript]=useState(null);const [generatingScript,setGeneratingScript]=useState(false);
  const platform=SOCIAL_PLATFORMS.find(p=>p.key===activePlatform);

  async function generateLeads(){
    if(!apiKey){alert("API key required.");return;}
    setGenerating(true);setLeads(null);setScript(null);
    try{
      const raw=await callClaude(apiKey,"You are a B2B social lead expert. Return ONLY valid JSON.",
        `Generate 6 ${config.niche} leads in ${config.country} found on ${platform.name} needing ${config.service}.
JSON: [{"name":"Business","contact":"Name","email":"name@bizname.com","website":"https://...","pain_point":"problem","size":"small","platform":"${platform.name}","platform_handle":"@handle","platform_activity":"what they post","best_approach":"opening line"}]`);
      setLeads(parseJSON(raw)||[]);
    }catch(e){alert("Error: "+e.message);}
    setGenerating(false);
  }

  async function generateScript(){
    if(!apiKey||!leads) return;
    setGeneratingScript(true);setScript(null);
    try{
      const lead=leads[0];
      const text=await callClaude(apiKey,`You are a ${platform.name} outreach expert.`,
        `Write a 4-message ${platform.name} sequence for ${config.yourName||"us"} / ${config.companyName||config.service}.
Target: ${config.niche} in ${config.country}. Service: ${config.service}. Price: ${config.price}.
Lead: ${lead.name} — Pain: ${lead.pain_point}.
Messages: 1) Connect/Follow, 2) First message (value only), 3) Day 3–5 soft pitch, 4) Day 7–10 CTA.
Label each message clearly.`);
      setScript(text);
    }catch(e){alert("Error: "+e.message);}
    setGeneratingScript(false);
  }

  return(<div className="real-lead-wrap">
    <div className="real-lead-header"><h2>🔍 Social Media Lead Finder</h2>
      <p className="sub">Find prospects on LinkedIn, Instagram & X with platform-specific outreach scripts</p>
      <div className="workflow-target-badge">{COUNTRIES.find(c=>c.name===config.country)?.flag} {config.country} · {config.niche}</div>
    </div>
    <div className="platform-tabs">
      {SOCIAL_PLATFORMS.map(p=>(
        <button key={p.key} className={`platform-tab ${activePlatform===p.key?"active":""}`}
          style={activePlatform===p.key?{borderColor:p.color,background:p.bgColor,color:p.color}:{}}
          onClick={()=>{setActivePlatform(p.key);setLeads(null);setScript(null);}}>
          <span className="platform-tab-icon">{p.icon}</span><span>{p.name}</span>
        </button>
      ))}
    </div>
    <div className="platform-info-panel card" style={{borderColor:platform.color,background:platform.bgColor}}>
      <div className="platform-info-header" style={{color:platform.color}}>
        <span style={{fontSize:36}}>{platform.icon}</span>
        <div><h3 style={{color:platform.color}}>{platform.name} Strategy</h3><p className="platform-desc">{platform.description}</p></div>
      </div>
      <div className="platform-tips-grid">
        <div className="tips-section"><div className="tips-title">🔎 Search</div>{platform.searchTips.map((t,i)=><div key={i} className="tip-item">✦ {t}</div>)}</div>
        <div className="tips-section"><div className="tips-title">💬 Outreach</div>{platform.outreachTips.map((t,i)=><div key={i} className="tip-item">✦ {t}</div>)}</div>
      </div>
      <div className="platform-search-links">
        <a href={platform.searchUrl(config.niche,config.country)} target="_blank" rel="noreferrer" className="platform-link-btn" style={{background:platform.color}}>🔗 Open {platform.name} Search</a>
        {platform.companyUrl&&<a href={platform.companyUrl(config.niche,config.country)} target="_blank" rel="noreferrer" className="platform-link-btn-outline" style={{color:platform.color,borderColor:platform.color}}>🏢 Companies</a>}
      </div>
    </div>
    <div className="card">
      <h3>🤖 Script Generator</h3>
      <div className="ai-lead-actions">
        <button className="btn-primary" onClick={generateLeads} disabled={generating}>{generating?"⏳ Finding…":`${platform.icon} Generate Sample Leads`}</button>
        {leads&&<button className="btn-secondary" onClick={generateScript} disabled={generatingScript}>{generatingScript?"⏳ Writing…":"✍️ Outreach Script"}</button>}
        {leads&&<button className="btn-success" onClick={()=>onLeadsFound(leads)}>🚀 Use in Workflow</button>}
      </div>
      {leads&&<div className="generated-leads-list">
        {leads.map((l,i)=><div key={i} className="social-lead-card">
          <div className="social-lead-top">
            <div className="social-lead-identity">
              <div className="platform-avatar" style={{background:platform.bgColor,color:platform.color}}>{platform.icon}</div>
              <div><strong>{l.name}</strong><div className="social-lead-handle">{l.platform_handle}</div></div>
            </div><span className="tag">{l.size}</span>
          </div>
          <div className="social-lead-details"><div>👤 {l.contact}</div><div>📧 {l.email}</div><div>🌐 {l.website}</div><div>📊 {l.platform_activity}</div></div>
          <div className="social-lead-pain">💡 {l.pain_point}</div>
          <div className="social-lead-approach"><span className="approach-label">Opening:</span> {l.best_approach}</div>
        </div>)}
      </div>}
      {script&&<div className="outreach-script-box">
        <div className="outreach-script-header"><h4>✉️ {platform.name} Sequence</h4>
          <button className="btn-ghost copy-btn" onClick={()=>navigator.clipboard.writeText(script)}>📋 Copy</button>
        </div>
        <pre className="result-pre">{script}</pre>
      </div>}
    </div>
  </div>);
}

// ── Workflow Tab ──────────────────────────────────────────────────────────────
function WorkflowTab({config,apiKey,sheetsConfig,stages,setStages,logs,setLogs,running,setRunning}){
  const logRef=useRef(null);const [modal,setModal]=useState(null);
  const [sheetsSaving,setSheetsSaving]=useState(false);const [sheetsStatus,setSheetsStatus]=useState(null);
  useEffect(()=>{if(logRef.current)logRef.current.scrollTop=logRef.current.scrollHeight;},[logs]);
  const log=msg=>setLogs(l=>[...l,`[${new Date().toLocaleTimeString()}] ${msg}`]);
  const pct=STAGE_KEYS.reduce((acc,k)=>acc+(stages[k]?.status==="done"?20:0),0);
  const setStage=(key,patch)=>setStages(s=>({...s,[key]:{...s[key],...patch}}));
  const preloaded=Array.isArray(stages.leads?.result)?stages.leads.result:null;

  async function saveToSheets(s){
    if(!sheetsConfig.enabled||!sheetsConfig.apiKey||!sheetsConfig.sheetId) return;
    setSheetsSaving(true);setSheetsStatus(null);
    try{
      log("📊 Saving to Sheets…");
      if(Array.isArray(s.leads?.result)&&s.leads.result.length>0) await exportLeads(sheetsConfig,s.leads.result,config);
      await exportWorkflow(sheetsConfig,s,config);
      log("✅ Saved to Sheets");setSheetsStatus({ok:true,msg:"Saved to Google Sheets!"});
    }catch(e){log("⚠️ Sheets: "+e.message);setSheetsStatus({ok:false,msg:e.message});}
    setSheetsSaving(false);
  }

  async function runAll(){
    if(!apiKey){alert("API key required.");return;}
    setRunning(true);setLogs([]);setSheetsStatus(null);
    const fresh={leads:{},email:{},followup:{},proposal:{},meeting:{}};
    let leads=null;

    if(preloaded){
      log(`✅ Using ${preloaded.length} pre-loaded leads (${preloaded[0]?.platform||"imported"})`);
      leads=preloaded;fresh.leads={status:"done",result:leads};setStage("leads",{status:"done",result:leads});
    } else {
      try{
        setStage("leads",{status:"running"});log("🔍 Finding leads for "+config.niche+" in "+config.country);
        const raw=await callClaude(apiKey,"Return ONLY valid JSON.",
          `5 ${config.niche} leads in ${config.country} needing ${config.service}. JSON: [{"name":"Biz","contact":"Name","email":"name@biz.com","website":"https://biz.com","pain_point":"problem","size":"small","platform":"Direct","verified":false}]`);
        leads=parseJSON(raw)||[];
        setStage("leads",{status:"done",result:leads});fresh.leads={status:"done",result:leads};
        log(`✅ ${leads.length} leads found`);
      }catch(e){setStage("leads",{status:"error",result:e.message});log("❌ "+e.message);}
    }

    const steps=[
      {key:"email",log:"✉️ Drafting outreach email…",ok:"✅ Email drafted",
       prompt:(l)=>`Cold email from ${config.yourName||"us"} / ${config.companyName||config.service} to ${l?.contact||"owner"} at ${l?.name||config.niche}. Service: ${config.service}. Pain: ${l?.pain_point||"scaling"}. Price: ${config.price}. 130 words max. Subject line first as "Subject: ...".`},
      {key:"followup",log:"🔁 Building follow-up sequence…",ok:"✅ Follow-up ready",
       prompt:()=>`3-email follow-up: Day 3 (value), Day 7 (case study), Day 14 (close). ${config.service} → ${config.niche} in ${config.country}. Sender: ${config.yourName||"us"} / ${config.companyName||config.service}. Price: ${config.price}. Label each.`},
      {key:"proposal",log:"📄 Generating proposal…",ok:"✅ Proposal ready",
       prompt:()=>`${config.service} proposal for ${config.niche} client in ${config.country}. Sections: Summary, Problem, Solution, Deliverables+Timeline, Investment (${config.price}), Why Us, Next Steps. Agency: ${config.companyName||config.yourName||"Our Agency"}.`},
      {key:"meeting",log:"📅 Writing meeting message…",ok:"✅ Meeting ready",
       prompt:(l)=>`Meeting request to ${l?.contact||"prospect"} at ${l?.name||config.niche} for 30-min discovery about ${config.service}. ${config.calendlyLink?`Link: ${config.calendlyLink}`:"Ask availability."} Sender: ${config.yourName||"us"} / ${config.companyName||config.service}.`},
    ];

    for(const step of steps){
      try{
        setStage(step.key,{status:"running"});log(step.log);
        const text=await callClaude(apiKey,"You are an expert B2B sales professional.",step.prompt(leads?.[0]));
        const extra=step.key==="meeting"?{gcalLink:buildCalendarLink({title:`Discovery – ${config.companyName||config.service} × ${leads?.[0]?.name||config.niche}`,description:`30-min about ${config.service}`,startISO:(()=>{const d=new Date();d.setDate(d.getDate()+7);d.setHours(10,0,0,0);return d.toISOString();})(),durationMins:30,location:config.calendlyLink||"Google Meet"})}:{};
        setStage(step.key,{status:"done",result:text,...extra});fresh[step.key]={status:"done",result:text,...extra};
        log(step.ok);
      }catch(e){setStage(step.key,{status:"error",result:e.message});log("❌ "+e.message);}
    }

    log("🎉 Workflow complete! Click any stage to view.");
    setRunning(false);
    if(sheetsConfig.enabled) await saveToSheets(fresh);
  }

  return(<div className="workflow-wrap">
    {modal&&<div className="modal-overlay" onClick={()=>setModal(null)}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h3>{STAGE_META.find(m=>m.key===modal)?.icon} {STAGE_META.find(m=>m.key===modal)?.label}</h3>
          <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
        </div>
        <div className="modal-body">
          {modal==="leads"&&Array.isArray(stages.leads?.result)?<LeadTable leads={stages.leads.result}/>
            :<pre className="result-pre">{typeof stages[modal]?.result==="string"?stages[modal].result:JSON.stringify(stages[modal]?.result,null,2)}</pre>}
          {modal==="meeting"&&stages.meeting?.gcalLink&&<a className="btn-primary gcal-btn" href={stages.meeting.gcalLink} target="_blank" rel="noreferrer">📅 Add to Google Calendar</a>}
        </div>
      </div>
    </div>}
    <div className="workflow-header">
      <div>
        <h2>🚀 Full Workflow</h2>
        <p className="sub">Find Lead → Research → Draft Email → Follow Up → Proposal → Meeting</p>
        {config.country&&<div className="workflow-target-badge">{COUNTRIES.find(c=>c.name===config.country)?.flag} {config.country} · {config.niche}</div>}
        {preloaded&&<div className="preloaded-badge">✅ {preloaded.length} leads pre-loaded from {preloaded[0]?.platform||"import"}</div>}
      </div>
      <div className="workflow-actions">
        <button className="btn-primary btn-run" onClick={runAll} disabled={running}>{running?"⏳ Running…":"▶ Run Full Workflow"}</button>
        {sheetsConfig.enabled&&pct===100&&<button className="btn-secondary" onClick={()=>saveToSheets(stages)} disabled={sheetsSaving}>{sheetsSaving?"⏳ Saving…":"📊 Save to Sheets"}</button>}
      </div>
    </div>
    {sheetsStatus&&<div className={`sheets-status ${sheetsStatus.ok?"ok":"error"}`}>{sheetsStatus.ok?"✅":"⚠️"} {sheetsStatus.msg}</div>}
    {sheetsConfig.enabled&&<div className="sheets-indicator">📊 Sheets sync <strong>enabled</strong></div>}
    <div className="progress-wrap"><div className="progress-bar" style={{width:`${pct}%`}}/><span className="progress-label">{Math.round(pct)}%</span></div>
    <div className="stages">
      {STAGE_META.map(m=>{
        const s=stages[m.key]?.status||"idle";
        const icon=s==="done"?"✅":s==="error"?"❌":s==="running"?"⏳":m.icon;
        return(<div key={m.key} className={`stage ${s}`} onClick={s==="done"?()=>setModal(m.key):undefined}>
          <span className="stage-icon">{icon}</span><span className="stage-label">{m.label}</span>
          {s==="done"&&<span className="stage-view">View →</span>}
        </div>);
      })}
    </div>
    <div className="log-box" ref={logRef}>
      <div className="log-title">📟 Activity Log</div>
      {logs.length===0&&<div className="log-empty">Logs appear here when workflow runs…</div>}
      {logs.map((l,i)=><div key={i} className="log-line">{l}</div>)}
    </div>
  </div>);
}

// ── Lead Table ────────────────────────────────────────────────────────────────
function LeadTable({leads}){
  return(<div className="lead-table-wrap">{leads.map((l,i)=>(
    <div key={i} className="lead-card">
      <div className="lead-card-header"><strong>{l.name}</strong>
        <div className="lead-tags">
          <span className="tag">{l.size}</span>
          {l.platform&&l.platform!=="Direct"&&<span className="tag tag-platform">{l.platform}</span>}
          {l.verified&&<span className="tag tag-green">✅ Verified</span>}
        </div>
      </div>
      <div className="lead-detail">👤 {l.contact}{l.title?` · ${l.title}`:""}</div>
      <div className="lead-detail">📧 <a href={`mailto:${l.email}`}>{l.email}</a></div>
      {l.website&&<div className="lead-detail">🌐 <a href={l.website} target="_blank" rel="noreferrer">{l.website}</a></div>}
      {l.phone&&<div className="lead-detail">📞 {l.phone}</div>}
      <div className="lead-pain">💡 {l.pain_point}</div>
    </div>
  ))}</div>);
}

// ── Pipeline Tab ──────────────────────────────────────────────────────────────
// ── Lead Detail Panel Component (extracted to fix React Hooks violation) ────────
function LeadDetailPanel({lead,lid,st,lc,r,activities,notes,saveNote,updateStatus,
  reminders,setShowReminder,content,loading,sheetsSaved,generate,config,buildCalendarLink}){
  const [activeTab,setActiveTab]=useState("actions");
  return(<div className="lead-detail-panel">
    <div className="lead-detail-header">
      <div>
        <h3>{lead.name}</h3>
        <div style={{fontSize:13,color:"#64748b",marginTop:2}}>{lead.contact}{lead.title?` · ${lead.title}`:""}</div>
      </div>
      <div className="lead-tags">
        <span className="tag">{lead.size}</span>
        {lead.verified&&<span className="tag tag-green">✅ Verified</span>}
        {lead.platform&&lead.platform!=="Direct"&&<span className="tag tag-platform">{lead.platform}</span>}
      </div>
    </div>
    <div className="lead-info-grid">
      <div>📧 <a href={`mailto:${lead.email}`}>{lead.email||"No email"}</a></div>
      {lead.website&&<div>🌐 <a href={lead.website} target="_blank" rel="noreferrer">{lead.website}</a></div>}
      {lead.phone&&<div>📞 {lead.phone}</div>}
      {lead.linkedin&&<div>💼 <a href={lead.linkedin} target="_blank" rel="noreferrer">LinkedIn</a></div>}
      <div style={{gridColumn:"1/-1"}}>💡 {lead.pain_point}</div>
      {lc&&<div style={{gridColumn:"1/-1",fontSize:12,color:"#64748b"}}>📆 Last contacted: <strong>{new Date(lc).toLocaleString()}</strong></div>}
    </div>
    <div className="status-reminder-row">
      <div className="status-changer" style={{flex:1}}>
        <label style={{fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".5px"}}>Pipeline Stage</label>
        <div className="status-options">
          {["New","Contacted","Replied","Meeting Booked","Proposal Sent","Won","Lost"].map(s=>(
            <button key={s} className={`status-btn ${st===s?"active":""}`}
              style={st===s?{background:{New:"#64748b",Contacted:"#3b82f6",Replied:"#f59e0b","Meeting Booked":"#8b5cf6","Proposal Sent":"#ec4899",Won:"#22c55e",Lost:"#ef4444"}[s],color:"#fff",borderColor:{New:"#64748b",Contacted:"#3b82f6",Replied:"#f59e0b","Meeting Booked":"#8b5cf6","Proposal Sent":"#ec4899",Won:"#22c55e",Lost:"#ef4444"}[s]}:{}}
              onClick={()=>updateStatus(lid,s)}>
              {{"New":"🆕","Contacted":"✉️","Replied":"💬","Meeting Booked":"📅","Proposal Sent":"📄","Won":"🏆","Lost":"❌"}[s]} {s}
            </button>
          ))}
        </div>
      </div>
      <div className="reminder-section">
        <label style={{fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".5px"}}>Follow-up Reminder</label>
        <div style={{marginTop:6}}>
          {r?(<div className="reminder-active">
            <ReminderBadge reminder={r}/>
            <span className="reminder-msg">{r.message}</span>
            <span className="reminder-date">{new Date(r.date).toLocaleDateString()}</span>
            <button className="btn-ghost" style={{fontSize:11,padding:"2px 8px"}} onClick={()=>setShowReminder(true)}>✏️</button>
          </div>):(
            <button className="btn-secondary" style={{fontSize:12}} onClick={()=>setShowReminder(true)}>🔔 Set Reminder</button>
          )}
        </div>
      </div>
    </div>
    <div className="detail-tabs">
      {[["actions","⚡ Actions"],["notes","📝 Notes"],["activity","📋 Activity"]].map(([t,l])=>(
        <button key={t} className={`detail-tab ${activeTab===t?"active":""}`} onClick={()=>setActiveTab(t)}>{l}</button>
      ))}
    </div>
    {activeTab==="actions"&&<div className="lead-actions">
      {[["email","✉️","Cold Email"],["dm","💬","Social DM"],["proposal","📄","Proposal"],["meeting","📅","Meeting"]].map(([type,icon,label])=>{
        const key=`${lid}-${type}`;
        return(<div key={type} className="lead-action-block">
          <div className="lead-action-header">
            <button className="btn-secondary" disabled={loading[key]} onClick={()=>generate(lead,type)}>
              {loading[key]?`⏳ Generating…`:`${icon} ${label}`}
            </button>
            {sheetsSaved[key]&&<span className="sheets-saved-badge">📊 Saved</span>}
          </div>
          {content[key]&&<div className="generated-content">
            <pre>{content[key]}</pre>
            <div className="generated-actions">
              <button className="btn-ghost copy-btn" onClick={()=>navigator.clipboard.writeText(content[key])}>📋 Copy</button>
              {type==="meeting"&&<a className="btn-primary gcal-btn"
                href={buildCalendarLink({title:`Discovery – ${config.companyName||config.service} × ${lead.name}`,description:content[key],startISO:(()=>{const d=new Date();d.setDate(d.getDate()+7);d.setHours(10,0,0,0);return d.toISOString();})(),durationMins:30,location:config.calendlyLink||"Google Meet"})}
                target="_blank" rel="noreferrer">📅 Add to Calendar</a>}
            </div>
          </div>}
        </div>);
      })}
    </div>}
    {activeTab==="notes"&&<div style={{padding:"4px 0"}}>
      <textarea className="notes-area" style={{minHeight:160}} placeholder="Notes — call summary, what they said, next steps…"
        value={notes[lid]||""} onChange={e=>saveNote(lid,e.target.value)} rows={6}/>
      <div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>Auto-saved</div>
    </div>}
    {activeTab==="activity"&&<div style={{padding:"4px 0"}}>
      <ActivityLog activities={activities[lid]}/>
    </div>}
  </div>);
}

// ── CRM Pipeline Tab (Priority 3) ────────────────────────────────────────────
const PIPELINE_STAGES=["New","Contacted","Replied","Meeting Booked","Proposal Sent","Won","Lost"];
const PIPELINE_COLORS={New:"#64748b",Contacted:"#3b82f6",Replied:"#f59e0b","Meeting Booked":"#8b5cf6","Proposal Sent":"#ec4899",Won:"#22c55e",Lost:"#ef4444"};
const STAGE_ICONS={New:"🆕",Contacted:"✉️",Replied:"💬","Meeting Booked":"📅","Proposal Sent":"📄",Won:"🏆",Lost:"❌"};

function ReminderBadge({reminder}){
  if(!reminder) return null;
  const now=new Date();const due=new Date(reminder.date);
  const diff=Math.ceil((due-now)/(1000*60*60*24));
  if(diff<0) return <span className="reminder-badge overdue">⚠️ Overdue {Math.abs(diff)}d</span>;
  if(diff===0) return <span className="reminder-badge today">🔔 Today</span>;
  if(diff<=2) return <span className="reminder-badge soon">⏰ {diff}d</span>;
  return <span className="reminder-badge upcoming">📅 {diff}d</span>;
}

function ActivityLog({activities}){
  if(!activities?.length) return <div className="activity-empty">No activity yet</div>;
  return(<div className="activity-list">
    {[...activities].reverse().map((a,i)=>(
      <div key={i} className="activity-item">
        <span className="activity-icon">{a.type==="status"?"🔄":a.type==="note"?"📝":a.type==="email"?"✉️":a.type==="dm"?"💬":a.type==="meeting"?"📅":"📄"}</span>
        <div className="activity-content">
          <div className="activity-text">{a.text}</div>
          <div className="activity-time">{new Date(a.date).toLocaleString()}</div>
        </div>
      </div>
    ))}
  </div>);
}

function SetReminderModal({onSave,onClose,existing}){
  const [date,setDate]=useState(existing?.date||"");
  const [msg,setMsg]=useState(existing?.message||"Follow up");
  const presets=[
    {label:"Tomorrow",days:1},{label:"3 days",days:3},{label:"1 week",days:7},{label:"2 weeks",days:14}
  ];
  function setPreset(days){
    const d=new Date();d.setDate(d.getDate()+days);
    setDate(d.toISOString().slice(0,10));
  }
  return(<div className="modal-overlay" onClick={onClose}>
    <div className="modal" style={{maxWidth:380}} onClick={e=>e.stopPropagation()}>
      <div className="modal-header"><h3>🔔 Set Follow-up Reminder</h3><button className="modal-close" onClick={onClose}>✕</button></div>
      <div className="modal-body">
        <div className="reminder-presets">{presets.map(p=><button key={p.days} className="preset-btn" onClick={()=>setPreset(p.days)}>{p.label}</button>)}</div>
        <div className="field" style={{marginTop:12}}><label>📅 Date</label><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
        <div className="field"><label>📝 Reminder Message</label><input type="text" value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Follow up about proposal"/></div>
        <div style={{display:"flex",gap:8,marginTop:14}}>
          <button className="btn-primary" onClick={()=>{if(date)onSave({date,message:msg});}}>💾 Save Reminder</button>
          {existing&&<button className="btn-ghost" onClick={()=>onSave(null)}>🗑 Remove</button>}
        </div>
      </div>
    </div>
  </div>);
}

function PipelineTab({apiKey,config,stages,sheetsConfig}){
  const leads=Array.isArray(stages.leads?.result)?stages.leads.result:[];
  const [selected,setSelected]=useState(null);
  const [view,setView]=useState("list"); // list | kanban

  // Persisted CRM data
  const [status,setStatus]=useState(()=>{try{return JSON.parse(localStorage.getItem("cf_status")||"{}");}catch{return {};}});
  const [notes,setNotes]=useState(()=>{try{return JSON.parse(localStorage.getItem("cf_notes")||"{}");}catch{return {};}});
  const [activities,setActivities]=useState(()=>{try{return JSON.parse(localStorage.getItem("cf_activities")||"{}");}catch{return {};}});
  const [reminders,setReminders]=useState(()=>{try{return JSON.parse(localStorage.getItem("cf_reminders")||"{}");}catch{return {};}});
  const [lastContacted,setLastContacted]=useState(()=>{try{return JSON.parse(localStorage.getItem("cf_lastcontact")||"{}");}catch{return {};}});

  useEffect(()=>{localStorage.setItem("cf_status",JSON.stringify(status));},[status]);
  useEffect(()=>{localStorage.setItem("cf_notes",JSON.stringify(notes));},[notes]);
  useEffect(()=>{localStorage.setItem("cf_activities",JSON.stringify(activities));},[activities]);
  useEffect(()=>{localStorage.setItem("cf_reminders",JSON.stringify(reminders));},[reminders]);
  useEffect(()=>{localStorage.setItem("cf_lastcontact",JSON.stringify(lastContacted));},[lastContacted]);

  // Generate content state
  const [content,setContent]=useState({});
  const [loading,setLoading]=useState({});
  const [sheetsSaved,setSheetsSaved]=useState({});
  const [showReminder,setShowReminder]=useState(false);

  // Filter / search
  const [filterStage,setFilterStage]=useState("All");
  const [search,setSearch]=useState("");
  const [sortBy,setSortBy]=useState("name"); // name | lastContacted | reminder | status

  const leadId=l=>l.email||l.name;

  function addActivity(lid,type,text){
    setActivities(a=>({...a,[lid]:[...(a[lid]||[]),{type,text,date:new Date().toISOString()}]}));
  }

  function updateStatus(lid,newStatus){
    setStatus(s=>({...s,[lid]:newStatus}));
    addActivity(lid,"status",`Status → ${newStatus}`);
    if(newStatus==="Contacted"||newStatus==="Replied"||newStatus==="Meeting Booked"){
      setLastContacted(lc=>({...lc,[lid]:new Date().toISOString()}));
    }
  }

  async function generate(lead,type){
    if(!apiKey){alert("API key required");return;}
    const lid=leadId(lead);
    const key=`${lid}-${type}`;setLoading(l=>({...l,[key]:true}));
    try{
      const ph=lead.platform&&lead.platform!=="Direct"?`Lead from ${lead.platform}.`:"";
      let prompt="";
      if(type==="email") prompt=`Cold email to ${lead.contact} at ${lead.name} about ${config.service}. Pain: ${lead.pain_point}. Price: ${config.price}. Sender: ${config.yourName||"us"} / ${config.companyName||config.service}. Subject + body. 120 words max. ${ph}`;
      else if(type==="dm") prompt=`${lead.platform||"Social"} DM to ${lead.contact} at ${lead.name}. Pain: ${lead.pain_point}. 100 words, value-first, no pitch. ${lead.best_approach?`Opening: ${lead.best_approach}`:""}`;
      else if(type==="proposal") prompt=`Full proposal for ${lead.name} (${lead.contact}) for ${config.service}. Pain: ${lead.pain_point}. Investment: ${config.price}. Agency: ${config.companyName||config.service}. Include sections: Summary, Problem, Solution, Deliverables, Timeline, Investment, Next Steps.`;
      else if(type==="meeting") prompt=`Meeting request to ${lead.contact} at ${lead.name} for 30-min about ${config.service}. ${config.calendlyLink?`Booking link: ${config.calendlyLink}`:"Ask for availability."} Sender: ${config.yourName||"us"}.`;
      const text=await callClaude(apiKey,"You are a professional B2B sales expert.",prompt);
      setContent(c=>({...c,[key]:text}));
      const newStatus=type==="email"||type==="dm"?"Contacted":type==="meeting"?"Meeting Booked":type==="proposal"?"Proposal Sent":status[lid]||"New";
      updateStatus(lid,newStatus);
      addActivity(lid,type,`Generated ${type==="email"?"cold email":type==="dm"?"social DM":type==="proposal"?"proposal":"meeting request"}`);
      setLastContacted(lc=>({...lc,[lid]:new Date().toISOString()}));
      if(sheetsConfig.enabled&&sheetsConfig.apiKey&&sheetsConfig.sheetId){
        try{await exportAction(sheetsConfig,lead,type,text,config);setSheetsSaved(s=>({...s,[key]:true}));}catch(e){console.warn(e);}
      }
    }catch(e){setContent(c=>({...c,[key]:"Error: "+e.message}));}
    setLoading(l=>({...l,[key]:false}));
  }

  function saveNote(lid,val){
    setNotes(n=>({...n,[lid]:val}));
    addActivity(lid,"note","Note updated");
  }

  // Filter + sort leads
  const filteredLeads=leads.filter(l=>{
    const lid=leadId(l);
    const st=status[lid]||"New";
    const matchStage=filterStage==="All"||st===filterStage;
    const matchSearch=!search||(l.name+l.contact+(l.email||"")).toLowerCase().includes(search.toLowerCase());
    return matchStage&&matchSearch;
  }).sort((a,b)=>{
    const la=leadId(a),lb=leadId(b);
    if(sortBy==="lastContacted"){
      const da=lastContacted[la]?new Date(lastContacted[la]):new Date(0);
      const db=lastContacted[lb]?new Date(lastContacted[lb]):new Date(0);
      return db-da;
    }
    if(sortBy==="reminder"){
      const ra=reminders[la]?.date||"9999";const rb=reminders[lb]?.date||"9999";
      return ra<rb?-1:ra>rb?1:0;
    }
    if(sortBy==="status") return PIPELINE_STAGES.indexOf(status[la]||"New")-PIPELINE_STAGES.indexOf(status[lb]||"New");
    return a.name.localeCompare(b.name);
  });

  // Overdue reminders count
  const overdueCount=leads.filter(l=>{
    const r=reminders[leadId(l)];
    return r&&new Date(r.date)<new Date();
  }).length;

  const grouped=PIPELINE_STAGES.reduce((acc,s)=>{acc[s]=leads.filter(l=>(status[leadId(l)]||"New")===s);return acc;},{});

  if(leads.length===0) return(
    <div className="empty-state"><div className="empty-icon">👥</div>
      <p>No leads yet. Go to <strong>📥 Real Leads</strong> to import real contacts, then run <strong>🚀 Workflow</strong>.</p>
    </div>);

  return(<div className="pipeline-wrap">
    {/* Reminder modal */}
    {showReminder&&selected!==null&&<SetReminderModal
      existing={reminders[leadId(leads[selected])]}
      onClose={()=>setShowReminder(false)}
      onSave={(r)=>{
        const lid=leadId(leads[selected]);
        setReminders(rm=>({...rm,[lid]:r}));
        if(r) addActivity(lid,"reminder",`Reminder set for ${new Date(r.date).toLocaleDateString()}: ${r.message}`);
        else addActivity(lid,"reminder","Reminder removed");
        setShowReminder(false);
      }}
    />}

    {/* Header */}
    <div className="pipeline-header">
      <div>
        <h2>👥 CRM Pipeline</h2>
        <p className="sub">Track every lead from first contact to closed deal</p>
        <div className="pipeline-stats">
          <span className="pstat"><strong>{leads.length}</strong> total</span>
          <span className="pstat blue"><strong>{leads.filter(l=>status[leadId(l)]&&status[leadId(l)]!=="New").length}</strong> contacted</span>
          <span className="pstat green"><strong>{grouped["Won"]?.length||0}</strong> won 🏆</span>
          {overdueCount>0&&<span className="pstat red"><strong>{overdueCount}</strong> overdue ⚠️</span>}
        </div>
      </div>
      <div className="pipeline-view-toggle">
        <button className={`view-btn ${view==="list"?"active":""}`} onClick={()=>setView("list")}>☰ List</button>
        <button className={`view-btn ${view==="kanban"?"active":""}`} onClick={()=>setView("kanban")}>⬜ Kanban</button>
      </div>
    </div>

    {/* Kanban view */}
    {view==="kanban"&&(
      <div className="kanban-board">
        {PIPELINE_STAGES.map(s=>(
          <div key={s} className="kanban-column" style={{borderTopColor:PIPELINE_COLORS[s]}}>
            <div className="kanban-col-header">
              <span className="kanban-col-title" style={{color:PIPELINE_COLORS[s]}}>{STAGE_ICONS[s]} {s}</span>
              <span className="kanban-col-count">{grouped[s]?.length||0}</span>
            </div>
            <div className="kanban-cards">
              {(grouped[s]||[]).map((lead,i)=>{
                const lid=leadId(lead);
                return(<div key={i} className="kanban-card" onClick={()=>{setView("list");setSelected(leads.indexOf(lead));}}>
                  <div className="kanban-card-name">{lead.name}</div>
                  <div className="kanban-card-contact">{lead.contact}</div>
                  {lastContacted[lid]&&<div className="kanban-card-date">Last: {new Date(lastContacted[lid]).toLocaleDateString()}</div>}
                  <ReminderBadge reminder={reminders[lid]}/>
                </div>);
              })}
              {(grouped[s]||[]).length===0&&<div className="kanban-empty">No leads</div>}
            </div>
          </div>
        ))}
      </div>
    )}

    {/* List view */}
    {view==="list"&&(<>
      {/* Toolbar */}
      <div className="pipeline-toolbar">
        <input className="pipeline-search" placeholder="🔍 Search leads…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <div className="pipeline-filters">
          <select className="pipeline-filter" value={filterStage} onChange={e=>setFilterStage(e.target.value)}>
            <option value="All">All Stages</option>
            {PIPELINE_STAGES.map(s=><option key={s} value={s}>{STAGE_ICONS[s]} {s} ({grouped[s]?.length||0})</option>)}
          </select>
          <select className="pipeline-filter" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
            <option value="name">Sort: Name</option>
            <option value="status">Sort: Stage</option>
            <option value="lastContacted">Sort: Last Contacted</option>
            <option value="reminder">Sort: Reminder</option>
          </select>
        </div>
        {filteredLeads.length!==leads.length&&<span className="filter-count">{filteredLeads.length} of {leads.length}</span>}
      </div>

      <div className="leads-tab">
        {/* Lead list */}
        <div className="leads-list">
          {filteredLeads.map((lead,i)=>{
            const lid=leadId(lead);const st=status[lid]||"New";
            const origIdx=leads.indexOf(lead);
            const lc=lastContacted[lid];
            const r=reminders[lid];
            return(<div key={i} className={`lead-row ${selected===origIdx?"active":""}`} onClick={()=>setSelected(origIdx)}>
              <div className="lead-row-main">
                <strong>{lead.name}</strong>
                <div style={{display:"flex",gap:4}}>{lead.verified&&<span style={{fontSize:10,color:"#22c55e"}}>✅</span>}<ReminderBadge reminder={r}/></div>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center",marginTop:3,flexWrap:"wrap"}}>
                <span className="lead-row-sub">{lead.contact}</span>
                <span style={{background:PIPELINE_COLORS[st],fontSize:10,padding:"1px 6px",borderRadius:4,color:"#fff",fontWeight:700}}>{st}</span>
              </div>
              {lc&&<div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>Last contacted: {new Date(lc).toLocaleDateString()}</div>}
            </div>);
          })}
        </div>

        {/* Detail panel */}
        {selected!==null&&leads[selected]&&(
          <LeadDetailPanel
            lead={leads[selected]}
            lid={leadId(leads[selected])}
            st={status[leadId(leads[selected])]||"New"}
            lc={lastContacted[leadId(leads[selected])]}
            r={reminders[leadId(leads[selected])]}
            activities={activities}
            notes={notes}
            saveNote={saveNote}
            updateStatus={updateStatus}
            reminders={reminders}
            setShowReminder={setShowReminder}
            content={content}
            loading={loading}
            sheetsSaved={sheetsSaved}
            generate={generate}
            config={config}
            buildCalendarLink={buildCalendarLink}
          />
        )}
      </div>
    </>)}
  </div>);
}

// ── Meetings Tab ──────────────────────────────────────────────────────────────
function MeetingsTab({config,stages}){
  const leads=Array.isArray(stages.leads?.result)?stages.leads.result:[];
  const slots=[{label:"This Tuesday 10:00 AM",offset:2,hour:10},{label:"This Wednesday 2:00 PM",offset:3,hour:14},{label:"Next Monday 11:00 AM",offset:8,hour:11},{label:"Next Thursday 3:00 PM",offset:11,hour:15}];
  function makeLink(lead,slot){const d=new Date();d.setDate(d.getDate()+slot.offset);d.setHours(slot.hour,0,0,0);
    return buildCalendarLink({title:`Discovery – ${config.companyName||config.service} × ${lead?.name||"Prospect"}`,description:`30-min about ${config.service}.\nContact: ${lead?.contact||""}\nEmail: ${lead?.email||""}`,startISO:d.toISOString(),durationMins:30,location:config.calendlyLink||"Google Meet"});}
  return(<div className="meetings-tab">
    <div className="meetings-header"><h2>📅 Meeting Scheduler</h2><p className="sub">Schedule discovery calls to Google Calendar</p></div>
    {leads.length===0&&<div className="empty-state"><div className="empty-icon">📅</div><p>Run 🚀 Workflow first to get leads.</p></div>}
    <div className="meetings-grid">
      {leads.map((lead,i)=>(
        <div key={i} className="meeting-card">
          <div className="meeting-card-header"><div><strong>{lead.name}</strong><div className="meeting-sub">{lead.contact} · {lead.email}</div></div><span className="tag">{lead.size}</span></div>
          <div className="meeting-pain">💡 {lead.pain_point}</div>
          <div className="slots-label">📆 Pick a slot:</div>
          <div className="slots">{slots.map((s,si)=><a key={si} href={makeLink(lead,s)} target="_blank" rel="noreferrer" className="slot-btn">🗓 {s.label}</a>)}</div>
          {config.calendlyLink&&<a href={config.calendlyLink} target="_blank" rel="noreferrer" className="btn-primary calendly-btn">📎 Open Calendly</a>}
        </div>
      ))}
    </div>
  </div>);
}

// ── Portfolio & Case Study Generator (Priority 4) ─────────────────────────────
const PORTFOLIO_TEMPLATES = [
  { key:"saas",     label:"SaaS / Tech",      icon:"💻", accent:"#6366f1" },
  { key:"agency",   label:"Agency / Creative", icon:"🎨", accent:"#ec4899" },
  { key:"ecom",     label:"E-commerce",        icon:"🛒", accent:"#f59e0b" },
  { key:"local",    label:"Local Business",    icon:"📍", accent:"#22c55e" },
  { key:"coach",    label:"Coaching / Course", icon:"🎓", accent:"#3b82f6" },
];

const CASE_FIELDS = [
  { key:"clientName",   label:"Client / Company Name",    placeholder:"Acme Shopify Store" },
  { key:"industry",     label:"Industry / Niche",          placeholder:"E-commerce Fashion" },
  { key:"problem",      label:"Problem They Had",          placeholder:"Low conversion rate, outdated website" },
  { key:"solution",     label:"What You Did",              placeholder:"Redesigned site, added live chat, speed optimisation" },
  { key:"result",       label:"Results Achieved",          placeholder:"Conversions +47%, revenue +$12k/month" },
  { key:"duration",     label:"Project Duration",          placeholder:"3 weeks" },
  { key:"investment",   label:"Project Value",             placeholder:"$1,500" },
  { key:"testimonial",  label:"Client Testimonial (optional)", placeholder:"\"Rubel delivered exactly what we needed...\"" },
];

function PortfolioTab({ apiKey, config }) {
  // Case studies list
  const [cases, setCases] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cf_cases") || "[]"); } catch { return []; }
  });
  const [form, setForm] = useState(() => Object.fromEntries(CASE_FIELDS.map(f => [f.key, ""])));
  const [template, setTemplate] = useState("agency");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null); // { caseStudy, pitchPage, email, linkedinPost }
  const [activeOutput, setActiveOutput] = useState("caseStudy");
  const [editingId, setEditingId] = useState(null);
  const [copied, setCopied] = useState(null);
  const [htmlPreview, setHtmlPreview] = useState(false);

  useEffect(() => { localStorage.setItem("cf_cases", JSON.stringify(cases)); }, [cases]);

  const tmpl = PORTFOLIO_TEMPLATES.find(t => t.key === template);
  const formFilled = form.clientName && form.problem && form.solution && form.result;

  function saveCase() {
    if (!formFilled) { alert("Fill in at least: Client Name, Problem, Solution, and Result."); return; }
    const entry = { ...form, template, id: editingId || Date.now(), savedAt: new Date().toISOString() };
    if (editingId) {
      setCases(c => c.map(x => x.id === editingId ? entry : x));
      setEditingId(null);
    } else {
      setCases(c => [entry, ...c]);
    }
    setForm(Object.fromEntries(CASE_FIELDS.map(f => [f.key, ""])));
    setGenerated(null);
  }

  function loadCase(c) {
    setForm(Object.fromEntries(CASE_FIELDS.map(f => [f.key, c[f.key] || ""])));
    setTemplate(c.template || "agency");
    setEditingId(c.id);
    setGenerated(null);
    setActiveOutput("caseStudy");
    window.scrollTo(0, 0);
  }

  function deleteCase(id) {
    if (!window.confirm("Delete this case study?")) return;
    setCases(c => c.filter(x => x.id !== id));
    if (editingId === id) { setEditingId(null); setForm(Object.fromEntries(CASE_FIELDS.map(f => [f.key, ""]))); }
  }

  async function generate() {
    if (!apiKey) { alert("Anthropic API key required."); return; }
    if (!formFilled) { alert("Fill in Client Name, Problem, Solution, and Result first."); return; }
    setGenerating(true); setGenerated(null);

    const ctx = `
Client: ${form.clientName} | Industry: ${form.industry || config.niche}
Problem: ${form.problem}
Solution: ${form.solution}
Result: ${form.result}
Duration: ${form.duration || "N/A"} | Value: ${form.investment || config.price}
Testimonial: ${form.testimonial || "None provided"}
Agency: ${config.companyName || "Our Agency"} | Service: ${config.service}
Contact: ${config.yourName || ""} | Email: ${config.yourEmail || ""}
Template style: ${tmpl?.label}`;

    try {
      // Run all 4 generations in parallel
      const [caseStudy, pitchPage, email, linkedinPost] = await Promise.all([
        // 1. Full case study document
        callClaude(apiKey,
          "You are a professional copywriter who writes compelling B2B case studies. Write in a clear, results-focused style.",
          `Write a full case study document based on this project:\n${ctx}\n\nInclude these sections with proper headings:\n## Client Background\n## The Challenge\n## Our Approach\n## What We Built / Delivered\n## Results & ROI\n## Client Testimonial\n## Key Takeaways\n\nMake it persuasive, specific, and results-focused. Use the actual numbers provided.`
        ),
        // 2. HTML portfolio page (ready to publish)
        callClaude(apiKey,
          "You are an expert web developer. Generate a complete, beautiful, self-contained HTML page. No external dependencies except Google Fonts. Return ONLY the HTML code, starting with <!DOCTYPE html>.",
          `Create a stunning portfolio/case study page for this project:\n${ctx}\n\nRequirements:\n- Clean modern design, color accent: ${tmpl?.accent}\n- Hero section with headline and key result metric\n- Problem → Solution → Results sections\n- Testimonial block (if provided)\n- Stats/numbers displayed prominently\n- Call to action: "Work with us" section with email ${config.yourEmail || "contact@agency.com"}\n- Mobile responsive\n- Professional typography (Google Fonts)\n- Return ONLY valid HTML, no markdown, no explanation`
        ),
        // 3. Outreach email using this case study
        callClaude(apiKey,
          "You are an expert cold email copywriter who uses social proof to win clients.",
          `Write a cold outreach email to a NEW prospect that uses this case study as social proof:\n${ctx}\n\nTarget: ${config.niche} businesses in ${config.country}\nService being pitched: ${config.service}\nSender: ${config.yourName || "us"} from ${config.companyName || config.service}\n\nEmail structure: Subject line + body. Show the result in the first 2 lines. Under 140 words. End with soft CTA (15-min call). Do NOT make it sound generic.`
        ),
        // 4. LinkedIn post
        callClaude(apiKey,
          "You are a LinkedIn content expert who writes viral case study posts.",
          `Write a LinkedIn post showcasing this case study:\n${ctx}\n\nFormat:\n- Hook line (1 sentence, result-first)\n- Short story (3–4 lines)\n- The 3 things we did (bullet points with •)\n- The numbers\n- Lesson / insight\n- CTA to DM or comment\n- 5 relevant hashtags\n\nTone: professional but human. Max 250 words.`
        ),
      ]);

      setGenerated({ caseStudy, pitchPage, email, linkedinPost });
      setActiveOutput("caseStudy");

      // Auto-save the case if it's new
      if (!editingId && formFilled) saveCase();

    } catch (e) { alert("Generation error: " + e.message); }
    setGenerating(false);
  }

  function copyOutput(text, key) {
    navigator.clipboard.writeText(text);
    setCopied(key); setTimeout(() => setCopied(null), 2000);
  }

  function downloadHTML() {
    if (!generated?.pitchPage) return;
    const blob = new Blob([generated.pitchPage], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(form.clientName || "case-study").toLowerCase().replace(/\s+/g, "-")}-portfolio.html`;
    a.click();
  }

  const OUTPUT_TABS = [
    { key:"caseStudy",    label:"📄 Case Study",     desc:"Full document" },
    { key:"pitchPage",    label:"🌐 HTML Page",       desc:"Ready to publish" },
    { key:"email",        label:"✉️ Outreach Email",  desc:"Use as social proof" },
    { key:"linkedinPost", label:"💼 LinkedIn Post",   desc:"Viral case study" },
  ];

  return (
    <div className="portfolio-wrap">
      <div className="portfolio-header">
        <h2>📁 Portfolio & Case Study Generator</h2>
        <p className="sub">Turn past projects into client-winning assets — case study, portfolio page, outreach email, and LinkedIn post in one click</p>
      </div>

      <div className="portfolio-grid">
        {/* LEFT: Input form */}
        <div className="portfolio-form-col">
          {/* Template selector */}
          <div className="card">
            <h3>🎨 Portfolio Style</h3>
            <div className="template-grid">
              {PORTFOLIO_TEMPLATES.map(t => (
                <button key={t.key}
                  className={`template-btn ${template === t.key ? "active" : ""}`}
                  style={template === t.key ? { borderColor: t.accent, background: t.accent + "15" } : {}}
                  onClick={() => setTemplate(t.key)}>
                  <span className="template-icon">{t.icon}</span>
                  <span className="template-label" style={template === t.key ? { color: t.accent } : {}}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Case study form */}
          <div className="card">
            <h3>{editingId ? "✏️ Edit Case Study" : "➕ New Case Study"}</h3>
            {CASE_FIELDS.map(f => (
              <div key={f.key} className="field">
                <label>{f.label}{["clientName","problem","solution","result"].includes(f.key) && <span className="required-star"> *</span>}</label>
                {f.key === "testimonial" ? (
                  <textarea className="notes-area" rows={3} placeholder={f.placeholder} value={form[f.key]}
                    onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))} />
                ) : (
                  <input type="text" placeholder={f.placeholder} value={form[f.key]}
                    onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))} />
                )}
              </div>
            ))}
            <div className="portfolio-form-actions">
              <button className="btn-primary" style={{ background: `linear-gradient(135deg, ${tmpl?.accent}, ${tmpl?.accent}cc)` }}
                onClick={generate} disabled={generating || !formFilled}>
                {generating ? "⏳ Generating 4 assets…" : "✨ Generate All Assets"}
              </button>
              <button className="btn-secondary" onClick={saveCase} disabled={!formFilled}>
                💾 Save Only
              </button>
              {editingId && (
                <button className="btn-ghost" onClick={() => { setEditingId(null); setForm(Object.fromEntries(CASE_FIELDS.map(f => [f.key, ""]))); setGenerated(null); }}>
                  ✕ Cancel Edit
                </button>
              )}
            </div>
            {generating && (
              <div className="generating-progress">
                <div className="gen-step">📄 Writing case study document…</div>
                <div className="gen-step">🌐 Building HTML portfolio page…</div>
                <div className="gen-step">✉️ Drafting outreach email…</div>
                <div className="gen-step">💼 Crafting LinkedIn post…</div>
              </div>
            )}
          </div>

          {/* Saved case studies */}
          {cases.length > 0 && (
            <div className="card">
              <h3>📂 Saved Case Studies ({cases.length})</h3>
              <div className="saved-cases">
                {cases.map(c => (
                  <div key={c.id} className="saved-case-item">
                    <div className="saved-case-info">
                      <div className="saved-case-name">{c.clientName}</div>
                      <div className="saved-case-meta">{c.industry || config.niche} · {c.duration || "N/A"}</div>
                      <div className="saved-case-result">📈 {c.result?.substring(0, 60)}{c.result?.length > 60 ? "…" : ""}</div>
                    </div>
                    <div className="saved-case-actions">
                      <button className="btn-ghost" style={{fontSize:12}} onClick={() => loadCase(c)}>✏️ Edit</button>
                      <button className="btn-ghost" style={{fontSize:12,color:"#ef4444"}} onClick={() => deleteCase(c.id)}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Generated output */}
        <div className="portfolio-output-col">
          {!generated && !generating && (
            <div className="portfolio-placeholder">
              <div className="placeholder-icon">✨</div>
              <h3>Fill in your project details</h3>
              <p>Click <strong>"Generate All Assets"</strong> and get 4 ready-to-use client-winning assets in under 30 seconds:</p>
              <div className="placeholder-list">
                <div className="placeholder-item">📄 <strong>Full case study</strong> — professional document to send prospects</div>
                <div className="placeholder-item">🌐 <strong>HTML portfolio page</strong> — downloadable, publish anywhere</div>
                <div className="placeholder-item">✉️ <strong>Outreach email</strong> — cold email using this result as proof</div>
                <div className="placeholder-item">💼 <strong>LinkedIn post</strong> — viral case study format</div>
              </div>
            </div>
          )}

          {generated && (
            <div className="generated-assets">
              {/* Output tab switcher */}
              <div className="output-tabs">
                {OUTPUT_TABS.map(t => (
                  <button key={t.key} className={`output-tab ${activeOutput === t.key ? "active" : ""}`}
                    style={activeOutput === t.key ? { borderColor: tmpl?.accent, color: tmpl?.accent } : {}}
                    onClick={() => { setActiveOutput(t.key); setHtmlPreview(false); }}>
                    <div>{t.label}</div>
                    <div className="output-tab-desc">{t.desc}</div>
                  </button>
                ))}
              </div>

              {/* Output content */}
              <div className="output-content card">
                <div className="output-content-header">
                  <div>
                    <strong>{OUTPUT_TABS.find(t => t.key === activeOutput)?.label}</strong>
                    {activeOutput === "pitchPage" && <span className="output-badge">HTML</span>}
                  </div>
                  <div className="output-actions">
                    {activeOutput === "pitchPage" && (
                      <>
                        <button className="btn-secondary" style={{fontSize:12}} onClick={() => setHtmlPreview(!htmlPreview)}>
                          {htmlPreview ? "📝 View Code" : "👁 Preview"}
                        </button>
                        <button className="btn-primary" style={{fontSize:12}} onClick={downloadHTML}>⬇️ Download HTML</button>
                      </>
                    )}
                    <button className="btn-ghost copy-btn" onClick={() => copyOutput(generated[activeOutput], activeOutput)}>
                      {copied === activeOutput ? "✓ Copied!" : "📋 Copy"}
                    </button>
                  </div>
                </div>

                {activeOutput === "pitchPage" && htmlPreview ? (
                  <div className="html-preview-frame">
                    <iframe
                      srcDoc={generated.pitchPage}
                      title="Portfolio Page Preview"
                      className="html-iframe"
                      sandbox="allow-same-origin"
                    />
                  </div>
                ) : (
                  <pre className="result-pre output-pre">{generated[activeOutput]}</pre>
                )}
              </div>

              {/* Quick-use tips */}
              <div className="use-tips card">
                <h3>🚀 How to Use These Assets</h3>
                <div className="use-tips-grid">
                  <div className="use-tip"><span className="use-tip-icon">📄</span><div><strong>Case Study</strong> — Attach to proposals, send when prospect asks for examples, add to your website</div></div>
                  <div className="use-tip"><span className="use-tip-icon">🌐</span><div><strong>HTML Page</strong> — Upload to your website, share as a link, use as a landing page for campaigns</div></div>
                  <div className="use-tip"><span className="use-tip-icon">✉️</span><div><strong>Outreach Email</strong> — Copy into 👥 Pipeline → Email for targeted prospects in this niche</div></div>
                  <div className="use-tip"><span className="use-tip-icon">💼</span><div><strong>LinkedIn Post</strong> — Post once a week to attract inbound leads — this format gets 3–5× more reach</div></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Upwork / Fiverr Proposal Generator (Priority 5) ──────────────────────────
const PLATFORMS_FL = [
  { key:"upwork",  name:"Upwork",  icon:"🟢", color:"#14a800", bg:"#f0fdf4",
    tips:["Match keywords from the job post exactly","Show relevant past result in first 2 lines","Ask a smart question to show you read the post","Keep under 200 words for best response rate","Bid 10–15% below average to get early traction"],
    structure:"Hook (result) → Specific understanding of their problem → Your approach (3 steps) → Relevant experience/result → Question + CTA",
  },
  { key:"fiverr",  name:"Fiverr",  icon:"🟢", color:"#1dbf73", bg:"#f0fdf4",
    tips:["Optimize gig title with buyer search terms","First 80 chars of description appear in search","Use all 3 gig packages (Basic/Standard/Premium)","Respond within 1 hour to boost ranking","5 portfolio images get 3× more orders"],
    structure:"Gig Title → SEO Description → 3 Packages → FAQs → Tags",
  },
  { key:"freelancer", name:"Freelancer", icon:"🔵", color:"#0d6efd", bg:"#eff6ff",
    tips:["Contest entries get high visibility","Seal the deal fast — first 5 bids win 70% of jobs","Use milestone billing to reduce risk","Mention your timezone for time-sensitive clients","Post in relevant Freelancer community groups"],
    structure:"Greeting → Understand the project → Your solution → Timeline + price → Portfolio link + CTA",
  },
  { key:"peopleperhour", name:"PeoplePerHour", icon:"🟠", color:"#ff7043", bg:"#fff7f4",
    tips:["Hourlies (fixed packages) get steady passive income","Verified profile gets 2× more clicks","Add a video intro to your profile","Respond to Stream posts quickly — first wins","UK/EU clients pay premium rates"],
    structure:"Personal greeting → Project understanding → Deliverables → Timeline → Price + CTA",
  },
];

const JOB_CATEGORIES = [
  "Web Design & Development","Mobile App Development","WordPress / Shopify",
  "SEO & Content Marketing","Social Media Management","Graphic Design / Branding",
  "Video Editing","Copywriting","Virtual Assistant","Data Entry",
  "Email Marketing","Lead Generation","CRM / Automation","React / Vue / Angular",
  "Python / Django","Node.js / Express","UI/UX Design","Logo Design",
  "Business Analyst","Project Management",
];

function FreelanceTab({ apiKey, config }) {
  const [platform, setPlatform] = useState("upwork");
  const [mode, setMode] = useState("proposal"); // proposal | gig | optimize | tracker
  
  // Proposal fields
  const [jobPost, setJobPost] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [yourExperience, setYourExperience] = useState("");

  // Gig fields
  const [gigCategory, setGigCategory] = useState("Web Design & Development");
  const [gigKeywords, setGigKeywords] = useState("");
  const [gigPriceBasic, setGigPriceBasic] = useState("$50");
  const [gigPriceStandard, setGigPriceStandard] = useState("$150");
  const [gigPricePremium, setGigPricePremium] = useState("$350");

  // Optimize fields
  const [existingProfile, setExistingProfile] = useState("");

  // Output
  const [output, setOutput] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeOut, setActiveOut] = useState(0);

  // Saved proposals
  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cf_fl_saved") || "[]"); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem("cf_fl_saved", JSON.stringify(saved)); }, [saved]);

  const pl = PLATFORMS_FL.find(p => p.key === platform);

  async function generate() {
    if (!apiKey) { alert("Anthropic API key required."); return; }
    setGenerating(true); setOutput(null);

    try {
      if (mode === "proposal") {
        if (!jobPost.trim()) { alert("Paste the job post first."); setGenerating(false); return; }

        const ctx = `
Platform: ${pl.name}
Job Post: ${jobPost}
Your Service: ${config.service || "Web Development"}
Your Name: ${config.yourName || "Freelancer"}
Agency/Profile: ${config.companyName || ""}
Bid Amount: ${bidAmount || "to be discussed"}
Delivery: ${deliveryDays || "to be discussed"} days
Your Experience: ${yourExperience || "3+ years, multiple successful projects"}
Country: ${config.country}
Proposal structure to follow: ${pl.structure}`;

        const [proposal, coverLetter, questions] = await Promise.all([
          callClaude(apiKey,
            `You are an expert ${pl.name} freelancer with 100+ successful proposals. You write proposals that win. Return ONLY the proposal text, no meta-commentary.`,
            `Write a winning ${pl.name} proposal for this job.\n${ctx}\n\nRules:\n- Start with a HOOK that references their specific problem (not "Hi, I'm...")\n- Show you understand their exact need\n- Describe your approach in 2–3 concrete steps\n- Include ONE specific relevant result or number as proof\n- End with ONE smart question that shows expertise\n- Keep it under 200 words\n- Do NOT use clichés like "I am perfect for this job" or "I have extensive experience"`
          ),
          callClaude(apiKey,
            `You are an expert at writing ${pl.name} cover letters that get shortlisted. Return ONLY the cover letter text.`,
            `Write an alternative, shorter cover letter (100 words max) for the same job.\n${ctx}\n\nThis should be punchier and more direct than a standard proposal. Lead with the result you'll deliver, not who you are.`
          ),
          callClaude(apiKey,
            "You are a senior freelancer who knows exactly what to ask clients to qualify them and show expertise.",
            `Based on this job post, generate 5 smart clarifying questions to ask the client.\n\nJob Post: ${jobPost}\nService: ${config.service}\n\nQuestions should:\n- Show you've read the post carefully\n- Help qualify if it's a good fit\n- Demonstrate expertise\n- Be concise (1 sentence each)\n\nFormat as a numbered list.`
          ),
        ]);

        setOutput([
          { label: "🎯 Main Proposal", content: proposal },
          { label: "⚡ Short Cover Letter", content: coverLetter },
          { label: "❓ Clarifying Questions", content: questions },
        ]);

        // Auto-save
        setSaved(s => [{
          id: Date.now(), platform, mode: "proposal",
          title: jobPost.substring(0, 60) + "…",
          content: proposal, savedAt: new Date().toISOString()
        }, ...s.slice(0, 19)]);

      } else if (mode === "gig") {
        const ctx = `
Platform: ${pl.name}
Category: ${gigCategory}
Service: ${config.service}
Keywords: ${gigKeywords || config.service}
Agency: ${config.companyName || config.yourName || "Freelancer"}
Pricing: Basic ${gigPriceBasic} / Standard ${gigPriceStandard} / Premium ${gigPricePremium}
Target clients: ${config.niche} in ${config.country}`;

        const [gigTitle, gigDesc, packages, faqs, tags] = await Promise.all([
          callClaude(apiKey,
            `You are a ${pl.name} SEO expert. Write titles that rank on the first page.`,
            `Write 5 optimized ${pl.name} gig titles for:\n${ctx}\n\nRules:\n- Under 80 characters each\n- Include high-volume buyer keywords\n- Be specific about the result, not just the service\n- Avoid clickbait\n\nReturn as a numbered list.`
          ),
          callClaude(apiKey,
            `You are a ${pl.name} gig copywriter. Write descriptions that convert browsers into buyers.`,
            `Write a complete ${pl.name} gig description for:\n${ctx}\n\nStructure:\n- Opening hook (result-focused, 2 lines)\n- Why choose me (3 bullet points with ✓)\n- What's included (service breakdown)\n- My process (numbered steps)\n- Who this is for\n- Call to action\n\nSEO: naturally include these keywords: ${gigKeywords || config.service}\nLength: 250–350 words`
          ),
          callClaude(apiKey,
            "You are a Fiverr/Upwork pricing expert who maximises seller revenue.",
            `Create 3 service packages for this gig:\n${ctx}\n\nFor each package provide:\n- Package name (Basic/Standard/Premium)\n- Price (use the given prices)\n- What's included (bullet points)\n- Delivery time\n- Number of revisions\n\nMake Basic a clear entry point, Standard the best value, Premium the full solution.`
          ),
          callClaude(apiKey,
            "You write FAQ sections that address buyer objections and close sales.",
            `Write 5 FAQ questions and answers for this ${pl.name} gig:\n${ctx}\n\nFAQs should address: timeline, revisions, communication, what you need from the buyer, money-back/guarantee.\nFormat as Q: / A: pairs.`
          ),
          callClaude(apiKey,
            `You are a ${pl.name} SEO expert who knows exactly which tags drive traffic.`,
            `Generate the best 5 search tags/keywords for this ${pl.name} gig:\n${ctx}\n\nReturn ONLY a comma-separated list of 5 tags, each 2–4 words, no explanation.`
          ),
        ]);

        setOutput([
          { label: "📌 Gig Titles (5 options)", content: gigTitle },
          { label: "📝 Gig Description", content: gigDesc },
          { label: "💰 Packages", content: packages },
          { label: "❓ FAQs", content: faqs },
          { label: "🏷️ Tags / Keywords", content: tags },
        ]);

        setSaved(s => [{
          id: Date.now(), platform, mode: "gig",
          title: `${pl.name} Gig — ${gigCategory}`,
          content: gigDesc, savedAt: new Date().toISOString()
        }, ...s.slice(0, 19)]);

      } else if (mode === "optimize") {
        if (!existingProfile.trim()) { alert("Paste your existing profile/bio text."); setGenerating(false); return; }

        const [rewritten, keywords, improvements] = await Promise.all([
          callClaude(apiKey,
            `You are a ${pl.name} profile optimisation expert. You've helped 500+ freelancers get to Top Rated.`,
            `Rewrite this ${pl.name} profile/bio to win more clients:\n\nCurrent profile:\n${existingProfile}\n\nService: ${config.service}\nTarget clients: ${config.niche} in ${config.country}\n\nMake it:\n- Result-focused (lead with outcomes, not skills)\n- Specific (numbers, types of clients, niches)\n- Credible (avoid vague claims)\n- 150–200 words\n- First person, confident but not arrogant`
          ),
          callClaude(apiKey,
            "You are a freelance platform SEO expert.",
            `List the top 10 keywords this ${pl.name} freelancer should include in their profile for maximum search visibility:\n\nService: ${config.service}\nNiche: ${config.niche}\n\nReturn as a simple numbered list with a 1-line explanation for each.`
          ),
          callClaude(apiKey,
            `You are a ${pl.name} profile reviewer who gives brutally honest, actionable feedback.`,
            `Review this profile and give 5 specific improvements:\n\n${existingProfile}\n\nFor each improvement:\n- What's wrong (be specific)\n- How to fix it (give the exact text if possible)\n\nFormat as numbered list.`
          ),
        ]);

        setOutput([
          { label: "✨ Rewritten Profile", content: rewritten },
          { label: "🔍 SEO Keywords to Add", content: keywords },
          { label: "🔧 5 Improvements", content: improvements },
        ]);
      }

      setActiveOut(0);
    } catch (e) { alert("Error: " + e.message); }
    setGenerating(false);
  }

  function copyOut(text) {
    navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  const MODES = [
    { key:"proposal", icon:"📝", label:"Job Proposal",    desc:"Paste a job post, get a winning bid" },
    { key:"gig",      icon:"🛍️", label:"Gig Creator",     desc:"Create full gig listing from scratch" },
    { key:"optimize", icon:"⚡", label:"Profile Optimizer",desc:"Rewrite profile to rank higher" },
  ];

  return (
    <div className="freelance-wrap">
      <div className="freelance-header">
        <h2>🎯 Upwork / Fiverr Proposal Generator</h2>
        <p className="sub">Win more jobs with AI-written proposals, optimized gig listings, and profile rewrites</p>
      </div>

      {/* Platform selector */}
      <div className="fl-platform-tabs">
        {PLATFORMS_FL.map(p => (
          <button key={p.key}
            className={`fl-platform-btn ${platform === p.key ? "active" : ""}`}
            style={platform === p.key ? { borderColor: p.color, background: p.bg, color: p.color } : {}}
            onClick={() => { setPlatform(p.key); setOutput(null); }}>
            <span className="fl-platform-icon">{p.icon}</span>
            <span className="fl-platform-name">{p.name}</span>
          </button>
        ))}
      </div>

      {/* Mode selector */}
      <div className="fl-mode-tabs">
        {MODES.map(m => (
          <button key={m.key}
            className={`fl-mode-btn ${mode === m.key ? "active" : ""}`}
            style={mode === m.key ? { borderColor: pl.color, background: pl.bg } : {}}
            onClick={() => { setMode(m.key); setOutput(null); }}>
            <span className="fl-mode-icon">{m.icon}</span>
            <div>
              <div className="fl-mode-label" style={mode === m.key ? { color: pl.color } : {}}>{m.label}</div>
              <div className="fl-mode-desc">{m.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="fl-body">
        {/* Input panel */}
        <div className="fl-input-panel">
          <div className="card">
            {/* Proposal mode */}
            {mode === "proposal" && <>
              <h3>📋 Job Post Details</h3>
              <div className="field">
                <label>📄 Paste Job Post / Description <span className="required-star">*</span></label>
                <textarea className="fl-textarea" rows={10}
                  placeholder={"Paste the full Upwork/Fiverr job description here…\n\nExample:\nI need a professional WordPress website for my dental clinic. Looking for someone who can...\n\nBudget: $500\nTimeline: 2 weeks"}
                  value={jobPost} onChange={e => setJobPost(e.target.value)} />
              </div>
              <div className="fl-form-row">
                <div className="field">
                  <label>💵 Your Bid Amount</label>
                  <input type="text" placeholder="$750" value={bidAmount} onChange={e => setBidAmount(e.target.value)} />
                </div>
                <div className="field">
                  <label>📅 Delivery (days)</label>
                  <input type="text" placeholder="7" value={deliveryDays} onChange={e => setDeliveryDays(e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label>🏆 Your Relevant Experience (optional)</label>
                <input type="text" placeholder="Built 30+ Shopify stores, including $2M revenue client" value={yourExperience} onChange={e => setYourExperience(e.target.value)} />
                <span className="field-hint">1 sentence — the strongest result you have in this area</span>
              </div>
            </>}

            {/* Gig mode */}
            {mode === "gig" && <>
              <h3>🛍️ Gig Details</h3>
              <div className="field">
                <label>📂 Category</label>
                <select value={gigCategory} onChange={e => setGigCategory(e.target.value)}
                  style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"9px 12px",fontSize:14}}>
                  {JOB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label>🔑 Target Keywords (buyers search for)</label>
                <input type="text" placeholder="wordpress website, business website, responsive design" value={gigKeywords} onChange={e => setGigKeywords(e.target.value)} />
                <span className="field-hint">Comma-separated — what would your buyer type in search?</span>
              </div>
              <div className="fl-form-row three">
                <div className="field"><label>🥉 Basic Price</label><input type="text" placeholder="$50" value={gigPriceBasic} onChange={e => setGigPriceBasic(e.target.value)} /></div>
                <div className="field"><label>🥈 Standard Price</label><input type="text" placeholder="$150" value={gigPriceStandard} onChange={e => setGigPriceStandard(e.target.value)} /></div>
                <div className="field"><label>🥇 Premium Price</label><input type="text" placeholder="$350" value={gigPricePremium} onChange={e => setGigPricePremium(e.target.value)} /></div>
              </div>
            </>}

            {/* Optimize mode */}
            {mode === "optimize" && <>
              <h3>⚡ Profile Optimizer</h3>
              <div className="field">
                <label>📄 Paste Your Current Profile / Bio <span className="required-star">*</span></label>
                <textarea className="fl-textarea" rows={10}
                  placeholder={"Paste your current Upwork overview or Fiverr bio here…\n\nExample:\nI am a web developer with 5 years of experience. I specialize in WordPress and can build any kind of website. I am hardworking and deliver on time..."}
                  value={existingProfile} onChange={e => setExistingProfile(e.target.value)} />
              </div>
            </>}

            <button className="btn-primary fl-generate-btn"
              style={{ background: `linear-gradient(135deg, ${pl.color}, ${pl.color}cc)` }}
              onClick={generate} disabled={generating}>
              {generating ? `⏳ Generating ${pl.name} assets…` : `✨ Generate ${pl.name} ${mode === "proposal" ? "Proposals" : mode === "gig" ? "Gig Content" : "Profile Rewrite"}`}
            </button>
          </div>

          {/* Platform tips */}
          <div className="card fl-tips-card" style={{ borderLeft: `4px solid ${pl.color}` }}>
            <h3 style={{ color: pl.color }}>💡 {pl.name} Winning Tips</h3>
            {pl.tips.map((t, i) => (
              <div key={i} className="fl-tip">
                <span className="fl-tip-num" style={{ background: pl.color }}>{ i + 1}</span>
                <span>{t}</span>
              </div>
            ))}
          </div>

          {/* Saved proposals */}
          {saved.length > 0 && (
            <div className="card">
              <h3>📂 Saved ({saved.length})</h3>
              <div className="fl-saved-list">
                {saved.slice(0, 8).map(s => (
                  <div key={s.id} className="fl-saved-item">
                    <div className="fl-saved-meta">
                      <span className="fl-saved-platform">{PLATFORMS_FL.find(p=>p.key===s.platform)?.icon} {s.platform}</span>
                      <span className="fl-saved-mode">{s.mode}</span>
                      <span className="fl-saved-date">{new Date(s.savedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="fl-saved-title">{s.title}</div>
                    <button className="btn-ghost" style={{fontSize:11,marginTop:4}} onClick={() => { navigator.clipboard.writeText(s.content); }}>📋 Copy</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Output panel */}
        <div className="fl-output-panel">
          {!output && !generating && (
            <div className="fl-placeholder">
              <div className="fl-placeholder-icon">{pl.icon}</div>
              <h3>Ready to generate {pl.name} content</h3>
              <p>Fill in the details on the left and click Generate.</p>
              <div className="fl-what-you-get">
                <div className="fl-what-title">What you'll get:</div>
                {mode === "proposal" && (
                  <div className="fl-what-list">
                    <div>🎯 Main proposal — hook + approach + proof + question</div>
                    <div>⚡ Short cover letter — 100-word punchy version</div>
                    <div>❓ 5 clarifying questions — show expertise, qualify client</div>
                  </div>
                )}
                {mode === "gig" && (
                  <div className="fl-what-list">
                    <div>📌 5 SEO-optimized gig titles</div>
                    <div>📝 Full gig description (250–350 words)</div>
                    <div>💰 3 packages — Basic / Standard / Premium</div>
                    <div>❓ 5 buyer FAQs to close objections</div>
                    <div>🏷️ Top 5 search tags</div>
                  </div>
                )}
                {mode === "optimize" && (
                  <div className="fl-what-list">
                    <div>✨ Rewritten profile — results-focused, 150–200 words</div>
                    <div>🔍 10 SEO keywords to add for more visibility</div>
                    <div>🔧 5 specific improvements with exact fixes</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {generating && (
            <div className="fl-generating">
              <div className="fl-gen-spinner">✨</div>
              <h3>Generating {pl.name} content…</h3>
              <p>Running {mode === "gig" ? "5" : "3"} parallel AI writes</p>
              <div className="fl-gen-dots"><span/><span/><span/></div>
            </div>
          )}

          {output && (
            <div className="fl-output">
              {/* Output tabs */}
              <div className="fl-output-tabs">
                {output.map((o, i) => (
                  <button key={i}
                    className={`fl-output-tab ${activeOut === i ? "active" : ""}`}
                    style={activeOut === i ? { borderColor: pl.color, color: pl.color, background: pl.bg } : {}}
                    onClick={() => setActiveOut(i)}>
                    {o.label}
                  </button>
                ))}
              </div>

              {/* Output content */}
              <div className="card fl-output-content">
                <div className="fl-output-header">
                  <strong>{output[activeOut].label}</strong>
                  <button className="btn-ghost copy-btn" onClick={() => copyOut(output[activeOut].content)}>
                    {copied ? "✓ Copied!" : "📋 Copy"}
                  </button>
                </div>
                <pre className="result-pre fl-pre">{output[activeOut].content}</pre>
              </div>

              {/* Score card */}
              {mode === "proposal" && activeOut === 0 && (
                <div className="card fl-score-card">
                  <h3>✅ Proposal Quality Checklist</h3>
                  <div className="fl-checklist">
                    {[
                      "Starts with their problem, not 'Hi I'm'",
                      "Mentions a specific result or number",
                      "Shows understanding of their exact need",
                      "Explains your approach in steps",
                      "Ends with ONE smart question",
                      "Under 200 words",
                    ].map((item, i) => (
                      <div key={i} className="fl-check-item">
                        <span className="fl-check-icon">✅</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PROJECT MANAGER TAB (Priority 6) ─────────────────────────────────────────
// Full client project management: tasks, milestones, invoices, payments, time log

const PM_STORAGE = {
  projects: "cf_pm_projects",
  tasks:    "cf_pm_tasks",
  invoices: "cf_pm_invoices",
  timelog:  "cf_pm_timelog",
};

const TASK_STATUS = ["To Do","In Progress","Review","Done","Blocked"];
const TASK_PRIORITY = ["Low","Medium","High","Urgent"];
const TASK_STATUS_COLOR = {"To Do":"#64748b","In Progress":"#3b82f6","Review":"#f59e0b","Done":"#22c55e","Blocked":"#ef4444"};
const TASK_PRIORITY_COLOR = {"Low":"#94a3b8","Medium":"#f59e0b","High":"#f97316","Urgent":"#ef4444"};
const INVOICE_STATUS = ["Draft","Sent","Paid","Overdue","Cancelled"];
const INVOICE_STATUS_COLOR = {"Draft":"#64748b","Sent":"#3b82f6","Paid":"#22c55e","Overdue":"#ef4444","Cancelled":"#94a3b8"};

function useLocalState(key, def) {
  const [val, setVal] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? def; }
    catch { return def; }
  });
  const set = (v) => {
    const next = typeof v === "function" ? v(val) : v;
    setVal(next);
    localStorage.setItem(key, JSON.stringify(next));
  };
  return [val, set];
}

function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function today() { return new Date().toISOString().slice(0, 10); }
function fmt(iso) { if (!iso) return "—"; return new Date(iso).toLocaleDateString(); }
function fmtMoney(n) { return "$" + Number(n || 0).toLocaleString(); }
function daysDiff(iso) {
  if (!iso) return null;
  const diff = Math.ceil((new Date(iso) - new Date()) / 86400000);
  return diff;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function DeadlineBadge({ date }) {
  if (!date) return null;
  const d = daysDiff(date);
  if (d < 0) return <span className="dl-badge overdue">⚠️ {Math.abs(d)}d overdue</span>;
  if (d === 0) return <span className="dl-badge today">🔴 Due today</span>;
  if (d <= 3)  return <span className="dl-badge soon">🟠 {d}d left</span>;
  return <span className="dl-badge ok">🟢 {d}d left</span>;
}

function ProgressRing({ pct }) {
  const r = 20; const circ = 2 * Math.PI * r;
  const stroke = circ - (pct / 100) * circ;
  const color = pct === 100 ? "#22c55e" : pct > 60 ? "#3b82f6" : pct > 30 ? "#f59e0b" : "#ef4444";
  return (
    <svg width="52" height="52" className="progress-ring">
      <circle cx="26" cy="26" r={r} fill="none" stroke="#f1f5f9" strokeWidth="5"/>
      <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={stroke}
        transform="rotate(-90 26 26)" style={{transition:"stroke-dashoffset .4s"}}/>
      <text x="26" y="30" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{pct}%</text>
    </svg>
  );
}

function InvoicePDF({ inv, project, config }) {
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Invoice #${inv.number}</title>
<style>
  body{font-family:Arial,sans-serif;margin:40px;color:#1e293b;max-width:700px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px}
  .logo{font-size:24px;font-weight:800;color:#1d4ed8}
  .inv-title{font-size:28px;font-weight:800;color:#1e293b}
  .inv-num{color:#64748b;font-size:14px;margin-top:4px}
  .status{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;background:${inv.status==="Paid"?"#f0fdf4":"#eff6ff"};color:${inv.status==="Paid"?"#16a34a":"#1d4ed8"}}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-bottom:40px}
  .party h4{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:8px}
  .party p{font-size:14px;line-height:1.8;margin:0}
  table{width:100%;border-collapse:collapse;margin-bottom:30px}
  th{background:#f8fafc;padding:10px 14px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#64748b;border-bottom:2px solid #e2e8f0}
  td{padding:12px 14px;border-bottom:1px solid #f1f5f9;font-size:14px}
  .total-row{background:#f8fafc;font-weight:700;font-size:16px}
  .total-row td{padding:16px 14px}
  .paid-stamp{color:#16a34a;font-size:20px;font-weight:800;border:3px solid #16a34a;display:inline-block;padding:6px 20px;border-radius:6px;transform:rotate(-5deg);margin-top:10px}
  .footer{margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center}
  .due-box{background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:14px;margin-bottom:20px}
</style></head><body>
<div class="header">
  <div><div class="logo">${config.companyName || config.yourName || "Your Agency"}</div>
    <div style="font-size:13px;color:#64748b;margin-top:4px">${config.yourEmail || ""}</div>
  </div>
  <div style="text-align:right">
    <div class="inv-title">INVOICE</div>
    <div class="inv-num">#${inv.number}</div>
    <div style="margin-top:8px"><span class="status">${inv.status}</span></div>
  </div>
</div>
<div class="parties">
  <div class="party"><h4>From</h4><p><strong>${config.companyName || config.yourName || "Your Agency"}</strong><br>${config.yourEmail || ""}</p></div>
  <div class="party"><h4>To</h4><p><strong>${project?.clientName || "Client"}</strong><br>${project?.clientEmail || ""}</p></div>
</div>
<div class="due-box">
  <div style="display:flex;justify-content:space-between">
    <div><div style="font-size:11px;color:#92400e;text-transform:uppercase;font-weight:700">Issue Date</div><div style="font-size:15px;font-weight:600">${fmt(inv.issueDate)}</div></div>
    <div><div style="font-size:11px;color:#92400e;text-transform:uppercase;font-weight:700">Due Date</div><div style="font-size:15px;font-weight:600">${fmt(inv.dueDate)}</div></div>
    <div><div style="font-size:11px;color:#92400e;text-transform:uppercase;font-weight:700">Amount Due</div><div style="font-size:22px;font-weight:800;color:#1e293b">${fmtMoney(inv.amount)}</div></div>
  </div>
</div>
<table>
  <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
  <tbody>
    ${(inv.items || [{desc: inv.description || project?.name || "Services", qty: 1, rate: inv.amount}]).map(item =>
      `<tr><td>${item.desc}</td><td>${item.qty || 1}</td><td>${fmtMoney(item.rate)}</td><td>${fmtMoney((item.qty||1)*item.rate)}</td></tr>`
    ).join("")}
  </tbody>
  <tfoot><tr class="total-row"><td colspan="3">Total</td><td>${fmtMoney(inv.amount)}</td></tr></tfoot>
</table>
${inv.notes ? `<div style="background:#f8fafc;border-radius:8px;padding:14px;font-size:13px;color:#374151"><strong>Notes:</strong> ${inv.notes}</div>` : ""}
${inv.status === "Paid" ? '<div class="paid-stamp">✓ PAID</div>' : ""}
<div class="footer">Thank you for your business! · ${config.companyName || config.yourName || "Your Agency"}</div>
</body></html>`;
  return html;
}

// ── PROJECT MANAGER MAIN COMPONENT ───────────────────────────────────────────
function ProjectManagerTab({ config, apiKey, stages }) {
  const [projects, setProjects]   = useLocalState(PM_STORAGE.projects, []);
  const [tasks, setTasks]         = useLocalState(PM_STORAGE.tasks, {});
  const [invoices, setInvoices]   = useLocalState(PM_STORAGE.invoices, {});
  const [timelog, setTimelog]     = useLocalState(PM_STORAGE.timelog, {});

  const [activeProject, setActiveProject] = useState(null);
  const [view, setView] = useState("overview"); // overview | tasks | invoices | timelog
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Won leads from pipeline as project candidates
  const wonLeads = Array.isArray(stages?.leads?.result)
    ? stages.leads.result.filter(l => l._won)
    : [];

  // ── Project CRUD ────────────────────────────────────────────────────────────
  const proj = projects.find(p => p.id === activeProject) || null;
  const projTasks   = tasks[activeProject]   || [];
  const projInvs    = invoices[activeProject] || [];
  const projTime    = timelog[activeProject]  || [];

  function addProject(data) {
    const p = { id: newId(), createdAt: today(), status: "Active", ...data };
    setProjects(ps => [p, ...ps]);
    setActiveProject(p.id);
    setShowNewProject(false);
  }

  function updateProject(id, patch) {
    setProjects(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p));
  }

  function deleteProject(id) {
    if (!window.confirm("Delete this project and all its data?")) return;
    setProjects(ps => ps.filter(p => p.id !== id));
    setTasks(t => { const n = { ...t }; delete n[id]; return n; });
    setInvoices(i => { const n = { ...i }; delete n[id]; return n; });
    setTimelog(t => { const n = { ...t }; delete n[id]; return n; });
    if (activeProject === id) setActiveProject(null);
  }

  // ── Task CRUD ───────────────────────────────────────────────────────────────
  function addTask(data) {
    const t = { id: newId(), createdAt: today(), status: "To Do", priority: "Medium", ...data };
    setTasks(ts => ({ ...ts, [activeProject]: [t, ...(ts[activeProject] || [])] }));
    setShowNewTask(false);
  }

  function updateTask(tid, patch) {
    setTasks(ts => ({
      ...ts,
      [activeProject]: (ts[activeProject] || []).map(t => t.id === tid ? { ...t, ...patch } : t)
    }));
  }

  function deleteTask(tid) {
    setTasks(ts => ({ ...ts, [activeProject]: (ts[activeProject] || []).filter(t => t.id !== tid) }));
  }

  // ── Invoice CRUD ─────────────────────────────────────────────────────────────
  function addInvoice(data) {
    const inv = {
      id: newId(), createdAt: today(), status: "Draft",
      number: `INV-${new Date().getFullYear()}-${String(projInvs.length + 1).padStart(3, "0")}`,
      issueDate: today(),
      items: [{ desc: data.description || proj?.name || "Services", qty: 1, rate: data.amount }],
      ...data
    };
    setInvoices(is => ({ ...is, [activeProject]: [inv, ...(is[activeProject] || [])] }));
    setShowNewInvoice(false);
  }

  function updateInvoice(iid, patch) {
    setInvoices(is => ({
      ...is,
      [activeProject]: (is[activeProject] || []).map(i => i.id === iid ? { ...i, ...patch } : i)
    }));
  }

  function downloadInvoice(inv) {
    const html = InvoicePDF({ inv, project: proj, config });
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `invoice-${inv.number}.html`; a.click();
  }

  // ── Time Log ─────────────────────────────────────────────────────────────────
  function addTimeEntry(data) {
    const entry = { id: newId(), date: today(), ...data };
    setTimelog(tl => ({ ...tl, [activeProject]: [entry, ...(tl[activeProject] || [])] }));
  }

  // ── AI Task Generator ────────────────────────────────────────────────────────
  async function generateTasks() {
    if (!apiKey) { alert("Anthropic API key required."); return; }
    if (!proj) return;
    setGenerating(true);
    try {
      const raw = await callClaude(apiKey,
        "You are a project manager expert. Return ONLY valid JSON, no markdown.",
        `Generate a complete task breakdown for this project:
Client: ${proj.clientName} | Service: ${proj.service || config.service}
Budget: ${proj.budget} | Deadline: ${proj.deadline || "flexible"}
Description: ${proj.description || ""}

Return JSON array of tasks (8-12 tasks):
[{"title":"Task name","description":"details","priority":"High/Medium/Low","dueDate":"YYYY-MM-DD","estimatedHours":2,"category":"Design/Dev/Content/Review/Communication"}]

Make tasks specific, ordered logically, with realistic time estimates.`
      );
      const parsed = parseJSON(raw);
      if (parsed?.length) {
        parsed.forEach(t => addTask(t));
        alert(`✅ ${parsed.length} tasks generated for "${proj.name}"!`);
      }
    } catch (e) { alert("Error: " + e.message); }
    setGenerating(false);
  }

  // ── Computed stats ────────────────────────────────────────────────────────────
  function getProjectStats(pid) {
    const pt = tasks[pid] || [];
    const pi = invoices[pid] || [];
    const ptl = timelog[pid] || [];
    const done = pt.filter(t => t.status === "Done").length;
    const pct = pt.length ? Math.round((done / pt.length) * 100) : 0;
    const totalInvoiced = pi.reduce((s, i) => s + Number(i.amount || 0), 0);
    const totalPaid = pi.filter(i => i.status === "Paid").reduce((s, i) => s + Number(i.amount || 0), 0);
    const totalHours = ptl.reduce((s, e) => s + Number(e.hours || 0), 0);
    return { done, total: pt.length, pct, totalInvoiced, totalPaid, totalHours };
  }

  // ── Views ─────────────────────────────────────────────────────────────────────

  // NEW PROJECT MODAL
  function NewProjectModal() {
    const [form, setForm] = useState({
      name: "", clientName: "", clientEmail: "", service: config.service || "",
      budget: "", deadline: "", description: "", status: "Active"
    });
    const f = (k) => ({ value: form[k], onChange: e => setForm(v => ({ ...v, [k]: e.target.value })) });
    return (
      <div className="modal-overlay" onClick={() => setShowNewProject(false)}>
        <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>➕ New Project</h3>
            <button className="modal-close" onClick={() => setShowNewProject(false)}>✕</button>
          </div>
          <div className="modal-body">
            <div className="pm-form-grid">
              <div className="field pm-span2"><label>📋 Project Name *</label><input type="text" placeholder="Acme Corp Website Redesign" {...f("name")} /></div>
              <div className="field"><label>👤 Client Name *</label><input type="text" placeholder="John Smith / Acme Corp" {...f("clientName")} /></div>
              <div className="field"><label>📧 Client Email</label><input type="email" placeholder="john@acme.com" {...f("clientEmail")} /></div>
              <div className="field"><label>🛠️ Service</label><input type="text" placeholder="Web Design & Development" {...f("service")} /></div>
              <div className="field"><label>💵 Budget</label><input type="text" placeholder="$1,500" {...f("budget")} /></div>
              <div className="field"><label>📅 Deadline</label><input type="date" {...f("deadline")} /></div>
              <div className="field"><label>📊 Status</label>
                <select style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"9px 12px"}}
                  value={form.status} onChange={e => setForm(v => ({...v, status: e.target.value}))}>
                  {["Active","On Hold","Completed","Cancelled"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="field pm-span2"><label>📝 Description</label>
                <textarea className="notes-area" rows={3} placeholder="Brief project description…" {...f("description")} />
              </div>
            </div>
            <button className="btn-primary" style={{width:"100%",marginTop:8}} onClick={() => { if (!form.name || !form.clientName) { alert("Project Name and Client Name required."); return; } addProject(form); }}>
              ✅ Create Project
            </button>
          </div>
        </div>
      </div>
    );
  }

  // NEW TASK MODAL
  function NewTaskModal() {
    const [form, setForm] = useState({ title:"", description:"", priority:"Medium", dueDate:"", estimatedHours:"", category:"" });
    const f = k => ({ value: form[k], onChange: e => setForm(v=>({...v,[k]:e.target.value})) });
    return (
      <div className="modal-overlay" onClick={() => setShowNewTask(false)}>
        <div className="modal" style={{maxWidth:480}} onClick={e=>e.stopPropagation()}>
          <div className="modal-header"><h3>➕ New Task</h3><button className="modal-close" onClick={()=>setShowNewTask(false)}>✕</button></div>
          <div className="modal-body">
            <div className="pm-form-grid">
              <div className="field pm-span2"><label>📋 Task Title *</label><input type="text" placeholder="Design homepage mockup" {...f("title")}/></div>
              <div className="field"><label>🎯 Priority</label>
                <select style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"9px 12px"}} value={form.priority} onChange={e=>setForm(v=>({...v,priority:e.target.value}))}>
                  {TASK_PRIORITY.map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="field"><label>📂 Category</label><input type="text" placeholder="Design / Dev / Content…" {...f("category")}/></div>
              <div className="field"><label>📅 Due Date</label><input type="date" {...f("dueDate")}/></div>
              <div className="field"><label>⏱️ Est. Hours</label><input type="number" placeholder="2" min="0.5" step="0.5" {...f("estimatedHours")}/></div>
              <div className="field pm-span2"><label>📝 Description</label><textarea className="notes-area" rows={2} placeholder="Task details…" {...f("description")}/></div>
            </div>
            <button className="btn-primary" style={{width:"100%",marginTop:8}} onClick={()=>{if(!form.title){alert("Task title required.");return;}addTask(form);}}>
              ✅ Add Task
            </button>
          </div>
        </div>
      </div>
    );
  }

  // NEW INVOICE MODAL
  function NewInvoiceModal() {
    const [form, setForm] = useState({ description: proj?.name || "", amount:"", dueDate:"", notes:"", type:"Fixed" });
    const f = k => ({ value: form[k], onChange: e => setForm(v=>({...v,[k]:e.target.value})) });
    return (
      <div className="modal-overlay" onClick={()=>setShowNewInvoice(false)}>
        <div className="modal" style={{maxWidth:440}} onClick={e=>e.stopPropagation()}>
          <div className="modal-header"><h3>📄 New Invoice</h3><button className="modal-close" onClick={()=>setShowNewInvoice(false)}>✕</button></div>
          <div className="modal-body">
            <div className="pm-form-grid">
              <div className="field pm-span2"><label>📋 Description *</label><input type="text" placeholder="Website Design — 50% Deposit" {...f("description")}/></div>
              <div className="field"><label>💵 Amount *</label><input type="number" placeholder="750" min="0" {...f("amount")}/></div>
              <div className="field"><label>📅 Due Date</label><input type="date" {...f("dueDate")}/></div>
              <div className="field"><label>🏷️ Type</label>
                <select style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"9px 12px"}} value={form.type} onChange={e=>setForm(v=>({...v,type:e.target.value}))}>
                  {["Deposit","Milestone","Final Payment","Full Payment","Retainer"].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="field pm-span2"><label>📝 Notes</label><textarea className="notes-area" rows={2} placeholder="Payment terms, bank details…" {...f("notes")}/></div>
            </div>
            <button className="btn-primary" style={{width:"100%",marginTop:8}} onClick={()=>{if(!form.amount){alert("Amount required.");return;}addInvoice(form);}}>
              ✅ Create Invoice
            </button>
          </div>
        </div>
      </div>
    );
  }

  // TIME LOGGER MODAL
  function TimeLogModal() {
    const [form, setForm] = useState({ description:"", hours:"", date:today(), category:"Development" });
    const f = k => ({ value: form[k], onChange: e => setForm(v=>({...v,[k]:e.target.value})) });
    return (
      <div className="modal-overlay" onClick={()=>setShowTimer(false)}>
        <div className="modal" style={{maxWidth:400}} onClick={e=>e.stopPropagation()}>
          <div className="modal-header"><h3>⏱️ Log Time</h3><button className="modal-close" onClick={()=>setShowTimer(false)}>✕</button></div>
          <div className="modal-body">
            <div className="pm-form-grid">
              <div className="field pm-span2"><label>📋 What did you work on?</label><input type="text" placeholder="Built homepage layout" {...f("description")}/></div>
              <div className="field"><label>⏱️ Hours</label><input type="number" placeholder="2.5" min="0.25" step="0.25" {...f("hours")}/></div>
              <div className="field"><label>📅 Date</label><input type="date" {...f("date")}/></div>
              <div className="field pm-span2"><label>📂 Category</label>
                <select style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"9px 12px"}} value={form.category} onChange={e=>setForm(v=>({...v,category:e.target.value}))}>
                  {["Design","Development","Communication","Review","Research","Testing","Admin"].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <button className="btn-primary" style={{width:"100%",marginTop:8}} onClick={()=>{if(!form.hours||!form.description){alert("Description and hours required.");return;}addTimeEntry(form);setShowTimer(false);}}>
              ✅ Log Time
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="pm-wrap">
      {showNewProject && <NewProjectModal />}
      {showNewTask    && activeProject && <NewTaskModal />}
      {showNewInvoice && activeProject && <NewInvoiceModal />}
      {showTimer      && activeProject && <TimeLogModal />}

      <div className="pm-header">
        <div>
          <h2>🗂️ Project Manager</h2>
          <p className="sub">Manage tasks, milestones, invoices and time — for every client you win</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNewProject(true)}>➕ New Project</button>
      </div>

      {/* Overall stats bar */}
      {projects.length > 0 && (() => {
        const active = projects.filter(p => p.status === "Active").length;
        const allInv = Object.values(invoices).flat();
        const totalEarned = allInv.filter(i => i.status === "Paid").reduce((s,i) => s + Number(i.amount||0), 0);
        const totalPending = allInv.filter(i => i.status === "Sent").reduce((s,i) => s + Number(i.amount||0), 0);
        const allTime = Object.values(timelog).flat().reduce((s,e) => s + Number(e.hours||0), 0);
        return (
          <div className="pm-stats-bar">
            <div className="pm-stat"><div className="pm-stat-val">{projects.length}</div><div className="pm-stat-label">Total Projects</div></div>
            <div className="pm-stat"><div className="pm-stat-val" style={{color:"#22c55e"}}>{active}</div><div className="pm-stat-label">Active</div></div>
            <div className="pm-stat"><div className="pm-stat-val" style={{color:"#22c55e"}}>{fmtMoney(totalEarned)}</div><div className="pm-stat-label">💰 Total Earned</div></div>
            <div className="pm-stat"><div className="pm-stat-val" style={{color:"#f59e0b"}}>{fmtMoney(totalPending)}</div><div className="pm-stat-label">⏳ Pending Payment</div></div>
            <div className="pm-stat"><div className="pm-stat-val">{allTime.toFixed(1)}h</div><div className="pm-stat-label">⏱️ Hours Logged</div></div>
          </div>
        );
      })()}

      <div className="pm-body">
        {/* Project list sidebar */}
        <div className="pm-sidebar">
          <div className="pm-sidebar-title">Projects ({projects.length})</div>
          {projects.length === 0 && (
            <div className="pm-empty-sidebar">
              <div style={{fontSize:32,marginBottom:8}}>🗂️</div>
              <p>No projects yet.<br/>Click <strong>+ New Project</strong> to start.</p>
              <p style={{fontSize:11,color:"#94a3b8",marginTop:8}}>Tip: Win a client in 👥 Pipeline, then create a project here.</p>
            </div>
          )}
          {projects.map(p => {
            const stats = getProjectStats(p.id);
            const isActive = activeProject === p.id;
            return (
              <div key={p.id}
                className={`pm-project-item ${isActive ? "active" : ""}`}
                onClick={() => { setActiveProject(p.id); setView("overview"); }}>
                <div className="pm-project-item-top">
                  <span className="pm-project-name">{p.name}</span>
                  <span className={`pm-status-badge ${p.status.toLowerCase().replace(" ","-")}`}>{p.status}</span>
                </div>
                <div className="pm-project-client">👤 {p.clientName}</div>
                <div className="pm-project-meta">
                  <span>📋 {stats.done}/{stats.total} tasks</span>
                  {p.deadline && <DeadlineBadge date={p.deadline} />}
                </div>
                <div className="pm-project-progress-bar">
                  <div style={{width:`${stats.pct}%`, background: stats.pct===100?"#22c55e":"#3b82f6"}}/>
                </div>
              </div>
            );
          })}
        </div>

        {/* Project detail */}
        {!proj ? (
          <div className="pm-no-project">
            <div style={{fontSize:48}}>🗂️</div>
            <h3>Select a project to manage</h3>
            <p>Or create a new project to get started.</p>
          </div>
        ) : (
          <div className="pm-detail">
            {/* Project header */}
            <div className="pm-detail-header">
              <div>
                <h3>{proj.name}</h3>
                <div className="pm-detail-meta">
                  <span>👤 {proj.clientName}</span>
                  {proj.clientEmail && <span>📧 {proj.clientEmail}</span>}
                  <span>💵 {proj.budget || "—"}</span>
                  {proj.deadline && <span>📅 Deadline: {fmt(proj.deadline)}</span>}
                  <DeadlineBadge date={proj.deadline} />
                </div>
              </div>
              <div className="pm-detail-actions">
                <select className="pm-status-select"
                  value={proj.status}
                  onChange={e => updateProject(proj.id, { status: e.target.value })}>
                  {["Active","On Hold","Completed","Cancelled"].map(s => <option key={s}>{s}</option>)}
                </select>
                <button className="btn-ghost" style={{fontSize:11,color:"#ef4444"}} onClick={() => deleteProject(proj.id)}>🗑 Delete</button>
              </div>
            </div>

            {/* Inner nav */}
            <div className="pm-inner-nav">
              {[["overview","📊 Overview"],["tasks","📋 Tasks"],["invoices","💵 Invoices"],["timelog","⏱️ Time Log"]].map(([v,l]) => (
                <button key={v} className={`pm-nav-btn ${view===v?"active":""}`} onClick={() => setView(v)}>{l}</button>
              ))}
            </div>

            {/* ── OVERVIEW ── */}
            {view === "overview" && (() => {
              const stats = getProjectStats(proj.id);
              return (
                <div className="pm-overview">
                  <div className="pm-overview-stats">
                    <div className="card pm-ov-stat">
                      <ProgressRing pct={stats.pct} />
                      <div><div className="pm-ov-label">Progress</div><div className="pm-ov-val">{stats.done}/{stats.total} tasks</div></div>
                    </div>
                    <div className="card pm-ov-stat">
                      <div style={{fontSize:28}}>💰</div>
                      <div><div className="pm-ov-label">Invoiced</div><div className="pm-ov-val">{fmtMoney(stats.totalInvoiced)}</div></div>
                    </div>
                    <div className="card pm-ov-stat">
                      <div style={{fontSize:28}}>✅</div>
                      <div><div className="pm-ov-label">Paid</div><div className="pm-ov-val" style={{color:"#22c55e"}}>{fmtMoney(stats.totalPaid)}</div></div>
                    </div>
                    <div className="card pm-ov-stat">
                      <div style={{fontSize:28}}>⏱️</div>
                      <div><div className="pm-ov-label">Hours Logged</div><div className="pm-ov-val">{stats.totalHours.toFixed(1)}h</div></div>
                    </div>
                  </div>

                  {proj.description && <div className="card" style={{padding:14}}><p style={{fontSize:13,color:"#374151",lineHeight:1.6}}>{proj.description}</p></div>}

                  {/* Upcoming deadlines */}
                  {projTasks.filter(t => t.dueDate && t.status !== "Done").length > 0 && (
                    <div className="card">
                      <h3 style={{fontSize:14,marginBottom:12}}>⏰ Upcoming Deadlines</h3>
                      {projTasks.filter(t => t.dueDate && t.status !== "Done")
                        .sort((a,b) => a.dueDate.localeCompare(b.dueDate))
                        .slice(0, 4)
                        .map(t => (
                          <div key={t.id} className="pm-deadline-row">
                            <span className="pm-dl-title">{t.title}</span>
                            <DeadlineBadge date={t.dueDate} />
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Unpaid invoices */}
                  {projInvs.filter(i => i.status !== "Paid" && i.status !== "Cancelled").length > 0 && (
                    <div className="card">
                      <h3 style={{fontSize:14,marginBottom:12}}>💳 Unpaid Invoices</h3>
                      {projInvs.filter(i => i.status !== "Paid" && i.status !== "Cancelled").map(i => (
                        <div key={i.id} className="pm-inv-row">
                          <span>{i.number} — {i.description}</span>
                          <div style={{display:"flex",gap:8,alignItems:"center"}}>
                            <strong>{fmtMoney(i.amount)}</strong>
                            <span style={{background:INVOICE_STATUS_COLOR[i.status],color:"#fff",fontSize:10,padding:"2px 7px",borderRadius:4,fontWeight:700}}>{i.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── TASKS ── */}
            {view === "tasks" && (
              <div className="pm-tasks">
                <div className="pm-tasks-toolbar">
                  <button className="btn-primary" onClick={() => setShowNewTask(true)}>➕ Add Task</button>
                  <button className="btn-secondary" onClick={generateTasks} disabled={generating}>
                    {generating ? "⏳ Generating…" : "🤖 AI Generate Tasks"}
                  </button>
                </div>
                {projTasks.length === 0 && (
                  <div className="pm-empty"><p>No tasks yet. Add tasks manually or let AI generate a full task breakdown.</p></div>
                )}
                <div className="pm-task-list">
                  {projTasks.map(t => (
                    <div key={t.id} className={`pm-task-card ${t.status === "Done" ? "done" : ""}`}>
                      <div className="pm-task-top">
                        <div className="pm-task-left">
                          <input type="checkbox" checked={t.status === "Done"}
                            onChange={e => updateTask(t.id, { status: e.target.checked ? "Done" : "To Do" })}
                            style={{width:16,height:16,cursor:"pointer"}}/>
                          <span className={`pm-task-title ${t.status==="Done"?"done-text":""}`}>{t.title}</span>
                        </div>
                        <div className="pm-task-right">
                          <span className="pm-priority-dot" style={{background:TASK_PRIORITY_COLOR[t.priority]}} title={t.priority}/>
                          {t.estimatedHours && <span className="pm-task-hours">⏱️ {t.estimatedHours}h</span>}
                          {t.dueDate && <DeadlineBadge date={t.dueDate} />}
                          <select className="pm-task-status-sel"
                            value={t.status}
                            style={{background:TASK_STATUS_COLOR[t.status],color:"#fff"}}
                            onChange={e => updateTask(t.id, { status: e.target.value })}>
                            {TASK_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <button className="btn-ghost" style={{fontSize:11,padding:"2px 6px",color:"#ef4444"}} onClick={() => deleteTask(t.id)}>✕</button>
                        </div>
                      </div>
                      {t.description && <div className="pm-task-desc">{t.description}</div>}
                      {t.category && <span className="pm-task-category">{t.category}</span>}
                    </div>
                  ))}
                </div>

                {/* Task summary */}
                {projTasks.length > 0 && (
                  <div className="pm-task-summary">
                    {TASK_STATUS.map(s => {
                      const count = projTasks.filter(t => t.status === s).length;
                      return count > 0 ? (
                        <span key={s} className="pm-task-summary-badge" style={{background:TASK_STATUS_COLOR[s]+"22",color:TASK_STATUS_COLOR[s],borderColor:TASK_STATUS_COLOR[s]+"44"}}>
                          {s}: {count}
                        </span>
                      ) : null;
                    })}
                    <span style={{fontSize:12,color:"#64748b",marginLeft:"auto"}}>
                      Total est: {projTasks.reduce((s,t) => s + Number(t.estimatedHours||0), 0)}h
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ── INVOICES ── */}
            {view === "invoices" && (
              <div className="pm-invoices">
                <div className="pm-tasks-toolbar">
                  <button className="btn-primary" onClick={() => setShowNewInvoice(true)}>➕ New Invoice</button>
                  <div className="pm-inv-totals">
                    <span>Total: <strong>{fmtMoney(projInvs.reduce((s,i)=>s+Number(i.amount||0),0))}</strong></span>
                    <span style={{color:"#22c55e"}}>Paid: <strong>{fmtMoney(projInvs.filter(i=>i.status==="Paid").reduce((s,i)=>s+Number(i.amount||0),0))}</strong></span>
                    <span style={{color:"#f59e0b"}}>Pending: <strong>{fmtMoney(projInvs.filter(i=>i.status==="Sent").reduce((s,i)=>s+Number(i.amount||0),0))}</strong></span>
                  </div>
                </div>
                {projInvs.length === 0 && <div className="pm-empty"><p>No invoices yet. Create your first invoice to send to the client.</p></div>}
                <div className="pm-inv-list">
                  {projInvs.map(inv => (
                    <div key={inv.id} className="pm-inv-card">
                      <div className="pm-inv-card-top">
                        <div>
                          <div className="pm-inv-number">{inv.number}</div>
                          <div className="pm-inv-desc">{inv.description}</div>
                          <div className="pm-inv-dates">Issued: {fmt(inv.issueDate)} · Due: {fmt(inv.dueDate)}</div>
                        </div>
                        <div className="pm-inv-right">
                          <div className="pm-inv-amount">{fmtMoney(inv.amount)}</div>
                          <select className="pm-inv-status-sel"
                            value={inv.status}
                            style={{background:INVOICE_STATUS_COLOR[inv.status],color:"#fff"}}
                            onChange={e => updateInvoice(inv.id, { status: e.target.value })}>
                            {INVOICE_STATUS.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="pm-inv-actions">
                        <button className="btn-secondary" style={{fontSize:12}} onClick={() => downloadInvoice(inv)}>⬇️ Download HTML Invoice</button>
                        {inv.status === "Sent" && (
                          <button className="btn-ghost" style={{fontSize:12,color:"#22c55e"}} onClick={() => updateInvoice(inv.id, { status: "Paid", paidAt: today() })}>✅ Mark Paid</button>
                        )}
                        {inv.status === "Draft" && (
                          <button className="btn-ghost" style={{fontSize:12,color:"#3b82f6"}} onClick={() => updateInvoice(inv.id, { status: "Sent" })}>📤 Mark Sent</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TIME LOG ── */}
            {view === "timelog" && (
              <div className="pm-timelog">
                <div className="pm-tasks-toolbar">
                  <button className="btn-primary" onClick={() => setShowTimer(true)}>➕ Log Time</button>
                  <div className="pm-inv-totals">
                    <span>Total hours: <strong>{projTime.reduce((s,e)=>s+Number(e.hours||0),0).toFixed(1)}h</strong></span>
                    {proj.hourlyRate && <span style={{color:"#22c55e"}}>Value: <strong>{fmtMoney(projTime.reduce((s,e)=>s+Number(e.hours||0),0) * proj.hourlyRate)}</strong></span>}
                  </div>
                </div>
                {projTime.length === 0 && <div className="pm-empty"><p>No time logged yet. Track hours to know your actual project profitability.</p></div>}
                <div className="pm-time-list">
                  {projTime.map(e => (
                    <div key={e.id} className="pm-time-entry">
                      <div className="pm-time-left">
                        <div className="pm-time-desc">{e.description}</div>
                        <div className="pm-time-cat">{e.category} · {fmt(e.date)}</div>
                      </div>
                      <div className="pm-time-hours">{Number(e.hours).toFixed(1)}h</div>
                    </div>
                  ))}
                </div>
                {projTime.length > 0 && (
                  <div className="pm-time-breakdown">
                    <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>By Category:</div>
                    {Object.entries(projTime.reduce((acc,e) => {acc[e.category]=(acc[e.category]||0)+Number(e.hours);return acc;},{}))
                      .sort((a,b)=>b[1]-a[1])
                      .map(([cat,hrs]) => (
                        <div key={cat} className="pm-time-cat-row">
                          <span>{cat}</span>
                          <div className="pm-time-cat-bar"><div style={{width:`${(hrs/projTime.reduce((s,e)=>s+Number(e.hours||0),0))*100}%`}}/></div>
                          <span>{hrs.toFixed(1)}h</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DataStoreTab({sheetsConfig,setSheetsConfig,stages,config}){
  const leads=Array.isArray(stages.leads?.result)?stages.leads.result:[];
  const [testStatus,setTestStatus]=useState(null);const [testing,setTesting]=useState(false);
  const [exporting,setExporting]=useState(false);const [exportStatus,setExportStatus]=useState(null);
  async function testConn(){
    if(!sheetsConfig.apiKey||!sheetsConfig.sheetId){setTestStatus({ok:false,msg:"Enter credentials first."});return;}
    setTesting(true);setTestStatus(null);
    try{const res=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetsConfig.sheetId}?key=${sheetsConfig.apiKey}`);
      if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e?.error?.message||`HTTP ${res.status}`);}
      const d=await res.json();setTestStatus({ok:true,msg:`Connected: "${d.properties?.title||"Untitled"}"`});}
    catch(e){setTestStatus({ok:false,msg:e.message});}setTesting(false);
  }
  async function doExport(){
    if(!sheetsConfig.enabled||!sheetsConfig.apiKey||!sheetsConfig.sheetId){setExportStatus({ok:false,msg:"Enable Sheets + add credentials."});return;}
    setExporting(true);setExportStatus(null);
    try{if(leads.length>0){await exportLeads(sheetsConfig,leads,config);await exportWorkflow(sheetsConfig,stages,config);setExportStatus({ok:true,msg:`Exported ${leads.length} leads!`});}
      else setExportStatus({ok:false,msg:"No leads yet."});}
    catch(e){setExportStatus({ok:false,msg:e.message});}setExporting(false);
  }
  const verifiedLeads=leads.filter(l=>l.verified);
  const platformBreakdown=leads.reduce((acc,l)=>{const p=l.platform||"Direct";acc[p]=(acc[p]||0)+1;return acc;},{});
  return(<div className="datastore-tab">
    <div className="datastore-header"><h2>📊 Data Store</h2><p className="sub">Leads, emails, and workflow results</p></div>
    <div className="datastore-grid">
      <div className="card datastore-stat"><div className="stat-icon">👥</div><div className="stat-value">{leads.length}</div><div className="stat-label">Total Leads</div></div>
      <div className="card datastore-stat"><div className="stat-icon">✅</div><div className="stat-value">{verifiedLeads.length}</div><div className="stat-label">Verified Emails</div></div>
      <div className="card datastore-stat"><div className="stat-icon">📬</div><div className="stat-value">{JSON.parse(localStorage.getItem("cf_sent")||"[]").length}</div><div className="stat-label">Emails Sent</div></div>
      <div className="card datastore-stat"><div className="stat-icon">📊</div><div className="stat-value">{sheetsConfig.enabled?"ON":"OFF"}</div><div className="stat-label">Sheets Sync</div></div>
    </div>
    {Object.keys(platformBreakdown).length>0&&<div className="card"><h3>📡 Lead Sources</h3>
      <div className="platform-breakdown">
        {Object.entries(platformBreakdown).map(([p,n])=>(
          <div key={p} className="platform-stat-item">
            <span>{p==="Hunter.io"?"🎯":p==="Apollo.io"?"🚀":p==="Google Places"?"📍":p==="CSV Import"?"📋":"🤖"}</span>
            <span className="platform-stat-name">{p}</span><span className="platform-stat-count">{n}</span>
          </div>
        ))}
      </div>
    </div>}
    <div className="card">
      <h3>🔗 Google Sheets</h3>
      <div className="sheets-connection-row">
        <div className="field"><label>API Key</label><input type="password" placeholder="AIzaSy…" value={sheetsConfig.apiKey} onChange={e=>setSheetsConfig(c=>({...c,apiKey:e.target.value}))}/></div>
        <div className="field"><label>Spreadsheet ID</label><input type="text" placeholder="1BxiMVs0X…" value={sheetsConfig.sheetId} onChange={e=>setSheetsConfig(c=>({...c,sheetId:e.target.value}))}/></div>
        <div className="field toggle-field"><label>Auto-Sync</label><label className="toggle-wrap"><input type="checkbox" checked={sheetsConfig.enabled} onChange={e=>setSheetsConfig(c=>({...c,enabled:e.target.checked}))}/><span className="toggle-slider"></span></label></div>
      </div>
      <div className="connection-actions">
        <button className="btn-secondary" onClick={testConn} disabled={testing}>{testing?"⏳ Testing…":"🔌 Test Connection"}</button>
        <button className="btn-primary" onClick={doExport} disabled={exporting||!sheetsConfig.enabled}>{exporting?"⏳ Exporting…":"📤 Export All"}</button>
      </div>
      {testStatus&&<div className={`sheets-status ${testStatus.ok?"ok":"error"}`}>{testStatus.ok?"✅":"❌"} {testStatus.msg}</div>}
      {exportStatus&&<div className={`sheets-status ${exportStatus.ok?"ok":"error"}`}>{exportStatus.ok?"✅":"❌"} {exportStatus.msg}</div>}
    </div>
    {leads.length>0&&<div className="card"><h3>👥 Lead Preview</h3>
      <div className="leads-preview-table">
        <div className="leads-table-header"><span>Business</span><span>Contact</span><span>Source</span><span>Email</span><span>Verified</span></div>
        {leads.map((l,i)=><div key={i} className="leads-table-row">
          <span><strong>{l.name}</strong></span><span>{l.contact}</span><span>{l.platform||"Direct"}</span>
          <span className="email-cell">{l.email||"—"}</span><span>{l.verified?"✅":"❓"}</span>
        </div>)}
      </div>
    </div>}
  </div>);
}

// ── Toast System ──────────────────────────────────────────────────────────────
let _toastAdd = null;
export function showToast(msg, type = "success") { _toastAdd?.(msg, type); }

function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    _toastAdd = (msg, type) => {
      const id = Date.now() + Math.random();
      setToasts(t => [...t, { id, msg, type }]);
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3800);
    };
    return () => { _toastAdd = null; };
  }, []);
  if (!toasts.length) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast-item toast-item--${t.type}`}>
          <span className="toast-icon">{t.type === "success" ? "✅" : t.type === "error" ? "❌" : "ℹ️"}</span>
          <span className="toast-msg">{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ── Mobile Nav ────────────────────────────────────────────────────────────────
function MobileNav({ tabs, activeTab, onTabChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const currentTab = tabs[activeTab] || tabs[0];
  return (
    <div className="mobile-nav" ref={ref}>
      <button className="mobile-nav-toggle" onClick={() => setOpen(o => !o)}>
        <span className="mobile-nav-current">{currentTab}</span>
        <span className="mobile-nav-arrow">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mobile-nav-menu">
          {tabs.map((t, i) => (
            <button
              key={i}
              className={`mobile-nav-item ${activeTab === i ? "active" : ""}`}
              onClick={() => { onTabChange(i); setOpen(false); }}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App(){
  // ── Auth & Subscription state ──────────────────────────────────────────────
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession]         = useState(null);
  const [user, setUser]               = useState(null);
  const [profile, setProfile]         = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [showPricing, setShowPricing] = useState(false);
  const [showManageSub, setShowManageSub] = useState(false);
  const [showProfile, setShowProfile]     = useState(false);
  const [dbReady, setDbReady]         = useState(null); // null=checking, true=ready, false=needs setup
  const SUPABASE_URL = "https://ifdqoizimmoirkotbjmd.supabase.co";

  // ── App state ──────────────────────────────────────────────────────────────
  const [tab,setTab]=useState(0);
  const [apiKey,setApiKey]=useState(()=>sessionStorage.getItem("cf_key")||"");
  const [config,setConfig]=useState(()=>{try{return JSON.parse(localStorage.getItem("cf_config")||"null")||DEFAULT_CONFIG;}catch{return DEFAULT_CONFIG;}});
  const [sheetsConfig,setSheetsConfig]=useState(()=>{try{return JSON.parse(localStorage.getItem("cf_sheets")||"null")||DEFAULT_SHEETS;}catch{return DEFAULT_SHEETS;}});
  const [apiKeys,setApiKeys]=useState(()=>{try{return JSON.parse(sessionStorage.getItem("cf_apikeys")||"null")||DEFAULT_API_KEYS;}catch{return DEFAULT_API_KEYS;}});
  const [stages,setStages]=useState({});
  const [logs,setLogs]=useState([]);
  const [running,setRunning]=useState(false);
  const [gmailState,setGmailState]=useState({token:null,profile:null,connected:false});

  // ── Supabase auth listener ─────────────────────────────────────────────────
  useEffect(()=>{
    // Check existing session
    supabase.auth.getSession().then(async({data:{session:s}})=>{
      if(s){ setSession(s); setUser(s.user); await loadUserData(s.user); }
      setAuthLoading(false);
    });
    // Listen for auth changes
    const{data:{subscription:authSub}}=supabase.auth.onAuthStateChange(async(_event,s)=>{
      setSession(s); setUser(s?.user||null);
      if(s?.user){ await loadUserData(s.user); }
      else{ setProfile(null); setSubscription(null); }
    });
    // Handle Stripe redirect back (?payment=success&plan=monthly)
    const params=new URLSearchParams(window.location.search);
    if(params.get("payment")==="success"){
      const plan=params.get("plan");
      const userId=params.get("user");
      if(plan&&userId){
        import("./supabase").then(({createSubscription})=>{
          createSubscription(userId,plan).then(sub=>{ setSubscription(sub); setShowPricing(false); });
        });
      }
      window.history.replaceState({},"",window.location.pathname);
    }
    // DB check removed — schema assumed ready, SetupWizard removed
    return()=>authSub.unsubscribe();
  },[]);

  async function checkDbReady() {
    try {
      // Try reading profiles table — if 403 with "Host not in allowlist" = tables need creating
      // If 200 or 401 (auth needed) = tables exist
      const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id&limit=0`, {
        headers: {
          "apikey": "sb_publishable_TKYDxVxzOQPURfghs6_AXA_kHSqTyzD",
          "Authorization": "Bearer sb_publishable_TKYDxVxzOQPURfghs6_AXA_kHSqTyzD"
        }
      });
      // 200 = table exists and accessible
      // 401 = table exists but need auth (still means DB is set up)  
      // 406 = table exists (Not Acceptable, still table exists)
      // 404 or specific errors = table missing
      const body = await res.text();
      const needsSetup = res.status === 404 || 
        (res.status === 400 && body.includes("does not exist")) ||
        body.includes("relation") && body.includes("does not exist");
      setDbReady(!needsSetup);
    } catch {
      setDbReady(true); // assume ready on network error, don't block app
    }
  }

  async function loadUserData(u){
    if (u?.id === "demo") {
      // Demo mode - skip Supabase
      setProfile({ id:"demo", full_name:"Demo User", role:"user" });
      setSubscription({ plan:"lifetime", status:"active", expires_at:null });
      return;
    }
    try{
      const[prof,sub]=await Promise.all([getProfile(u.id),getSubscription(u.id)]);
      setProfile(prof);
      setSubscription(sub);
      if(prof?.full_name&&!config.yourName){ setConfig(c=>({...c,yourName:prof.full_name})); }
    }catch(e){ console.warn("loadUserData error:",e.message); }
  }

  async function handleSignOut(){
    if (user?.id !== "demo") await signOut();
    setSession(null); setUser(null); setProfile(null); setSubscription(null);
  }

  function handleAuth(newSession, newUser){
    setSession(newSession); setUser(newUser);
    if(newUser) loadUserData(newUser);
  }

  const isActive = isSubscriptionActive(subscription);
  const isSuperAdmin = profile?.role === "superadmin" || profile?.role === "admin";
  const isDemoMode                        = user?.id === "demo";

  // ── Dark Mode ───────────────────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("cf_dark") === "1");
  useEffect(() => {
    localStorage.setItem("cf_dark", darkMode ? "1" : "0");
    document.body.classList.toggle("cf-dark", darkMode);
  }, [darkMode]);

  // ── Global Search ────────────────────────────────────────────────────────────
  const [showSearch, setShowSearch]       = useState(false);
  const [searchQuery, setSearchQuery]     = useState("");
  const [searchResults, setSearchResults] = useState([]);
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const q = searchQuery.toLowerCase();
    const allLeads = Array.isArray(stages?.leads?.result) ? stages.leads.result : [];
    const results = allLeads
      .filter(l => (l.name + " " + (l.email||"") + " " + (l.contact||"")).toLowerCase().includes(q))
      .slice(0, 8)
      .map(l => ({ icon:"👤", title: l.name, sub: l.email||l.contact||"", action: () => { setTab(5); setShowSearch(false); setSearchQuery(""); } }));
    setSearchResults(results);
  }, [searchQuery, stages]);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setShowSearch(s => !s); }
      if (e.key === "Escape") { setShowSearch(false); setSearchQuery(""); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── CSV Export ───────────────────────────────────────────────────────────────
  function exportLeadsCSV() {
    const leads = Array.isArray(stages?.leads?.result) ? stages.leads.result : [];
    if (!leads.length) { alert("No leads to export. Run the workflow first."); return; }
    const headers = ["Name","Contact","Email","Website","Phone","Platform","Pain Point","Size","Verified"];
    const rows    = [headers, ...leads.map(l => [l.name||"",l.contact||"",l.email||"",l.website||"",l.phone||"",l.platform||"",l.pain_point||"",l.size||"",l.verified?"Yes":"No"])];
    const csv     = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href     = URL.createObjectURL(new Blob([csv], { type:"text/csv" }));
    a.download = `leads-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    alert(`✅ ${leads.length} leads exported as CSV!`);
  }

  // ── Supabase Leads Sync ──────────────────────────────────────────────────────
  async function syncLeadsToSupabase() {
    const leads = Array.isArray(stages?.leads?.result) ? stages.leads.result : [];
    if (!leads.length) { alert("No leads to sync. Run the workflow first."); return; }
    if (!user || user.id === "demo") { alert("Please sign in to sync leads."); return; }
    try {
      const rows = leads.map(l => ({
        user_id: user.id, name: l.name||"", contact: l.contact||"",
        email: l.email||"", website: l.website||"", phone: l.phone||"",
        platform: l.platform||"Direct", pain_point: l.pain_point||"",
        size: l.size||"", verified: !!l.verified, status: "New",
        updated_at: new Date().toISOString()
      }));
      const { error } = await supabase.from("leads").upsert(rows, { onConflict:"user_id,email" });
      if (error) throw error;
      alert(`✅ ${leads.length} leads synced to Supabase!`);
    } catch(e) { alert("Sync failed: " + e.message); }
  }

  useEffect(()=>{if(apiKey)sessionStorage.setItem("cf_key",apiKey);},[apiKey]);
  useEffect(()=>{localStorage.setItem("cf_config",JSON.stringify(config));},[config]);
  useEffect(()=>{localStorage.setItem("cf_sheets",JSON.stringify({...sheetsConfig,apiKey:""}));},[sheetsConfig]);
  useEffect(()=>{sessionStorage.setItem("cf_apikeys",JSON.stringify(apiKeys));},[apiKeys]);

  // Load Google Identity Services script
  useEffect(()=>{
    if(document.getElementById("google-gsi")) return;
    const s=document.createElement("script");
    s.id="google-gsi";s.src="https://accounts.google.com/gsi/client";s.async=true;s.defer=true;
    document.head.appendChild(s);
  },[]);

  function handleLeadsFound(leads){
    setStages(s=>({...s,leads:{status:"done",result:leads}}));
    setTab(3);
  }

    // ── Auth & DB Guards ────────────────────────────────────────────────────────

  // Loading state
  if(authLoading) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",
      minHeight:"100vh",background:"#f0f2f5",fontFamily:"sans-serif"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:16}}>⚡</div>
        <div style={{fontSize:18,fontWeight:700,color:"#1e293b"}}>ClientFlow AI</div>
        <div style={{fontSize:13,color:"#64748b",marginTop:8}}>Loading…</div>
      </div>
    </div>
  );

  // Not logged in → show landing page + auth
  if(!session) return <AuthPage onAuth={handleAuth}/>;

  // Pricing page
  if(showPricing) return(
    <PricingPage user={user} subscription={subscription}
      onSubscribed={sub=>{setSubscription(sub);setShowPricing(false);}}
      onSkip={()=>setShowPricing(false)}/>
  );

  return(<div className="app">
    <ToastContainer/>
    {showProfile&&<UserProfile
      user={user} profile={profile} subscription={subscription}
      onClose={()=>setShowProfile(false)}
      onProfileUpdate={p=>{setProfile(p);setShowProfile(false);}}
      onUpgrade={()=>{setShowProfile(false);setShowPricing(true);}}
    />}
    <header className="header">
      <div className="header-top">
        <div className="logo">
          <span className="logo-icon">⚡</span>
          <div>
            <div className="logo-name">ClientFlow AI</div>
            <div className="logo-sub">Real Leads → Research → Email → Follow Up → Meeting → Proposal</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",marginLeft:"auto"}}>
          {/* Global Search Overlay */}
          {showSearch&&(
            <div className="gsearch-overlay" onClick={()=>{setShowSearch(false);setSearchQuery("");}}>
              <div className="gsearch-box" onClick={e=>e.stopPropagation()}>
                <div className="gsearch-row">
                  <span className="gsearch-icon-prefix">🔍</span>
                  <input autoFocus className="gsearch-inp"
                    placeholder="Search leads by name or email…"
                    value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                    onKeyDown={e=>{ if(e.key==="Escape"){setShowSearch(false);setSearchQuery("");} }}/>
                  {searchQuery&&<button className="gsearch-clear" onClick={()=>setSearchQuery("")}>✕</button>}
                </div>
                {searchResults.length>0&&(
                  <div className="gsearch-results">
                    {searchResults.map((r,i)=>(
                      <div key={i} className="gsearch-item" onClick={r.action}>
                        <span className="gsearch-item-icon">{r.icon}</span>
                        <div><div className="gsearch-item-title">{r.title}</div><div className="gsearch-item-sub">{r.sub}</div></div>
                        <span className="gsearch-item-type">Lead →</span>
                      </div>
                    ))}
                  </div>
                )}
                {searchQuery&&!searchResults.length&&<div className="gsearch-empty">No results for "<b>{searchQuery}</b>"</div>}
                <div className="gsearch-footer">Ctrl+K to toggle · Esc to close · searches leads</div>
              </div>
            </div>
          )}
          {/* Toolbar */}
          <button className="hdr-tool-btn" title="Search leads (Ctrl+K)" onClick={()=>setShowSearch(s=>!s)}>🔍</button>
          <button className="hdr-tool-btn" title="Export leads CSV" onClick={exportLeadsCSV}>📥</button>
          <button className="hdr-tool-btn" title="Sync leads to Supabase" onClick={syncLeadsToSupabase}>☁️</button>
          <button className="hdr-tool-btn" title="Toggle dark mode" onClick={()=>setDarkMode(d=>!d)}>{darkMode?"☀️":"🌙"}</button>
          {gmailState.connected&&<div className="gmail-header-badge">📧 {gmailState.profile?.emailAddress}</div>}
          {sheetsConfig.enabled&&<div className="sheets-badge">📊 Sheets</div>}
          {/* Subscription badge */}
          {isActive?(
            <button className="sub-active-badge" style={{background:getPlanColor(subscription.plan)+"22",color:getPlanColor(subscription.plan),borderColor:getPlanColor(subscription.plan)+"44",border:"1.5px solid",borderRadius:20,padding:"4px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}
              onClick={()=>setShowProfile(true)}>
              ⚡ {getPlanLabel(subscription.plan)}
            </button>
          ):(
            <button className="sub-upgrade-btn" onClick={()=>setShowPricing(true)}>
              🚀 Upgrade $1/mo
            </button>
          )}
          {/* User avatar → opens profile */}
          <button className="header-user-btn" onClick={()=>setShowProfile(true)} title="Edit Profile">
            <div className="user-avatar">{(profile?.full_name||user?.user_metadata?.full_name||user?.email||"?")[0].toUpperCase()}</div>
            <div className="user-info">
              <div className="user-name">{profile?.full_name||user?.user_metadata?.full_name||user?.email?.split("@")[0]}</div>
              <span className="user-signout" onClick={e=>{e.stopPropagation();handleSignOut();}}>Sign out</span>
            </div>
          </button>
        </div>
      </div>
      <ApiKeyBanner apiKey={apiKey} setApiKey={setApiKey}/>
      {/* Desktop tabs */}
      <nav className="tabs desktop-tabs">
        {TABS.filter((_,i)=>!(i===11&&!isSuperAdmin)).map((t,i)=>{
          const realI = (i===11&&isSuperAdmin) ? 11 : i;
          return <button key={i} className={`tab ${tab===i?"active":""}`} onClick={()=>setTab(i)}>{t}</button>;
        })}
      </nav>
      {/* Mobile dropdown nav */}
      <MobileNav tabs={TABS.filter((_,i)=>!(i===11&&!isSuperAdmin))} activeTab={tab} onTabChange={setTab}/>
    </header>
    <main className="main">
      {tab===0&&<SetupTab config={config} setConfig={setConfig} sheetsConfig={sheetsConfig} setSheetsConfig={setSheetsConfig} apiKeys={apiKeys} setApiKeys={setApiKeys}/>}
      {tab===1&&<RealLeadFinderTab config={config} apiKey={apiKey} apiKeys={apiKeys} sheetsConfig={sheetsConfig} onLeadsFound={handleLeadsFound}/>}
      {tab===2&&<SocialLeadFinderTab config={config} apiKey={apiKey} onLeadsFound={handleLeadsFound}/>}
      {tab===3&&<WorkflowTab config={config} apiKey={apiKey} sheetsConfig={sheetsConfig} stages={stages} setStages={setStages} logs={logs} setLogs={setLogs} running={running} setRunning={setRunning}/>}
      {tab===4&&<EmailSenderTab config={config} apiKey={apiKey} stages={stages} sheetsConfig={sheetsConfig} gmailState={gmailState} setGmailState={setGmailState}/>}
      {tab===5&&<PipelineTab apiKey={apiKey} config={config} stages={stages} sheetsConfig={sheetsConfig}/>}
      {tab===6&&<MeetingsTab config={config} stages={stages}/>}
      {tab===7&&<PortfolioTab apiKey={apiKey} config={config}/>}
      {tab===8&&<FreelanceTab apiKey={apiKey} config={config}/>}
      {tab===9&&<ProjectManagerTab config={config} apiKey={apiKey} stages={stages}/>}
      {tab===10&&<DataStoreTab sheetsConfig={sheetsConfig} setSheetsConfig={setSheetsConfig} stages={stages} config={config}/>}
      {tab===11&&isSuperAdmin&&<AdminPanel currentUser={user}/>}
      {tab===11&&!isSuperAdmin&&<div className="feature-gate"><div className="feature-gate-icon">🔒</div><h3>Admin Only</h3><p>You don't have permission to view this page.</p></div>}
    </main>
  </div>);
}

