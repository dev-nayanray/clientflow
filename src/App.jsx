import { useState, useRef, useEffect } from "react";
import {
  REAL_LEAD_SOURCES, hunterDomainSearch, hunterCompanySearch,
  apolloSearch, googlePlacesSearch, parseCSVLeads
} from "./RealLeadFinder";

// ── constants ─────────────────────────────────────────────────────────────────
const MODEL = "claude-sonnet-4-5";

const NICHES = [
  "E-commerce Stores","SaaS Companies","Real Estate Agencies","Law Firms",
  "Medical Clinics","Dental Offices","Gyms & Fitness Studios","Restaurants & Cafés",
  "Online Coaches & Consultants","Digital Marketing Agencies","Accounting & CPA Firms",
  "Insurance Agencies","Mortgage Brokers","Recruitment & HR Firms","IT & Tech Startups",
  "Photography Studios","Interior Design Firms","Construction Companies",
  "Logistics & Freight","Education & eLearning Platforms",
];
const SERVICES = [
  "Web Design & Development","SEO & Content Marketing","Social Media Management",
  "Google & Facebook Ads","Email Marketing Automation","Video Production & Editing",
  "Branding & Logo Design","Mobile App Development","CRM & Sales Automation",
  "Chatbot Development","Shopify / WooCommerce Setup","WordPress Development",
  "Lead Generation Systems","Business Process Automation","Data Analytics & Reporting",
  "Virtual Assistant Services","Copywriting & Content Creation","LinkedIn Outreach",
  "Podcast Production","E-learning Course Creation",
];
const COUNTRIES = [
  { name:"United States",code:"US",flag:"🇺🇸",tier:"premium" },
  { name:"United Kingdom",code:"GB",flag:"🇬🇧",tier:"premium" },
  { name:"Canada",code:"CA",flag:"🇨🇦",tier:"premium" },
  { name:"Australia",code:"AU",flag:"🇦🇺",tier:"premium" },
  { name:"Germany",code:"DE",flag:"🇩🇪",tier:"premium" },
  { name:"Netherlands",code:"NL",flag:"🇳🇱",tier:"premium" },
  { name:"Singapore",code:"SG",flag:"🇸🇬",tier:"premium" },
  { name:"UAE",code:"AE",flag:"🇦🇪",tier:"premium" },
  { name:"New Zealand",code:"NZ",flag:"🇳🇿",tier:"premium" },
  { name:"Switzerland",code:"CH",flag:"🇨🇭",tier:"premium" },
  { name:"India",code:"IN",flag:"🇮🇳",tier:"growth" },
  { name:"Bangladesh",code:"BD",flag:"🇧🇩",tier:"growth" },
  { name:"Pakistan",code:"PK",flag:"🇵🇰",tier:"growth" },
  { name:"Philippines",code:"PH",flag:"🇵🇭",tier:"growth" },
  { name:"Vietnam",code:"VN",flag:"🇻🇳",tier:"growth" },
  { name:"Indonesia",code:"ID",flag:"🇮🇩",tier:"growth" },
  { name:"Malaysia",code:"MY",flag:"🇲🇾",tier:"growth" },
  { name:"Nigeria",code:"NG",flag:"🇳🇬",tier:"growth" },
  { name:"Kenya",code:"KE",flag:"🇰🇪",tier:"growth" },
  { name:"South Africa",code:"ZA",flag:"🇿🇦",tier:"growth" },
  { name:"Brazil",code:"BR",flag:"🇧🇷",tier:"growth" },
  { name:"Mexico",code:"MX",flag:"🇲🇽",tier:"growth" },
  { name:"Colombia",code:"CO",flag:"🇨🇴",tier:"growth" },
  { name:"France",code:"FR",flag:"🇫🇷",tier:"premium" },
  { name:"Spain",code:"ES",flag:"🇪🇸",tier:"premium" },
  { name:"Italy",code:"IT",flag:"🇮🇹",tier:"premium" },
  { name:"Japan",code:"JP",flag:"🇯🇵",tier:"premium" },
  { name:"South Korea",code:"KR",flag:"🇰🇷",tier:"premium" },
  { name:"Sweden",code:"SE",flag:"🇸🇪",tier:"premium" },
  { name:"Denmark",code:"DK",flag:"🇩🇰",tier:"premium" },
];
const NICHE_COUNTRY_REC = {
  "E-commerce Stores":["US","GB","CA","AU","IN"],
  "SaaS Companies":["US","GB","CA","DE","SG"],
  "Real Estate Agencies":["US","GB","AU","AE","CA"],
  "Law Firms":["US","GB","CA","AU","SG"],
  "Medical Clinics":["US","GB","AU","CA","AE"],
  "Dental Offices":["US","CA","AU","GB","AE"],
  "Gyms & Fitness Studios":["US","GB","CA","AU","IN"],
  "Restaurants & Cafés":["US","GB","AU","CA","SG"],
  "Online Coaches & Consultants":["US","GB","CA","AU","IN"],
  "Digital Marketing Agencies":["US","IN","GB","PH","BD"],
  "IT & Tech Startups":["US","IN","GB","SG","DE"],
};
function getRecCountries(niche){
  const codes=(NICHE_COUNTRY_REC[niche]||["US","GB","CA","AU","IN"]);
  return codes.map(c=>COUNTRIES.find(co=>co.code===c)).filter(Boolean);
}

const SOCIAL_PLATFORMS = [
  { key:"linkedin",name:"LinkedIn",icon:"💼",color:"#0077B5",bgColor:"#E8F4FD",
    description:"Best for B2B — decision makers, CEOs, founders",
    searchUrl:(n,c)=>`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(n+" "+c)}&origin=GLOBAL_SEARCH_HEADER`,
    companyUrl:(n,c)=>`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(n+" "+c)}`,
    searchTips:["Search: \"[Niche] [Country]\" in People tab","Filter: 2nd degree connections","Filter: Company size 11–200 for SMBs","Sort: Most recent activity"],
    outreachTips:["Connect with a personalized note (300 chars)","Message after connection accepted","Engage with posts before pitching","Use Sales Navigator for filters"],
  },
  { key:"instagram",name:"Instagram",icon:"📸",color:"#E1306C",bgColor:"#FDF0F5",
    description:"Great for visual businesses — restaurants, fitness, real estate",
    searchUrl:(n)=>`https://www.instagram.com/explore/tags/${encodeURIComponent(n.toLowerCase().replace(/\s+/g,""))}`,
    searchTips:["Search hashtags: #[niche] #[city]business","Accounts 500–50K followers (sweet spot)","Check 'similar accounts' on competitors","Use location tags"],
    outreachTips:["DM after liking/commenting 2–3 posts","Mention specific content from their profile","Use voice DM for higher open rates","Check bio for email first"],
  },
  { key:"x",name:"X (Twitter)",icon:"𝕏",color:"#14171A",bgColor:"#F5F8FA",
    description:"Ideal for SaaS, tech, coaches — founders are very active",
    searchUrl:(n,c)=>`https://twitter.com/search?q=${encodeURIComponent(n+" "+c+" founder")}&f=user`,
    searchTips:["Search: \"[Niche] founder\" or \"[Niche] CEO\"","Advanced Search: min_faves:10 for active users","Check who replies to industry influencers","Search: 'looking for [service]' for warm leads"],
    outreachTips:["Reply to tweets with value first","Retweet with meaningful comment","DM after 2–3 genuine interactions","Reference a specific tweet in your DM"],
  },
];

// ── helpers ───────────────────────────────────────────────────────────────────
async function callClaude(apiKey, systemPrompt, userPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{ "Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true" },
    body:JSON.stringify({ model:MODEL, max_tokens:1500, system:systemPrompt, messages:[{role:"user",content:userPrompt}] }),
  });
  if(!res.ok){ const e=await res.json().catch(()=>({})); throw new Error(e?.error?.message||`HTTP ${res.status}`); }
  const data=await res.json();
  return data.content.map(b=>b.text||"").join("");
}
function parseJSON(raw){ try{ return JSON.parse(raw.replace(/```json|```/g,"").trim()); }catch{ return null; } }
function buildCalendarLink({title,description,startISO,durationMins=60,location=""}){
  const fmt=d=>d.toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
  const start=new Date(startISO);const end=new Date(start.getTime()+durationMins*60000);
  return `https://calendar.google.com/calendar/render?${new URLSearchParams({action:"TEMPLATE",text:title,details:description,location,dates:`${fmt(start)}/${fmt(end)}`})}`;
}

// ── Google Sheets ─────────────────────────────────────────────────────────────
async function appendSheet(sc,rows,sheet="Leads"){
  if(!sc?.apiKey||!sc?.sheetId) throw new Error("Sheets credentials missing");
  const url=`https://sheets.googleapis.com/v4/spreadsheets/${sc.sheetId}/values/${encodeURIComponent(sheet+"!A1")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS&key=${sc.apiKey}`;
  const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({values:rows})});
  if(!res.ok){ const e=await res.json().catch(()=>({})); throw new Error(e?.error?.message||`Sheets ${res.status}`); }
  return res.json();
}
async function initHeaders(sc,sheet,headers){
  if(!sc?.apiKey||!sc?.sheetId) return;
  const r=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sc.sheetId}/values/${encodeURIComponent(sheet+"!A1")}?key=${sc.apiKey}`);
  if(!r.ok) return;
  const d=await r.json();
  if(d.values?.length>0) return;
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sc.sheetId}/values/${encodeURIComponent(sheet+"!A1")}?valueInputOption=USER_ENTERED&key=${sc.apiKey}`,
    {method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({values:[headers]})});
}
async function exportLeads(sc,leads,cfg){
  const h=["Timestamp","Business Name","Contact","Title","Email","Website","Phone","Size","Pain Point","Source","Niche","Service","Country","Verified"];
  await initHeaders(sc,"Leads",h);
  const ts=new Date().toLocaleString();
  await appendSheet(sc,leads.map(l=>[ts,l.name||"",l.contact||"",l.title||"",l.email||"",l.website||"",l.phone||"",l.size||"",l.pain_point||"",l.platform||"",cfg.niche||"",cfg.service||"",cfg.country||"",l.verified?"✅":"❓"]),"Leads");
}
async function exportWorkflow(sc,stages,cfg){
  const h=["Timestamp","Niche","Service","Country","Company","Stage","Status","Content Preview"];
  await initHeaders(sc,"Workflows",h);
  const ts=new Date().toLocaleString();
  const labels={leads:"Lead Research",email:"Outreach Email",followup:"Follow Up",proposal:"Proposal",meeting:"Meeting"};
  const rows=Object.entries(stages).filter(([,v])=>v?.status==="done").map(([k,v])=>{
    const content=Array.isArray(v.result)?`${v.result.length} leads`:(v.result||"").substring(0,200);
    return [ts,cfg.niche,cfg.service,cfg.country,cfg.companyName||cfg.yourName,labels[k]||k,"Completed",content];
  });
  if(rows.length>0) await appendSheet(sc,rows,"Workflows");
}
async function exportAction(sc,lead,type,content,cfg){
  const h=["Timestamp","Business Name","Contact","Email","Source","Action","Niche","Service","Country","Content"];
  await initHeaders(sc,"Actions",h);
  await appendSheet(sc,[[new Date().toLocaleString(),lead.name,lead.contact,lead.email,lead.platform||"",type,cfg.niche,cfg.service,cfg.country,content.substring(0,300)]],"Actions");
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS=["⚙️ Setup","📥 Real Leads","🔍 Social Find","🚀 Workflow","👥 Pipeline","📅 Meetings","📊 Data Store"];
const DEFAULT_CONFIG={ niche:"E-commerce Stores",service:"Web Design & Development",country:"United States",price:"$500 – $2,000",calendlyLink:"",yourName:"",yourEmail:"",companyName:"" };
const DEFAULT_SHEETS={ apiKey:"",sheetId:"",enabled:false };
const DEFAULT_API_KEYS={ hunter:"",apollo:"",places:"" };
const STAGE_KEYS=["leads","email","followup","proposal","meeting"];
const STAGE_META=[
  {key:"leads",icon:"🔍",label:"Lead Research"},
  {key:"email",icon:"✉️",label:"Outreach Email"},
  {key:"followup",icon:"🔁",label:"Follow Up"},
  {key:"proposal",icon:"📄",label:"Proposal"},
  {key:"meeting",icon:"📅",label:"Meeting"},
];

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
      {open&&(<div className="dropdown-menu">
        <div className="dropdown-search-wrap"><input autoFocus className="dropdown-search" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <div className="dropdown-list">
          {filtered.length===0&&<div className="dropdown-empty">No results</div>}
          {filtered.map((opt,i)=>{const v=typeof opt==="string"?opt:opt.name;return(
            <div key={i} className={`dropdown-item ${value===v?"selected":""}`} onClick={()=>{onChange(v);setOpen(false);}}>
              {renderOption?renderOption(opt):opt}{value===v&&<span className="dropdown-check">✓</span>}
            </div>);})}
        </div>
      </div>)}
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
    <span className="api-label">🔑 Anthropic API Key</span>
    {apiKey&&<span className="api-ok">✓ Saved</span>}
    <div className="api-row">
      <input className="api-input" type={show?"text":"password"} placeholder="sk-ant-…" value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&save()}/>
      <button className="btn-ghost" onClick={()=>setShow(!show)}>{show?"🙈":"👁"}</button>
      <button className="btn-primary" onClick={save}>{saved?"✓ Saved!":"Save"}</button>
    </div>
  </div>);
}

// ── Setup Tab ─────────────────────────────────────────────────────────────────
function SetupTab({config,setConfig,sheetsConfig,setSheetsConfig,apiKeys,setApiKeys}){
  const f=(key,label,ph,type="text")=>(<div className="field"><label>{label}</label>
    <input type={type} placeholder={ph} value={config[key]} onChange={e=>setConfig(c=>({...c,[key]:e.target.value}))}/></div>);
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

      {/* Real API Keys */}
      <div className="card api-keys-card">
        <h3>🔑 Real Lead Source API Keys</h3>
        <p className="hint" style={{marginTop:0,marginBottom:12}}>Add these to find <strong>real verified contacts</strong> instead of fake AI data.</p>
        <div className="field">
          <label>🎯 Hunter.io API Key <a href="https://hunter.io/api-keys" target="_blank" rel="noreferrer" className="get-key-link">Get free key →</a></label>
          <input type="password" placeholder="hunter_xxxxxxxxxxxx" value={apiKeys.hunter} onChange={e=>setApiKeys(k=>({...k,hunter:e.target.value}))}/>
          <span className="field-hint">50 free searches/month • Finds real emails by domain or company name</span>
        </div>
        <div className="field">
          <label>🚀 Apollo.io API Key <a href="https://developer.apollo.io" target="_blank" rel="noreferrer" className="get-key-link">Get free key →</a></label>
          <input type="password" placeholder="apollo_xxxxxxxxxxxx" value={apiKeys.apollo} onChange={e=>setApiKeys(k=>({...k,apollo:e.target.value}))}/>
          <span className="field-hint">Free plan: 50 contacts/month • 275M+ real contacts database</span>
        </div>
        <div className="field">
          <label>📍 Google Places API Key <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="get-key-link">Get key →</a></label>
          <input type="password" placeholder="AIzaSy…" value={apiKeys.places} onChange={e=>setApiKeys(k=>({...k,places:e.target.value}))}/>
          <span className="field-hint">Find local businesses: restaurants, gyms, clinics with contact info</span>
        </div>
        <div className="api-keys-status">
          {["hunter","apollo","places"].map(k=>(
            <div key={k} className={`api-key-badge ${apiKeys[k]?"active":""}`}>
              {apiKeys[k]?"✅":"⬜"} {k.charAt(0).toUpperCase()+k.slice(1)}
            </div>
          ))}
        </div>
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
        <div className="field"><label>🔑 Sheets API Key</label>
          <input type="password" placeholder="AIzaSy…" value={sheetsConfig.apiKey} onChange={e=>setSheetsConfig(c=>({...c,apiKey:e.target.value}))}/>
        </div>
        <div className="field"><label>📋 Spreadsheet ID</label>
          <input type="text" placeholder="1BxiMVs0XRA…" value={sheetsConfig.sheetId} onChange={e=>setSheetsConfig(c=>({...c,sheetId:e.target.value}))}/>
        </div>
      </div>}
    </div>
  </div>);
}

// ── REAL LEAD FINDER TAB ──────────────────────────────────────────────────────
function RealLeadFinderTab({config,apiKey,apiKeys,sheetsConfig,onLeadsFound}){
  const [source,setSource]=useState("csv");
  const [loading,setLoading]=useState(false);
  const [results,setResults]=useState([]);
  const [error,setError]=useState("");
  const [enriching,setEnriching]=useState(false);
  const [enriched,setEnriched]=useState({});

  // CSV state
  const [csvText,setCsvText]=useState("");

  // Hunter state
  const [hunterMode,setHunterMode]=useState("domain");
  const [hunterInput,setHunterInput]=useState("");

  // Apollo state
  const [apolloTitle,setApolloTitle]=useState("owner,founder,ceo,director");
  const [apolloPage,setApolloPage]=useState(1);

  // Places state
  const [placesLocation,setPlacesLocation]=useState("");
  const [placesKeyword,setPlacesKeyword]=useState("");

  async function find(){
    setLoading(true);setError("");setResults([]);setEnriched({});
    try{
      let leads=[];
      if(source==="csv"){
        leads=parseCSVLeads(csvText);
        if(leads.length===0) throw new Error("No leads found. Check your CSV format — need at least Name, Email columns.");
      }
      else if(source==="hunter"){
        if(!apiKeys.hunter) throw new Error("Hunter.io API key required. Add it in ⚙️ Setup.");
        if(!hunterInput.trim()) throw new Error("Enter a domain (e.g. shopify.com) or company name.");
        if(hunterMode==="domain") leads=await hunterDomainSearch(apiKeys.hunter,hunterInput.trim());
        else leads=await hunterCompanySearch(apiKeys.hunter,hunterInput.trim());
        if(leads.length===0) throw new Error("No emails found for this domain/company. Try a different one.");
      }
      else if(source==="apollo"){
        if(!apiKeys.apollo) throw new Error("Apollo.io API key required. Add it in ⚙️ Setup.");
        leads=await apolloSearch(apiKeys.apollo,{niche:config.niche,country:config.country,title:apolloTitle,page:apolloPage});
        if(leads.length===0) throw new Error("No results. Try broader niche or different country.");
      }
      else if(source==="places"){
        if(!apiKeys.places) throw new Error("Google Places API key required. Add it in ⚙️ Setup.");
        const loc=placesLocation||config.country;
        const kw=placesKeyword||config.niche;
        leads=await googlePlacesSearch(apiKeys.places,{keyword:kw,location:loc});
        if(leads.length===0) throw new Error("No places found. Try a more specific location (e.g. 'New York City').");
      }
      else if(source==="ai"){
        if(!apiKey) throw new Error("Anthropic API key required for AI demo leads.");
        const raw=await callClaude(apiKey,
          "You are a B2B lead research expert. Return ONLY valid JSON, no markdown.",
          `Generate 6 realistic ${config.niche} leads in ${config.country} needing ${config.service}.
Return JSON: [{"name":"Business Name","contact":"Owner Name","email":"email@domain.com","website":"https://...","pain_point":"specific problem","size":"small/medium","platform":"AI Demo","verified":false}]
IMPORTANT: Use realistic domains that match the business name. Do NOT use example.com.`
        );
        leads=parseJSON(raw)||[];
      }
      setResults(leads);
    }catch(e){ setError(e.message); }
    setLoading(false);
  }

  async function enrichLead(lead,idx){
    if(!apiKey){ alert("Anthropic API key required for AI enrichment."); return; }
    setEnriching(true);
    try{
      const text=await callClaude(apiKey,
        "You are a B2B sales researcher. Analyze a business and identify their pain points. Return ONLY valid JSON.",
        `Research this business and identify their top digital marketing/web pain point:
Business: ${lead.name}
Website: ${lead.website||"unknown"}
Industry: ${config.niche}
Country: ${config.country}
Contact title: ${lead.title||"unknown"}

Return JSON: {"pain_point":"specific pain point","best_service":"which of our services fits best","opening_line":"1 sentence ice-breaker for cold outreach","score":1-10 (how likely to need our service)}`
      );
      const data=parseJSON(text)||{};
      setEnriched(e=>({...e,[idx]:{...data,enriched:true}}));
      setResults(r=>r.map((l,i)=>i===idx?{...l,pain_point:data.pain_point||l.pain_point,opening_line:data.opening_line||"",score:data.score}:l));
    }catch(e){ console.warn("Enrich failed:",e.message); }
    setEnriching(false);
  }

  async function enrichAll(){
    if(!apiKey){ alert("Anthropic API key required."); return; }
    for(let i=0;i<results.length;i++){
      if(!enriched[i]) await enrichLead(results[i],i);
    }
  }

  function useLeads(){
    if(results.length===0) return;
    onLeadsFound(results);
  }

  const src=REAL_LEAD_SOURCES.find(s=>s.key===source);
  const realLeads=results.filter(l=>l.email&&l.email!=="");
  const verifiedLeads=results.filter(l=>l.verified);

  return(<div className="real-lead-wrap">
    <div className="real-lead-header">
      <h2>📥 Real Lead Finder</h2>
      <p className="sub">Find <strong>real verified contacts</strong> — not fake AI data. Import from Hunter.io, Apollo.io, Google Places, or paste your own CSV.</p>
    </div>

    {/* Source Selector */}
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

    {/* Source-specific inputs */}
    <div className="source-form card">
      {source==="csv"&&<div>
        <h3>📋 Paste CSV / Tab-Separated Data</h3>
        <p className="hint" style={{marginBottom:12}}>Paste from LinkedIn Sales Navigator export, Apollo export, or any spreadsheet. Headers auto-detected.<br/>
          <strong>Supported columns:</strong> Company, Contact, Email, Website, Phone, LinkedIn, Title, Size, Notes</p>
        <div className="csv-example">
          <div className="csv-example-title">📌 Example format:</div>
          <code>Company,Contact,Email,Website,Title{"\n"}Acme Corp,John Smith,john@acme.com,https://acme.com,CEO{"\n"}Tech Ltd,Jane Doe,jane@tech.com,https://tech.com,Founder</code>
        </div>
        <textarea className="csv-textarea" placeholder={"Paste your CSV or tab-separated data here…\n\nCompany,Contact,Email,Website\nAcme Corp,John Smith,john@acme.com,https://acme.com"} value={csvText} onChange={e=>setCsvText(e.target.value)} rows={8}/>
        <div className="form-actions">
          <button className="btn-primary" onClick={find} disabled={loading||!csvText.trim()}>{loading?"⏳ Parsing…":"📋 Import Leads"}</button>
          <span className="hint">Tip: Export from LinkedIn Sales Navigator → Download → paste here</span>
        </div>
      </div>}

      {source==="hunter"&&<div>
        <h3>🎯 Hunter.io — Find Real Emails</h3>
        {!apiKeys.hunter&&<div className="needs-key-banner">⚠️ Add your Hunter.io API key in <strong>⚙️ Setup</strong> first. <a href="https://hunter.io/api-keys" target="_blank" rel="noreferrer">Get free key →</a></div>}
        <div className="mode-toggle">
          <button className={`mode-btn ${hunterMode==="domain"?"active":""}`} onClick={()=>setHunterMode("domain")}>🌐 By Domain</button>
          <button className={`mode-btn ${hunterMode==="company"?"active":""}`} onClick={()=>setHunterMode("company")}>🏢 By Company Name</button>
        </div>
        <div className="field">
          <label>{hunterMode==="domain"?"Company Website Domain":"Company Name"}</label>
          <input type="text" placeholder={hunterMode==="domain"?"shopify.com":"Shopify Inc"} value={hunterInput} onChange={e=>setHunterInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&find()}/>
          <span className="field-hint">{hunterMode==="domain"?"Enter domain without https:// (e.g. nike.com)":"Enter the exact company name"}</span>
        </div>
        <div className="form-actions">
          <button className="btn-primary" onClick={find} disabled={loading||!apiKeys.hunter||!hunterInput.trim()}>{loading?"⏳ Searching…":"🎯 Find Emails"}</button>
        </div>
        <div className="hunter-tips">
          <div className="tip-item">✦ Best for: when you already know the company, just need the email</div>
          <div className="tip-item">✦ Find company domains from LinkedIn → Company Page → Website</div>
          <div className="tip-item">✦ 50 free searches/month on free plan</div>
        </div>
      </div>}

      {source==="apollo"&&<div>
        <h3>🚀 Apollo.io — Search 275M+ Real Contacts</h3>
        {!apiKeys.apollo&&<div className="needs-key-banner">⚠️ Add your Apollo.io API key in <strong>⚙️ Setup</strong> first. <a href="https://developer.apollo.io" target="_blank" rel="noreferrer">Get free key →</a></div>}
        <div className="apollo-fields">
          <div className="field">
            <label>🏢 Industry / Keywords</label>
            <input type="text" value={config.niche} readOnly style={{opacity:.7}} title="Set in Setup tab"/>
            <span className="field-hint">From your Setup config</span>
          </div>
          <div className="field">
            <label>👤 Job Titles (comma-separated)</label>
            <input type="text" value={apolloTitle} onChange={e=>setApolloTitle(e.target.value)} placeholder="owner,founder,ceo,director,manager"/>
          </div>
          <div className="field">
            <label>🌍 Country</label>
            <input type="text" value={config.country} readOnly style={{opacity:.7}}/>
          </div>
          <div className="field">
            <label>📄 Page</label>
            <input type="number" min="1" max="10" value={apolloPage} onChange={e=>setApolloPage(+e.target.value)}/>
            <span className="field-hint">10 results per page — increase to get more</span>
          </div>
        </div>
        <div className="form-actions">
          <button className="btn-primary" onClick={find} disabled={loading||!apiKeys.apollo}>{loading?"⏳ Searching…":"🚀 Search Apollo"}</button>
          <button className="btn-secondary" onClick={()=>{setApolloPage(p=>p+1);setTimeout(find,100);}} disabled={loading||!apiKeys.apollo||results.length===0}>Next Page →</button>
        </div>
        <div className="hunter-tips">
          <div className="tip-item">✦ Free plan: 50 contacts/month, 10 email exports/month</div>
          <div className="tip-item">✦ Emails shown as "email@apollo.io" on free — upgrade for real emails</div>
          <div className="tip-item">✦ Still gives you name, company, LinkedIn, title for manual outreach</div>
        </div>
      </div>}

      {source==="places"&&<div>
        <h3>📍 Google Places — Find Local Businesses</h3>
        {!apiKeys.places&&<div className="needs-key-banner">⚠️ Add your Google Places API key in <strong>⚙️ Setup</strong> first. <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer">Get key →</a></div>}
        <div className="apollo-fields">
          <div className="field">
            <label>🔍 Business Type / Keyword</label>
            <input type="text" value={placesKeyword||config.niche} onChange={e=>setPlacesKeyword(e.target.value)} placeholder="gym, restaurant, dental clinic…"/>
          </div>
          <div className="field">
            <label>📍 City / Location</label>
            <input type="text" value={placesLocation} onChange={e=>setPlacesLocation(e.target.value)} placeholder="New York City, London, Sydney…"/>
          </div>
        </div>
        <div className="form-actions">
          <button className="btn-primary" onClick={find} disabled={loading||!apiKeys.places||!placesLocation}>{loading?"⏳ Searching…":"📍 Find Local Businesses"}</button>
        </div>
        <div className="places-note">
          <strong>📌 Note:</strong> Google Places gives name, address, phone, rating. Email not included — use Hunter.io to find emails for these businesses after importing.
        </div>
      </div>}

      {source==="ai"&&<div>
        <h3>🤖 AI Demo Leads</h3>
        <div className="ai-demo-warning">
          ⚠️ <strong>These are NOT real people.</strong> Use only as a reference for what your target market looks like. For real outreach, use Hunter.io, Apollo, Places, or CSV import.
        </div>
        <p className="hint">Generates sample lead profiles for: <strong>{config.niche}</strong> in <strong>{config.country}</strong></p>
        <div className="form-actions">
          <button className="btn-primary" onClick={find} disabled={loading||!apiKey}>{loading?"⏳ Generating…":"🤖 Generate Demo Leads"}</button>
        </div>
      </div>}
    </div>

    {/* Error */}
    {error&&<div className="error-banner">❌ {error}</div>}

    {/* Results */}
    {results.length>0&&<div className="results-section">
      <div className="results-header">
        <div className="results-stats">
          <span className="stat-pill">{results.length} leads found</span>
          {realLeads.length>0&&<span className="stat-pill green">{realLeads.length} with email</span>}
          {verifiedLeads.length>0&&<span className="stat-pill blue">{verifiedLeads.length} verified ✅</span>}
        </div>
        <div className="results-actions">
          {apiKey&&<button className="btn-secondary" onClick={enrichAll} disabled={enriching}>{enriching?"⏳ Enriching…":"🤖 AI Enrich All (Pain Points)"}</button>}
          <button className="btn-success" onClick={useLeads}>🚀 Use in Workflow ({results.length})</button>
          {sheetsConfig.enabled&&<button className="btn-secondary" onClick={async()=>{try{await exportLeads(sheetsConfig,results,config);alert("✅ Leads exported to Google Sheets!");}catch(e){alert("❌ "+e.message);}}}>📊 Save to Sheets</button>}
        </div>
      </div>

      <div className="leads-grid">
        {results.map((lead,i)=>(
          <div key={i} className={`real-lead-card ${lead.verified?"verified":""}`}>
            <div className="rlc-header">
              <div>
                <strong className="rlc-name">{lead.name}</strong>
                {lead.title&&<div className="rlc-title">{lead.title}</div>}
              </div>
              <div className="rlc-badges">
                {lead.verified&&<span className="badge-verified">✅ Verified</span>}
                {lead.score&&<span className="badge-score">⭐ {lead.score}/10</span>}
                <span className="badge-source">{lead.platform}</span>
              </div>
            </div>
            <div className="rlc-contact">👤 {lead.contact}</div>
            {lead.email?<div className="rlc-email">📧 <a href={`mailto:${lead.email}`}>{lead.email}</a>{lead.confidence&&<span className="confidence">{lead.confidence}%</span>}</div>
              :<div className="rlc-email no-email">📧 No email yet — use Hunter.io to find</div>}
            {lead.website&&<div className="rlc-site">🌐 <a href={lead.website} target="_blank" rel="noreferrer">{lead.website}</a></div>}
            {lead.phone&&<div className="rlc-phone">📞 {lead.phone}</div>}
            {lead.linkedin&&<div className="rlc-li">💼 <a href={lead.linkedin} target="_blank" rel="noreferrer">LinkedIn</a></div>}
            {lead.address&&<div className="rlc-addr">📍 {lead.address}</div>}
            {lead.rating&&<div className="rlc-rating">⭐ {lead.rating} Google Rating</div>}
            <div className="rlc-pain">💡 {enriched[i]?.pain_point||lead.pain_point}</div>
            {lead.opening_line&&<div className="rlc-opener">🎯 {lead.opening_line}</div>}
            {!enriched[i]&&lead.website&&(
              <button className="btn-enrich" onClick={()=>enrichLead(lead,i)} disabled={enriching}>🤖 AI Enrich</button>
            )}
          </div>
        ))}
      </div>
    </div>}
  </div>);
}

// ── Social Lead Finder Tab ────────────────────────────────────────────────────
function SocialLeadFinderTab({config,apiKey,onLeadsFound}){
  const [activePlatform,setActivePlatform]=useState("linkedin");
  const [generatedLeads,setGeneratedLeads]=useState(null);
  const [generating,setGenerating]=useState(false);
  const [outreachScript,setOutreachScript]=useState(null);
  const [generatingScript,setGeneratingScript]=useState(false);
  const platform=SOCIAL_PLATFORMS.find(p=>p.key===activePlatform);

  async function generateLeads(){
    if(!apiKey){alert("Anthropic API key required.");return;}
    setGenerating(true);setGeneratedLeads(null);setOutreachScript(null);
    try{
      const raw=await callClaude(apiKey,
        "You are a B2B social media lead expert. Return ONLY valid JSON, no markdown.",
        `Generate 6 realistic ${config.niche} leads in ${config.country} found on ${platform.name} needing ${config.service}.
Return JSON: [{"name":"Business","contact":"Name","email":"real@domain.com","website":"https://...","pain_point":"specific problem","size":"small/medium","platform":"${platform.name}","platform_handle":"@handle","platform_activity":"what they post","best_approach":"opening line"}]
Use realistic emails matching the business domain. NOT example.com.`
      );
      setGeneratedLeads(parseJSON(raw)||[]);
    }catch(e){alert("Error: "+e.message);}
    setGenerating(false);
  }

  async function generateScript(){
    if(!apiKey||!generatedLeads) return;
    setGeneratingScript(true);setOutreachScript(null);
    try{
      const lead=generatedLeads[0];
      const text=await callClaude(apiKey,
        `You are an expert in ${platform.name} cold outreach for B2B services.`,
        `Write a ${platform.name} 4-message outreach sequence for ${config.yourName||"a service provider"} from ${config.companyName||config.service}.
Target: ${config.niche} in ${config.country}. Service: ${config.service}. Price: ${config.price}.
Example lead: ${lead.name} — Pain: ${lead.pain_point}.
Messages: 1) Connection/Follow request, 2) First message (value only), 3) Day 3-5 soft pitch, 4) Day 7-10 CTA.
${platform.key==="linkedin"?"LinkedIn format: professional":"Instagram/X format: casual, mention their content"}.
Label each message clearly.`
      );
      setOutreachScript(text);
    }catch(e){alert("Error: "+e.message);}
    setGeneratingScript(false);
  }

  return(<div className="real-lead-wrap">
    <div className="real-lead-header">
      <h2>🔍 Social Media Lead Finder</h2>
      <p className="sub">Find prospects on LinkedIn, Instagram & X — with platform-specific outreach scripts</p>
      <div className="workflow-target-badge">{COUNTRIES.find(c=>c.name===config.country)?.flag} {config.country} · {config.niche}</div>
    </div>
    <div className="platform-tabs">
      {SOCIAL_PLATFORMS.map(p=>(
        <button key={p.key} className={`platform-tab ${activePlatform===p.key?"active":""}`}
          style={activePlatform===p.key?{borderColor:p.color,background:p.bgColor,color:p.color}:{}}
          onClick={()=>{setActivePlatform(p.key);setGeneratedLeads(null);setOutreachScript(null);}}>
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
        {platform.companyUrl&&<a href={platform.companyUrl(config.niche,config.country)} target="_blank" rel="noreferrer" className="platform-link-btn-outline" style={{color:platform.color,borderColor:platform.color}}>🏢 Company Search</a>}
      </div>
    </div>
    <div className="card">
      <h3>🤖 AI Script Generator for {platform.name}</h3>
      <div className="ai-lead-actions">
        <button className="btn-primary" onClick={generateLeads} disabled={generating}>{generating?`⏳ Finding…`:`${platform.icon} Generate Sample Leads`}</button>
        {generatedLeads&&<button className="btn-secondary" onClick={generateScript} disabled={generatingScript}>{generatingScript?"⏳ Writing…":"✍️ Generate Outreach Script"}</button>}
        {generatedLeads&&<button className="btn-success" onClick={()=>onLeadsFound(generatedLeads)}>🚀 Use in Workflow</button>}
      </div>
      {generatedLeads&&<div className="generated-leads-list">
        {generatedLeads.map((l,i)=><div key={i} className="social-lead-card">
          <div className="social-lead-top"><div className="social-lead-identity">
            <div className="platform-avatar" style={{background:platform.bgColor,color:platform.color}}>{platform.icon}</div>
            <div><strong>{l.name}</strong><div className="social-lead-handle">{l.platform_handle}</div></div>
          </div><span className="tag">{l.size}</span></div>
          <div className="social-lead-details"><div>👤 {l.contact}</div><div>📧 {l.email}</div><div>🌐 {l.website}</div><div>📊 {l.platform_activity}</div></div>
          <div className="social-lead-pain">💡 {l.pain_point}</div>
          <div className="social-lead-approach"><span className="approach-label">Opening:</span> {l.best_approach}</div>
        </div>)}
      </div>}
      {outreachScript&&<div className="outreach-script-box">
        <div className="outreach-script-header">
          <h4>✉️ {platform.name} Outreach Sequence</h4>
          <button className="btn-ghost copy-btn" onClick={()=>navigator.clipboard.writeText(outreachScript)}>📋 Copy</button>
        </div>
        <pre className="result-pre">{outreachScript}</pre>
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
      log("📊 Saving to Google Sheets…");
      if(Array.isArray(s.leads?.result)&&s.leads.result.length>0) await exportLeads(sheetsConfig,s.leads.result,config);
      await exportWorkflow(sheetsConfig,s,config);
      log("✅ Saved to Sheets");setSheetsStatus({ok:true,msg:"Saved to Google Sheets!"});
    }catch(e){log("⚠️ Sheets error: "+e.message);setSheetsStatus({ok:false,msg:e.message});}
    setSheetsSaving(false);
  }

  async function runAll(){
    if(!apiKey){alert("Anthropic API key required.");return;}
    setRunning(true);setLogs([]);setSheetsStatus(null);
    const fresh={leads:{},email:{},followup:{},proposal:{},meeting:{}};
    let leads=null;

    // Step 1 — use preloaded or generate
    if(preloaded){
      log(`✅ Using ${preloaded.length} pre-loaded leads (${preloaded[0]?.platform||"imported"})`);
      leads=preloaded;fresh.leads={status:"done",result:leads};
      setStage("leads",{status:"done",result:leads});
    } else {
      try{
        setStage("leads",{status:"running"});
        log("🔍 Researching leads for "+config.niche+" in "+config.country);
        const raw=await callClaude(apiKey,"You are a B2B lead research expert. Return ONLY valid JSON.",
          `Generate 5 realistic ${config.niche} leads in ${config.country} needing ${config.service}. JSON: [{"name":"Biz","contact":"Name","email":"email@domain.com","website":"https://...","pain_point":"problem","size":"small","platform":"Direct","verified":false}]`);
        leads=parseJSON(raw)||[];
        setStage("leads",{status:"done",result:leads});fresh.leads={status:"done",result:leads};
        log(`✅ ${leads.length} leads found`);
      }catch(e){setStage("leads",{status:"error",result:e.message});log("❌ "+e.message);}
    }

    // Step 2 — Email
    try{
      setStage("email",{status:"running"});log("✉️ Drafting outreach email…");
      const lead=leads?.[0];
      const src=lead?.platform&&lead.platform!=="Direct"?`\nNote: Lead from ${lead.platform}.`:"";
      const text=await callClaude(apiKey,"You are an expert cold email copywriter.",
        `Write a cold email from ${config.yourName||"us"} at ${config.companyName||config.service} to ${lead?.contact||"owner"} at ${lead?.name||config.niche}.
Service: ${config.service}. Pain: ${lead?.pain_point||"scaling online"}. Price: ${config.price}. Max 150 words. Include subject line.${src}`);
      setStage("email",{status:"done",result:text});fresh.email={status:"done",result:text};
      log("✅ Email drafted");
    }catch(e){setStage("email",{status:"error",result:e.message});log("❌ "+e.message);}

    // Step 3 — Follow-up
    try{
      setStage("followup",{status:"running"});log("🔁 Building follow-up sequence…");
      const text=await callClaude(apiKey,"You are an email follow-up expert.",
        `Write a 3-email follow-up sequence for ${config.service} → ${config.niche} in ${config.country}.
Day 3 (value add), Day 7 (case study), Day 14 (soft close).
Sender: ${config.yourName||"us"} / ${config.companyName||config.service}. Price: ${config.price}. Label each clearly.`);
      setStage("followup",{status:"done",result:text});fresh.followup={status:"done",result:text};
      log("✅ Follow-up sequence ready");
    }catch(e){setStage("followup",{status:"error",result:e.message});log("❌ "+e.message);}

    // Step 4 — Proposal
    try{
      setStage("proposal",{status:"running"});log("📄 Generating proposal…");
      const text=await callClaude(apiKey,"You are a professional proposal writer.",
        `Create a ${config.service} proposal for a ${config.niche} client in ${config.country}.
Sections: Executive Summary, Problem, Solution, Deliverables + Timeline, Investment (${config.price}), Why Us, Next Steps.
Agency: ${config.companyName||config.yourName||"Our Agency"}.`);
      setStage("proposal",{status:"done",result:text});fresh.proposal={status:"done",result:text};
      log("✅ Proposal ready");
    }catch(e){setStage("proposal",{status:"error",result:e.message});log("❌ "+e.message);}

    // Step 5 — Meeting
    try{
      setStage("meeting",{status:"running"});log("📅 Writing meeting message…");
      const lead=leads?.[0];
      const text=await callClaude(apiKey,"You are a meeting scheduler expert.",
        `Write a meeting booking message to ${lead?.contact||"prospect"} at ${lead?.name||config.niche}.
Purpose: 30-min discovery call about ${config.service}.
${config.calendlyLink?`Booking link: ${config.calendlyLink}`:"Ask for availability."}
Sender: ${config.yourName||"us"} from ${config.companyName||config.service}.
Suggest: next Tuesday 10AM or Wednesday 2PM.`);
      const d=new Date();d.setDate(d.getDate()+7);d.setHours(10,0,0,0);
      const gcalLink=buildCalendarLink({
        title:`Discovery Call – ${config.companyName||config.service} × ${lead?.name||config.niche}`,
        description:`30-min call about ${config.service}.\nContact: ${lead?.contact||""}\nWebsite: ${lead?.website||""}`,
        startISO:d.toISOString(),durationMins:30,location:config.calendlyLink||"Google Meet",
      });
      setStage("meeting",{status:"done",result:text,gcalLink});fresh.meeting={status:"done",result:text,gcalLink};
      log("✅ Meeting message ready");
    }catch(e){setStage("meeting",{status:"error",result:e.message});log("❌ "+e.message);}

    log("🎉 Workflow complete! Click any stage to view.");
    setRunning(false);
    if(sheetsConfig.enabled) await saveToSheets(fresh);
  }

  return(<div className="workflow-wrap">
    {modal&&(<div className="modal-overlay" onClick={()=>setModal(null)}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h3>{STAGE_META.find(m=>m.key===modal)?.icon} {STAGE_META.find(m=>m.key===modal)?.label}</h3>
          <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
        </div>
        <div className="modal-body">
          {modal==="leads"&&Array.isArray(stages.leads?.result)?<LeadTable leads={stages.leads.result}/>
            :<pre className="result-pre">{typeof stages[modal]?.result==="string"?stages[modal].result:JSON.stringify(stages[modal]?.result,null,2)}</pre>}
          {modal==="meeting"&&stages.meeting?.gcalLink&&(
            <a className="btn-primary gcal-btn" href={stages.meeting.gcalLink} target="_blank" rel="noreferrer">📅 Add to Google Calendar</a>
          )}
        </div>
      </div>
    </div>)}

    <div className="workflow-header">
      <div>
        <h2>🚀 Full Workflow</h2>
        <p className="sub">Find Lead → Research Site → Draft Email → Follow Up → Proposal → Book Meeting</p>
        {config.country&&<div className="workflow-target-badge">{COUNTRIES.find(c=>c.name===config.country)?.flag} {config.country} · {config.niche}</div>}
        {preloaded&&<div className="preloaded-badge">✅ {preloaded.length} real leads loaded from {preloaded[0]?.platform||"import"} — ready to use</div>}
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
      {l.linkedin&&<div className="lead-detail">💼 <a href={l.linkedin} target="_blank" rel="noreferrer">LinkedIn</a></div>}
      <div className="lead-pain">💡 {l.pain_point}</div>
      {l.opening_line&&<div className="lead-approach">🎯 {l.opening_line}</div>}
    </div>
  ))}</div>);
}

// ── Pipeline Tab (was "Leads") ────────────────────────────────────────────────
const PIPELINE_STAGES=["New","Contacted","Replied","Meeting Booked","Proposal Sent","Won","Lost"];
const PIPELINE_COLORS={New:"#64748b",Contacted:"#3b82f6",Replied:"#f59e0b",
  "Meeting Booked":"#8b5cf6","Proposal Sent":"#ec4899",Won:"#22c55e",Lost:"#ef4444"};

function PipelineTab({apiKey,config,stages,sheetsConfig}){
  const leads=Array.isArray(stages.leads?.result)?stages.leads.result:[];
  const [selected,setSelected]=useState(null);
  const [status,setStatus]=useState(()=>{
    try{return JSON.parse(localStorage.getItem("cf_status")||"{}");}catch{return {};}
  });
  const [notes,setNotes]=useState(()=>{
    try{return JSON.parse(localStorage.getItem("cf_notes")||"{}");}catch{return {};}
  });
  const [content,setContent]=useState({});
  const [loading,setLoading]=useState({});
  const [sheetsSaved,setSheetsSaved]=useState({});

  useEffect(()=>{localStorage.setItem("cf_status",JSON.stringify(status));},[status]);
  useEffect(()=>{localStorage.setItem("cf_notes",JSON.stringify(notes));},[notes]);

  async function generate(lead,type){
    if(!apiKey){alert("API key required");return;}
    const key=`${lead.email||lead.name}-${type}`;
    setLoading(l=>({...l,[key]:true}));
    try{
      const platformNote=lead.platform&&lead.platform!=="Direct"?`Lead from ${lead.platform}. Handle: ${lead.platform_handle||""}.`:"";
      const verifiedNote=lead.verified?"Email verified ✅":"";
      let prompt="";
      if(type==="email") prompt=`Write a personalized cold email to ${lead.contact} at ${lead.name} about ${config.service}. Pain: ${lead.pain_point}. Price: ${config.price}. Sender: ${config.yourName||"us"} / ${config.companyName||config.service}. Subject + body. Max 120 words. ${platformNote} ${verifiedNote}`;
      else if(type==="dm") prompt=`Write a ${lead.platform||"social media"} DM to ${lead.contact} at ${lead.name}. Pain: ${lead.pain_point}. Under 100 words, value-first, no pitch yet. ${lead.best_approach?`Opening: ${lead.best_approach}`:""}`;
      else if(type==="proposal") prompt=`Concise proposal for ${lead.name} (${lead.contact}) for ${config.service}. Pain: ${lead.pain_point}. Investment: ${config.price}. Agency: ${config.companyName||config.service}.`;
      else if(type==="meeting") prompt=`Meeting request to ${lead.contact} at ${lead.name} for 30-min discovery about ${config.service}. ${config.calendlyLink?`Link: ${config.calendlyLink}`:"Ask availability."} Sender: ${config.yourName||"us"}.`;

      const text=await callClaude(apiKey,"You are a professional B2B sales expert.",prompt);
      setContent(c=>({...c,[key]:text}));
      setStatus(s=>({...s,[lead.email||lead.name]:type==="email"||type==="dm"?"Contacted":s[lead.email||lead.name]||"New"}));
      if(sheetsConfig.enabled&&sheetsConfig.apiKey&&sheetsConfig.sheetId){
        try{await exportAction(sheetsConfig,lead,type,text,config);setSheetsSaved(s=>({...s,[key]:true}));}
        catch(e){console.warn(e.message);}
      }
    }catch(e){setContent(c=>({...c,[key]:"Error: "+e.message}));}
    setLoading(l=>({...l,[key]:false}));
  }

  const leadId=l=>l.email||l.name;
  const grouped=PIPELINE_STAGES.reduce((acc,s)=>{
    acc[s]=leads.filter(l=>(status[leadId(l)]||"New")===s);return acc;
  },{});
  const wonCount=grouped["Won"]?.length||0;
  const contactedCount=leads.filter(l=>status[leadId(l)]&&status[leadId(l)]!=="New").length;

  if(leads.length===0) return(
    <div className="empty-state"><div className="empty-icon">👥</div>
      <p>No leads yet. Go to <strong>📥 Real Leads</strong> to import real contacts, then run <strong>🚀 Workflow</strong>.</p>
    </div>);

  return(<div className="pipeline-wrap">
    <div className="pipeline-header">
      <h2>👥 Sales Pipeline</h2>
      <p className="sub">Track every lead from first contact to closed deal</p>
      <div className="pipeline-stats">
        <span className="pstat"><strong>{leads.length}</strong> total leads</span>
        <span className="pstat blue"><strong>{contactedCount}</strong> contacted</span>
        <span className="pstat green"><strong>{wonCount}</strong> won</span>
      </div>
    </div>

    {/* Kanban overview */}
    <div className="kanban-strip">
      {PIPELINE_STAGES.map(s=>(
        <div key={s} className="kanban-col" style={{borderTopColor:PIPELINE_COLORS[s]}}>
          <div className="kanban-col-title" style={{color:PIPELINE_COLORS[s]}}>{s}</div>
          <div className="kanban-count">{grouped[s]?.length||0}</div>
        </div>
      ))}
    </div>

    {/* Two-panel layout */}
    <div className="leads-tab">
      <div className="leads-list">
        {leads.map((lead,i)=>{
          const st=status[leadId(lead)]||"New";
          return(<div key={i} className={`lead-row ${selected===i?"active":""}`} onClick={()=>setSelected(i)}>
            <div className="lead-row-main">
              <strong>{lead.name}</strong>
              {lead.verified&&<span style={{fontSize:10,color:"#22c55e"}}>✅</span>}
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center",marginTop:3}}>
              <span className="lead-row-sub">{lead.contact}</span>
              <span className="status-dot" style={{background:PIPELINE_COLORS[st],fontSize:10,padding:"1px 6px",borderRadius:4,color:"#fff"}}>{st}</span>
            </div>
          </div>);
        })}
      </div>

      {selected!==null&&(()=>{
        const lead=leads[selected];const lid=leadId(lead);const st=status[lid]||"New";
        return(<div className="lead-detail-panel">
          <div className="lead-detail-header">
            <h3>{lead.name}</h3>
            <div className="lead-tags">
              <span className="tag">{lead.size}</span>
              {lead.verified&&<span className="tag tag-green">✅ Verified</span>}
            </div>
          </div>

          {/* Status Changer */}
          <div className="status-changer">
            <label style={{fontSize:12,fontWeight:700,color:"#64748b",textTransform:"uppercase"}}>Pipeline Stage</label>
            <div className="status-options">
              {PIPELINE_STAGES.map(s=>(
                <button key={s} className={`status-btn ${st===s?"active":""}`}
                  style={st===s?{background:PIPELINE_COLORS[s],color:"#fff",borderColor:PIPELINE_COLORS[s]}:{}}
                  onClick={()=>setStatus(v=>({...v,[lid]:s}))}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="lead-info-grid">
            <div>👤 {lead.contact}{lead.title?` · ${lead.title}`:""}</div>
            <div>📧 <a href={`mailto:${lead.email}`}>{lead.email||"No email"}</a></div>
            {lead.website&&<div>🌐 <a href={lead.website} target="_blank" rel="noreferrer">{lead.website}</a></div>}
            {lead.phone&&<div>📞 {lead.phone}</div>}
            {lead.linkedin&&<div>💼 <a href={lead.linkedin} target="_blank" rel="noreferrer">LinkedIn Profile</a></div>}
            <div>💡 {lead.pain_point}</div>
          </div>

          {/* Notes */}
          <div className="field" style={{marginBottom:14}}>
            <label>📝 Notes</label>
            <textarea className="notes-area" placeholder="Add notes about this lead…" value={notes[lid]||""} onChange={e=>setNotes(n=>({...n,[lid]:e.target.value}))} rows={3}/>
          </div>

          {/* Actions */}
          <div className="lead-actions">
            {[["email","✉️","Cold Email"],["dm","💬","Social DM"],["proposal","📄","Proposal"],["meeting","📅","Meeting"]].map(([type,icon,label])=>{
              const key=`${lid}-${type}`;
              return(<div key={type} className="lead-action-block">
                <div className="lead-action-header">
                  <button className="btn-secondary" disabled={loading[key]} onClick={()=>generate(lead,type)}>
                    {loading[key]?`⏳ Generating…`:`${icon} ${label}`}
                  </button>
                  {sheetsSaved[key]&&<span className="sheets-saved-badge">📊 Saved</span>}
                </div>
                {content[key]&&(<div className="generated-content">
                  <pre>{content[key]}</pre>
                  <div className="generated-actions">
                    <button className="btn-ghost copy-btn" onClick={()=>navigator.clipboard.writeText(content[key])}>📋 Copy</button>
                    {type==="meeting"&&(<a className="btn-primary gcal-btn"
                      href={buildCalendarLink({title:`Discovery – ${config.companyName||config.service} × ${lead.name}`,description:content[key],startISO:(()=>{const d=new Date();d.setDate(d.getDate()+7);d.setHours(10,0,0,0);return d.toISOString();})(),durationMins:30,location:config.calendlyLink||"Google Meet"})}
                      target="_blank" rel="noreferrer">📅 Add to Calendar</a>)}
                  </div>
                </div>)}
              </div>);
            })}
          </div>
        </div>);
      })()}
    </div>
  </div>);
}

// ── Meetings Tab ──────────────────────────────────────────────────────────────
function MeetingsTab({config,stages}){
  const leads=Array.isArray(stages.leads?.result)?stages.leads.result:[];
  const slots=[{label:"This Tuesday 10:00 AM",offset:2,hour:10},{label:"This Wednesday 2:00 PM",offset:3,hour:14},{label:"Next Monday 11:00 AM",offset:8,hour:11},{label:"Next Thursday 3:00 PM",offset:11,hour:15}];
  function makeLink(lead,slot){
    const d=new Date();d.setDate(d.getDate()+slot.offset);d.setHours(slot.hour,0,0,0);
    return buildCalendarLink({title:`Discovery – ${config.companyName||config.service} × ${lead?.name||"Prospect"}`,description:`30-min call about ${config.service}.\nContact: ${lead?.contact||""}\nEmail: ${lead?.email||""}`,startISO:d.toISOString(),durationMins:30,location:config.calendlyLink||"Google Meet"});
  }
  return(<div className="meetings-tab">
    <div className="meetings-header"><h2>📅 Meeting Scheduler</h2><p className="sub">Schedule discovery calls to Google Calendar</p></div>
    {leads.length===0&&<div className="empty-state"><div className="empty-icon">📅</div><p>Run 🚀 Workflow first to generate leads.</p></div>}
    <div className="meetings-grid">
      {leads.map((lead,i)=>(
        <div key={i} className="meeting-card">
          <div className="meeting-card-header">
            <div><strong>{lead.name}</strong><div className="meeting-sub">{lead.contact} · {lead.email}</div></div>
            <span className="tag">{lead.size}</span>
          </div>
          <div className="meeting-pain">💡 {lead.pain_point}</div>
          <div className="slots-label">📆 Pick a slot:</div>
          <div className="slots">{slots.map((s,si)=><a key={si} href={makeLink(lead,s)} target="_blank" rel="noreferrer" className="slot-btn">🗓 {s.label}</a>)}</div>
          {config.calendlyLink&&<a href={config.calendlyLink} target="_blank" rel="noreferrer" className="btn-primary calendly-btn">📎 Open Calendly</a>}
        </div>
      ))}
    </div>
  </div>);
}

// ── Data Store Tab ────────────────────────────────────────────────────────────
function DataStoreTab({sheetsConfig,setSheetsConfig,stages,config}){
  const leads=Array.isArray(stages.leads?.result)?stages.leads.result:[];
  const [testStatus,setTestStatus]=useState(null);const [testing,setTesting]=useState(false);
  const [exporting,setExporting]=useState(false);const [exportStatus,setExportStatus]=useState(null);

  async function testConn(){
    if(!sheetsConfig.apiKey||!sheetsConfig.sheetId){setTestStatus({ok:false,msg:"Enter API Key and Sheet ID first."});return;}
    setTesting(true);setTestStatus(null);
    try{
      const res=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetsConfig.sheetId}?key=${sheetsConfig.apiKey}`);
      if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e?.error?.message||`HTTP ${res.status}`);}
      const data=await res.json();setTestStatus({ok:true,msg:`Connected: "${data.properties?.title||"Untitled"}"`});
    }catch(e){setTestStatus({ok:false,msg:e.message});}
    setTesting(false);
  }
  async function doExport(){
    if(!sheetsConfig.enabled||!sheetsConfig.apiKey||!sheetsConfig.sheetId){setExportStatus({ok:false,msg:"Enable Sheets and set credentials first."});return;}
    setExporting(true);setExportStatus(null);
    try{
      if(leads.length>0){await exportLeads(sheetsConfig,leads,config);await exportWorkflow(sheetsConfig,stages,config);setExportStatus({ok:true,msg:`Exported ${leads.length} leads!`});}
      else setExportStatus({ok:false,msg:"No leads to export. Run Workflow first."});
    }catch(e){setExportStatus({ok:false,msg:e.message});}
    setExporting(false);
  }

  const verifiedLeads=leads.filter(l=>l.verified);
  const platformBreakdown=leads.reduce((acc,l)=>{const p=l.platform||"Direct";acc[p]=(acc[p]||0)+1;return acc;},{});

  return(<div className="datastore-tab">
    <div className="datastore-header"><h2>📊 Data Store</h2><p className="sub">All leads, actions, and workflow results</p></div>
    <div className="datastore-grid">
      <div className="card datastore-stat"><div className="stat-icon">👥</div><div className="stat-value">{leads.length}</div><div className="stat-label">Total Leads</div></div>
      <div className="card datastore-stat"><div className="stat-icon">✅</div><div className="stat-value">{verifiedLeads.length}</div><div className="stat-label">Verified Emails</div></div>
      <div className="card datastore-stat"><div className="stat-icon">📊</div><div className="stat-value">{sheetsConfig.enabled?"ON":"OFF"}</div><div className="stat-label">Sheets Sync</div></div>
      <div className="card datastore-stat"><div className="stat-icon">🌍</div><div className="stat-value">{COUNTRIES.find(c=>c.name===config.country)?.flag||"—"}</div><div className="stat-label">{config.country||"No country"}</div></div>
    </div>

    {Object.keys(platformBreakdown).length>0&&<div className="card">
      <h3>📡 Lead Sources</h3>
      <div className="platform-breakdown">
        {Object.entries(platformBreakdown).map(([p,n])=>(
          <div key={p} className="platform-stat-item">
            <span>{p==="Hunter.io"?"🎯":p==="Apollo.io"?"🚀":p==="Google Places"?"📍":p==="CSV Import"?"📋":"🤖"}</span>
            <span className="platform-stat-name">{p}</span>
            <span className="platform-stat-count">{n} leads</span>
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
        <button className="btn-primary" onClick={doExport} disabled={exporting||!sheetsConfig.enabled}>{exporting?"⏳ Exporting…":"📤 Export All Now"}</button>
      </div>
      {testStatus&&<div className={`sheets-status ${testStatus.ok?"ok":"error"}`}>{testStatus.ok?"✅":"❌"} {testStatus.msg}</div>}
      {exportStatus&&<div className={`sheets-status ${exportStatus.ok?"ok":"error"}`}>{exportStatus.ok?"✅":"❌"} {exportStatus.msg}</div>}
    </div>

    {leads.length>0&&<div className="card">
      <h3>👥 Lead Data Preview</h3>
      <div className="leads-preview-table">
        <div className="leads-table-header"><span>Business</span><span>Contact</span><span>Source</span><span>Email</span><span>Verified</span></div>
        {leads.map((l,i)=>(
          <div key={i} className="leads-table-row">
            <span><strong>{l.name}</strong></span><span>{l.contact}</span>
            <span>{l.platform||"Direct"}</span>
            <span className="email-cell">{l.email||"—"}</span>
            <span>{l.verified?"✅":"❓"}</span>
          </div>
        ))}
      </div>
    </div>}
  </div>);
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App(){
  const [tab,setTab]=useState(0);
  const [apiKey,setApiKey]=useState(()=>sessionStorage.getItem("cf_key")||"");
  const [config,setConfig]=useState(()=>{try{return JSON.parse(localStorage.getItem("cf_config")||"null")||DEFAULT_CONFIG;}catch{return DEFAULT_CONFIG;}});
  const [sheetsConfig,setSheetsConfig]=useState(()=>{try{return JSON.parse(localStorage.getItem("cf_sheets")||"null")||DEFAULT_SHEETS;}catch{return DEFAULT_SHEETS;}});
  const [apiKeys,setApiKeys]=useState(()=>{try{return JSON.parse(sessionStorage.getItem("cf_apikeys")||"null")||DEFAULT_API_KEYS;}catch{return DEFAULT_API_KEYS;}});
  const [stages,setStages]=useState({});
  const [logs,setLogs]=useState([]);
  const [running,setRunning]=useState(false);

  useEffect(()=>{if(apiKey)sessionStorage.setItem("cf_key",apiKey);},[apiKey]);
  useEffect(()=>{localStorage.setItem("cf_config",JSON.stringify(config));},[config]);
  useEffect(()=>{localStorage.setItem("cf_sheets",JSON.stringify({...sheetsConfig,apiKey:""}));},[sheetsConfig]);
  useEffect(()=>{sessionStorage.setItem("cf_apikeys",JSON.stringify(apiKeys));},[apiKeys]);

  function handleLeadsFound(leads){
    setStages(s=>({...s,leads:{status:"done",result:leads}}));
    setTab(3); // Jump to Workflow
  }

  return(<div className="app">
    <header className="header">
      <div className="header-top">
        <div className="logo">
          <span className="logo-icon">⚡</span>
          <div>
            <div className="logo-name">ClientFlow AI</div>
            <div className="logo-sub">Real Leads → Research → Email → Follow Up → Meeting → Proposal</div>
          </div>
        </div>
        {sheetsConfig.enabled&&<div className="sheets-badge">📊 Sheets Active</div>}
      </div>
      <ApiKeyBanner apiKey={apiKey} setApiKey={setApiKey}/>
      <nav className="tabs">
        {TABS.map((t,i)=><button key={i} className={`tab ${tab===i?"active":""}`} onClick={()=>setTab(i)}>{t}</button>)}
      </nav>
    </header>
    <main className="main">
      {tab===0&&<SetupTab config={config} setConfig={setConfig} sheetsConfig={sheetsConfig} setSheetsConfig={setSheetsConfig} apiKeys={apiKeys} setApiKeys={setApiKeys}/>}
      {tab===1&&<RealLeadFinderTab config={config} apiKey={apiKey} apiKeys={apiKeys} sheetsConfig={sheetsConfig} onLeadsFound={handleLeadsFound}/>}
      {tab===2&&<SocialLeadFinderTab config={config} apiKey={apiKey} onLeadsFound={handleLeadsFound}/>}
      {tab===3&&<WorkflowTab config={config} apiKey={apiKey} sheetsConfig={sheetsConfig} stages={stages} setStages={setStages} logs={logs} setLogs={setLogs} running={running} setRunning={setRunning}/>}
      {tab===4&&<PipelineTab apiKey={apiKey} config={config} stages={stages} sheetsConfig={sheetsConfig}/>}
      {tab===5&&<MeetingsTab config={config} stages={stages}/>}
      {tab===6&&<DataStoreTab sheetsConfig={sheetsConfig} setSheetsConfig={setSheetsConfig} stages={stages} config={config}/>}
    </main>
  </div>);
}
