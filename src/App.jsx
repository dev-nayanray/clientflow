import { useState, useEffect, useRef } from "react";

const STAGES = ["Lead Research", "Outreach Email", "Follow Up", "Proposal", "Meeting"];

const NICHES = [
  "SaaS Companies","E-commerce Stores","Real Estate Agencies",
  "Digital Marketing Agencies","Law Firms","Healthcare Clinics",
  "Restaurants & Food Brands","Fitness & Wellness Studios",
  "Education & Coaching","Construction & Home Services","Custom / Manual",
];

const COUNTRIES = [
  "United States","United Kingdom","Canada","Australia",
  "Germany","UAE","Bangladesh","India","Pakistan","Singapore",
];

const SERVICES = [
  "SEO & Content Marketing","Social Media Management","Paid Ads (Google/Meta)",
  "Web Design & Development","Email Marketing","Video Production",
  "Branding & Graphic Design","Full-Stack Digital Marketing",
];

const statusColors = {
  idle: "#4a5568", running: "#f6ad55", done: "#68d391", error: "#fc8181",
};

const inputStyle = {
  background: "#161b22", border: "1px solid #30363d", borderRadius: "6px",
  padding: "9px 12px", color: "#e6edf3", fontSize: "13px", width: "100%",
};

function TerminalLog({ logs }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs]);
  return (
    <div ref={ref} style={{
      background:"#0d1117",borderRadius:"8px",padding:"16px",
      fontFamily:"'Courier New',monospace",fontSize:"12px",color:"#c9d1d9",
      height:"200px",overflowY:"auto",border:"1px solid #30363d",lineHeight:"1.7",
    }}>
      {logs.length===0 && <span style={{color:"#484f58"}}>// Awaiting workflow start...</span>}
      {logs.map((log,i)=>(
        <div key={i} style={{color:log.type==="success"?"#68d391":log.type==="error"?"#fc8181":log.type==="info"?"#79c0ff":"#c9d1d9"}}>
          <span style={{color:"#484f58"}}>[{log.time}]</span> {log.msg}
        </div>
      ))}
    </div>
  );
}

function StageCard({ stage, status, result, index }) {
  const [open, setOpen] = useState(false);
  const icons = ["🔍","✉️","🔁","📄","📅"];
  return (
    <div style={{
      background:status==="done"?"rgba(104,211,145,0.07)":status==="running"?"rgba(246,173,85,0.08)":"rgba(255,255,255,0.03)",
      border:`1px solid ${status==="done"?"#2d6a4f":status==="running"?"#744210":"#21262d"}`,
      borderRadius:"10px",padding:"14px 18px",marginBottom:"10px",
      cursor:result?"pointer":"default",transition:"all 0.3s ease",
    }} onClick={()=>result&&setOpen(!open)}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <span style={{fontSize:"18px"}}>{icons[index]}</span>
          <span style={{color:"#e6edf3",fontWeight:"600",fontSize:"14px"}}>{stage}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          {status==="running"&&<div style={{width:"8px",height:"8px",borderRadius:"50%",background:"#f6ad55",animation:"pulse 1s infinite"}}/>}
          <span style={{fontSize:"11px",fontWeight:"600",padding:"3px 10px",borderRadius:"20px",
            background:statusColors[status]+"22",color:statusColors[status],textTransform:"uppercase",letterSpacing:"0.5px"}}>
            {status==="idle"?"Waiting":status==="running"?"In Progress":status==="done"?"Complete":"Error"}
          </span>
          {result&&<span style={{color:"#484f58",fontSize:"12px"}}>{open?"▲":"▼"}</span>}
        </div>
      </div>
      {open&&result&&(
        <div style={{marginTop:"12px",padding:"12px",background:"#0d1117",borderRadius:"6px",
          fontSize:"13px",color:"#c9d1d9",whiteSpace:"pre-wrap",lineHeight:"1.7",
          border:"1px solid #21262d",maxHeight:"300px",overflowY:"auto"}}>
          {result}
        </div>
      )}
    </div>
  );
}

function LeadCard({ lead, onAction, loadingAction }) {
  const isLoading = (a) => loadingAction === lead.email+a;
  return (
    <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid #21262d",borderRadius:"10px",padding:"16px",marginBottom:"10px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"8px"}}>
        <div>
          <div style={{color:"#e6edf3",fontWeight:"700",fontSize:"15px"}}>{lead.company}</div>
          <div style={{color:"#8b949e",fontSize:"12px",marginTop:"2px"}}>{lead.contact} · {lead.role}</div>
          <div style={{color:"#79c0ff",fontSize:"12px",marginTop:"2px"}}>{lead.email}</div>
          <div style={{color:"#484f58",fontSize:"12px"}}>{lead.website}</div>
        </div>
        <span style={{fontSize:"11px",padding:"3px 10px",borderRadius:"20px",fontWeight:"700",
          background:lead.score>=80?"rgba(104,211,145,0.15)":lead.score>=60?"rgba(246,173,85,0.15)":"rgba(252,129,129,0.15)",
          color:lead.score>=80?"#68d391":lead.score>=60?"#f6ad55":"#fc8181"}}>
          Score: {lead.score}
        </span>
      </div>
      <div style={{marginTop:"10px",fontSize:"12px",color:"#8b949e"}}>
        <strong style={{color:"#c9d1d9"}}>Pain Point:</strong> {lead.pain}
      </div>
      <div style={{display:"flex",gap:"8px",marginTop:"12px",flexWrap:"wrap"}}>
        {[["email","✉ Draft Email","#238636"],["proposal","📄 Proposal","#1f6feb"],["meeting","📅 Meeting","#6e40c9"]].map(([a,label,bg])=>(
          <button key={a} onClick={()=>onAction(lead,a)} disabled={!!loadingAction} style={{
            background:isLoading(a)?"#21262d":bg,color:isLoading(a)?"#484f58":"#fff",
            border:"none",borderRadius:"6px",padding:"6px 14px",fontSize:"12px",
            cursor:loadingAction?"not-allowed":"pointer",fontWeight:"600",
          }}>
            {isLoading(a)?"⏳ Generating...":label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Modal({ title, content, onClose }) {
  if(!content) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",
      alignItems:"center",justifyContent:"center",zIndex:1000,padding:"20px"}} onClick={onClose}>
      <div style={{background:"#161b22",borderRadius:"12px",padding:"28px",maxWidth:"640px",
        width:"100%",border:"1px solid #30363d",maxHeight:"80vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
          <h3 style={{color:"#e6edf3",margin:0,fontSize:"16px"}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#8b949e",fontSize:"20px",cursor:"pointer"}}>✕</button>
        </div>
        <div style={{background:"#0d1117",borderRadius:"8px",padding:"16px",fontSize:"13px",
          color:"#c9d1d9",whiteSpace:"pre-wrap",lineHeight:"1.8",border:"1px solid #21262d"}}>
          {content}
        </div>
        <button onClick={()=>navigator.clipboard.writeText(content)} style={{
          marginTop:"14px",background:"#21262d",color:"#c9d1d9",border:"1px solid #30363d",
          borderRadius:"6px",padding:"8px 16px",fontSize:"13px",cursor:"pointer"}}>
          📋 Copy to Clipboard
        </button>
      </div>
    </div>
  );
}

function ApiKeyBanner({ apiKey, setApiKey, saved, setSaved }) {
  const [show, setShow] = useState(false);
  const [input, setInput] = useState(apiKey);
  return (
    <div style={{background:"rgba(121,192,255,0.07)",borderBottom:"1px solid #1f3a5f",padding:"10px 24px",
      display:"flex",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
      <span style={{fontSize:"12px",color:"#79c0ff",fontWeight:"600"}}>🔑 Anthropic API Key</span>
      {saved
        ? <span style={{fontSize:"12px",color:"#68d391"}}>✓ Key saved (session only)</span>
        : <span style={{fontSize:"12px",color:"#f6ad55"}}>⚠ No API key set — app won't work without it</span>}
      <div style={{display:"flex",gap:"8px",marginLeft:"auto"}}>
        <input
          type={show?"text":"password"}
          value={input}
          onChange={e=>setInput(e.target.value)}
          placeholder="sk-ant-..."
          style={{...inputStyle,width:"260px",fontSize:"12px"}}
        />
        <button onClick={()=>setShow(s=>!s)} style={{background:"#21262d",border:"1px solid #30363d",
          color:"#8b949e",borderRadius:"6px",padding:"6px 10px",cursor:"pointer",fontSize:"12px"}}>
          {show?"🙈":"👁"}
        </button>
        <button onClick={()=>{setApiKey(input);setSaved(true);}} style={{background:"#238636",
          color:"#fff",border:"none",borderRadius:"6px",padding:"6px 14px",cursor:"pointer",
          fontSize:"12px",fontWeight:"700"}}>
          Save
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("setup");
  const [apiKey, setApiKey] = useState("");
  const [keySaved, setKeySaved] = useState(false);
  const [config, setConfig] = useState({
    niche:"SaaS Companies",customNiche:"",country:"United States",
    service:"SEO & Content Marketing",yourName:"",yourEmail:"",
    companyName:"",shortIntro:"",proposalTemplate:"",
    priceRange:"$500 - $2000/month",calendlyLink:"",
  });
  const [running, setRunning] = useState(false);
  const [stages, setStages] = useState({});
  const [results, setResults] = useState({});
  const [logs, setLogs] = useState([]);
  const [leads, setLeads] = useState([]);
  const [modalData, setModalData] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);

  const addLog = (msg, type="normal") => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev=>[...prev,{msg,type,time}]);
  };
  const sleep = ms => new Promise(r=>setTimeout(r,ms));

  const callClaude = async (prompt, system="") => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({
        model:"claude-sonnet-4-20250514",max_tokens:1000,
        system:system||"You are an expert business development and client acquisition specialist. Be concise, professional, and highly specific.",
        messages:[{role:"user",content:prompt}],
      }),
    });
    const data = await res.json();
    if(data.error) throw new Error(data.error.message);
    return data.content?.map(b=>b.text||"").join("")||"";
  };

  const nicheTarget = config.niche==="Custom / Manual" ? config.customNiche : config.niche;

  const runFullWorkflow = async () => {
    if(!apiKey){alert("Please enter your Anthropic API key first!");return;}
    if(!nicheTarget||!config.service) return;
    setRunning(true);setLeads([]);setLogs([]);setResults({});setStages({});

    // Stage 1 - Lead Research
    setStages(s=>({...s,"Lead Research":"running"}));
    addLog("🔍 Researching leads for: "+nicheTarget,"info");
    try {
      const raw = await callClaude(
        `Generate 4 realistic fictional prospect leads for a ${config.service} agency targeting ${nicheTarget} in ${config.country}.
Return ONLY a valid JSON array with these fields per item:
company, contact, role, email, website, pain (specific to ${config.service}), score (50-95).
No markdown, no explanation — raw JSON array only.`
      );
      let parsed=[];
      try { parsed=JSON.parse(raw.replace(/\`\`\`json|\`\`\`/g,"").trim()); } catch{}
      setLeads(parsed);
      setStages(s=>({...s,"Lead Research":"done"}));
      setResults(r=>({...r,"Lead Research":JSON.stringify(parsed,null,2)}));
      addLog(`✅ Found ${parsed.length} qualified leads`,"success");
    } catch(e){
      setStages(s=>({...s,"Lead Research":"error"}));
      addLog("❌ Lead research failed: "+e.message,"error");
    }

    await sleep(500);

    // Stage 2 - Outreach Email
    setStages(s=>({...s,"Outreach Email":"running"}));
    addLog("✉️ Drafting personalized outreach email...","info");
    try {
      const email = await callClaude(
        `Write a short personalized cold outreach email from ${config.companyName||"our agency"} (${config.yourName||"the founder"}) to a decision maker at a ${nicheTarget} company.
Service: ${config.service} | Country: ${config.country}
${config.shortIntro?"About us: "+config.shortIntro:""}
Rules: Max 150 words, include subject line, no fluff, reference a real pain point, soft CTA for 15-min call.
Use [FIRST_NAME] and [COMPANY] placeholders.`
      );
      setStages(s=>({...s,"Outreach Email":"done"}));
      setResults(r=>({...r,"Outreach Email":email}));
      addLog("✅ Outreach email ready","success");
    } catch(e){
      setStages(s=>({...s,"Outreach Email":"error"}));
      addLog("❌ Email drafting failed","error");
    }

    await sleep(500);

    // Stage 3 - Follow Up
    setStages(s=>({...s,"Follow Up":"running"}));
    addLog("🔁 Building 3-email follow-up sequence...","info");
    try {
      const followup = await callClaude(
        `Write a 3-email follow-up sequence for a ${config.service} agency targeting ${nicheTarget}.
FOLLOW-UP 1: Day 3 - gentle nudge (80 words max)
FOLLOW-UP 2: Day 7 - add a useful insight/tip (100 words max)
FOLLOW-UP 3: Day 14 - final breakup email (60 words max)
Each needs a subject line. Use [FIRST_NAME] placeholder.`
      );
      setStages(s=>({...s,"Follow Up":"done"}));
      setResults(r=>({...r,"Follow Up":followup}));
      addLog("✅ 3-email sequence created","success");
    } catch(e){
      setStages(s=>({...s,"Follow Up":"error"}));
      addLog("❌ Follow-up failed","error");
    }

    await sleep(500);

    // Stage 4 - Proposal
    setStages(s=>({...s,"Proposal":"running"}));
    addLog("📄 Generating proposal template...","info");
    try {
      const proposal = await callClaude(
        `Write a professional service proposal from ${config.companyName||"[Your Agency]"} to a ${nicheTarget} company for ${config.service}.
Price range: ${config.priceRange}
Sections: 1. Executive Summary  2. The Problem  3. Our Solution & Deliverables  4. Pricing Tiers (Starter/Growth/Premium)  5. Timeline (4 weeks)  6. Investment  7. Next Steps
Keep it persuasive and results-focused. Use [CLIENT_NAME] placeholder.`
      );
      setStages(s=>({...s,"Proposal":"done"}));
      setResults(r=>({...r,"Proposal":proposal}));
      addLog("✅ Proposal template generated","success");
    } catch(e){
      setStages(s=>({...s,"Proposal":"error"}));
      addLog("❌ Proposal failed","error");
    }

    await sleep(500);

    // Stage 5 - Meeting
    setStages(s=>({...s,"Meeting":"running"}));
    addLog("📅 Writing meeting booking message...","info");
    try {
      const meeting = await callClaude(
        `Write a short friendly message to book a 15-min discovery call with a ${nicheTarget} owner interested in ${config.service}.
${config.calendlyLink?"Booking link: "+config.calendlyLink:"Use [BOOKING_LINK] placeholder."}
Include: 1 value line, clear ask, 2 alt time options. Sign off from ${config.yourName||"[YOUR_NAME]"} at ${config.companyName||"[YOUR_COMPANY]"}.
Max 80 words.`
      );
      setStages(s=>({...s,"Meeting":"done"}));
      setResults(r=>({...r,"Meeting":meeting}));
      addLog("✅ Meeting message ready","success");
    } catch(e){
      setStages(s=>({...s,"Meeting":"error"}));
      addLog("❌ Meeting message failed","error");
    }

    addLog("🎉 Full workflow complete! Click any stage to view results.","success");
    setRunning(false);
  };

  const handleLeadAction = async (lead, action) => {
    if(!apiKey){alert("Please enter your Anthropic API key first!");return;}
    setLoadingAction(lead.email+action);
    try {
      let content="";
      if(action==="email"){
        content=await callClaude(`Write a personalized cold email to ${lead.contact} (${lead.role}) at ${lead.company} about ${config.service}.
Pain point: ${lead.pain}. From: ${config.yourName||"our team"} at ${config.companyName||"our agency"}.
Max 120 words. Include subject line. Use their real name and company.`);
        setModalData({title:`✉️ Email to ${lead.contact} @ ${lead.company}`,content});
      } else if(action==="proposal"){
        content=await callClaude(`Write a 1-page proposal for ${lead.company} (${lead.contact}, ${lead.role}) for ${config.service}.
Pain: ${lead.pain}. Price: ${config.priceRange}.
Sections: Problem → Solution → Deliverables → Investment → Next Steps. Be specific to their pain.`);
        setModalData({title:`📄 Proposal for ${lead.company}`,content});
      } else {
        content=await callClaude(`Write a message to ${lead.contact} at ${lead.company} to book a 15-min call about ${config.service}.
Pain: ${lead.pain}. ${config.calendlyLink?"Booking: "+config.calendlyLink:"Use [BOOKING_LINK]."} Max 70 words.`);
        setModalData({title:`📅 Meeting Request to ${lead.contact}`,content});
      }
    } catch(e){
      setModalData({title:"Error",content:"Failed: "+e.message});
    }
    setLoadingAction(null);
  };

  const pct = STAGES.filter(s=>stages[s]==="done").length/STAGES.length*100;

  return (
    <div style={{minHeight:"100vh",background:"#0d1117",color:"#e6edf3",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes spin{to{transform:rotate(360deg)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-track{background:#0d1117}
        ::-webkit-scrollbar-thumb{background:#30363d;border-radius:3px}
        input::placeholder,textarea::placeholder{color:#484f58}
        select option{background:#161b22}
      `}</style>

      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#161b22 0%,#0d1117 100%)",
        borderBottom:"1px solid #21262d",padding:"18px 24px",
        display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"12px"}}>
        <div>
          <h1 style={{margin:0,fontSize:"20px",fontWeight:"800",letterSpacing:"-0.5px"}}>
            ⚡ ClientFlow AI
          </h1>
          <p style={{margin:"2px 0 0",fontSize:"12px",color:"#8b949e"}}>
            Automated Client Acquisition · Find → Email → Follow-up → Proposal → Book
          </p>
        </div>
        <div style={{display:"flex",gap:"8px"}}>
          {[["setup","⚙️ Setup"],["workflow","🚀 Workflow"],["leads","👥 Leads"]].map(([t,label])=>(
            <button key={t} onClick={()=>setTab(t)} style={{
              background:tab===t?"#238636":"transparent",
              color:tab===t?"#fff":"#8b949e",
              border:`1px solid ${tab===t?"#2ea043":"#30363d"}`,
              borderRadius:"6px",padding:"6px 16px",fontSize:"13px",
              cursor:"pointer",fontWeight:tab===t?"700":"400"}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* API Key Banner */}
      <ApiKeyBanner apiKey={apiKey} setApiKey={setApiKey} saved={keySaved} setSaved={setKeySaved}/>

      <div style={{maxWidth:"860px",margin:"0 auto",padding:"24px 16px"}}>

        {/* SETUP TAB */}
        {tab==="setup"&&(
          <div>
            <h2 style={{color:"#e6edf3",fontSize:"16px",marginBottom:"20px",fontWeight:"700"}}>
              Configure Your Acquisition Settings
            </h2>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
              {[
                {label:"Target Niche / Industry",key:"niche",type:"select",options:NICHES},
                {label:"Target Country",key:"country",type:"select",options:COUNTRIES},
                {label:"Your Service",key:"service",type:"select",options:SERVICES},
                {label:"Price Range",key:"priceRange",type:"text",placeholder:"$500 - $2000/month"},
                {label:"Your Name",key:"yourName",type:"text",placeholder:"John Smith"},
                {label:"Agency / Company Name",key:"companyName",type:"text",placeholder:"Apex Digital Agency"},
                {label:"Your Email",key:"yourEmail",type:"text",placeholder:"you@agency.com"},
                {label:"Calendly / Booking Link",key:"calendlyLink",type:"text",placeholder:"https://calendly.com/..."},
              ].map(f=>(
                <div key={f.key}>
                  <label style={{display:"block",fontSize:"12px",color:"#8b949e",marginBottom:"6px",fontWeight:"600"}}>
                    {f.label}
                  </label>
                  {f.type==="select"
                    ? <select value={config[f.key]} onChange={e=>setConfig(c=>({...c,[f.key]:e.target.value}))} style={inputStyle}>
                        {f.options.map(o=><option key={o}>{o}</option>)}
                      </select>
                    : <input value={config[f.key]} onChange={e=>setConfig(c=>({...c,[f.key]:e.target.value}))}
                        placeholder={f.placeholder} style={inputStyle}/>
                  }
                </div>
              ))}
            </div>
            {config.niche==="Custom / Manual"&&(
              <div style={{marginTop:"14px"}}>
                <label style={{display:"block",fontSize:"12px",color:"#8b949e",marginBottom:"6px",fontWeight:"600"}}>
                  Describe Your Custom Niche
                </label>
                <input value={config.customNiche} onChange={e=>setConfig(c=>({...c,customNiche:e.target.value}))}
                  placeholder="e.g. Luxury Wedding Photographers in London" style={inputStyle}/>
              </div>
            )}
            <div style={{marginTop:"14px"}}>
              <label style={{display:"block",fontSize:"12px",color:"#8b949e",marginBottom:"6px",fontWeight:"600"}}>
                Short Agency Intro (used to personalize all outreach)
              </label>
              <textarea value={config.shortIntro} onChange={e=>setConfig(c=>({...c,shortIntro:e.target.value}))}
                placeholder="e.g. We help SaaS companies grow organic traffic by 300% in 6 months using proven SEO frameworks..."
                rows={3} style={{...inputStyle,resize:"vertical"}}/>
            </div>
            <button onClick={()=>setTab("workflow")} style={{
              marginTop:"20px",background:"#238636",color:"#fff",border:"none",
              borderRadius:"8px",padding:"12px 28px",fontSize:"14px",fontWeight:"700",cursor:"pointer"}}>
              Save & Go to Workflow →
            </button>
          </div>
        )}

        {/* WORKFLOW TAB */}
        {tab==="workflow"&&(
          <div>
            <div style={{background:"rgba(35,134,54,0.1)",border:"1px solid #2d6a4f",borderRadius:"10px",
              padding:"16px 20px",marginBottom:"20px",display:"flex",
              justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"12px"}}>
              <div>
                <div style={{fontSize:"13px",color:"#68d391",fontWeight:"700"}}>Active Configuration</div>
                <div style={{fontSize:"12px",color:"#8b949e",marginTop:"4px"}}>
                  <span style={{color:"#c9d1d9"}}>{nicheTarget||"(no niche set)"}</span> ·{" "}
                  <span style={{color:"#c9d1d9"}}>{config.service}</span> ·{" "}
                  <span style={{color:"#c9d1d9"}}>{config.country}</span>
                </div>
              </div>
              <button onClick={runFullWorkflow} disabled={running} style={{
                background:running?"#21262d":"linear-gradient(135deg,#238636,#196127)",
                color:running?"#484f58":"#fff",border:"none",borderRadius:"8px",
                padding:"10px 24px",fontSize:"14px",fontWeight:"700",
                cursor:running?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:"8px"}}>
                {running
                  ? <><span style={{display:"inline-block",width:"14px",height:"14px",border:"2px solid #484f58",
                      borderTopColor:"#8b949e",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/> Running...</>
                  : "🚀 Run Full Workflow"}
              </button>
            </div>

            {Object.keys(stages).length>0&&(
              <div style={{marginBottom:"16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:"12px",color:"#8b949e",marginBottom:"6px"}}>
                  <span>Progress</span><span>{Math.round(pct)}%</span>
                </div>
                <div style={{height:"6px",background:"#21262d",borderRadius:"3px",overflow:"hidden"}}>
                  <div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,#238636,#3fb950)",
                    borderRadius:"3px",transition:"width 0.5s ease"}}/>
                </div>
              </div>
            )}

            {STAGES.map((stage,i)=>(
              <StageCard key={stage} stage={stage} status={stages[stage]||"idle"} result={results[stage]} index={i}/>
            ))}

            <div style={{marginTop:"20px"}}>
              <div style={{fontSize:"12px",color:"#8b949e",marginBottom:"8px",fontWeight:"600"}}>📟 Activity Log</div>
              <TerminalLog logs={logs}/>
            </div>
          </div>
        )}

        {/* LEADS TAB */}
        {tab==="leads"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div>
                <h2 style={{color:"#e6edf3",fontSize:"16px",margin:0,fontWeight:"700"}}>Qualified Leads</h2>
                <p style={{color:"#8b949e",fontSize:"12px",margin:"4px 0 0"}}>
                  {leads.length>0?`${leads.length} leads · ${nicheTarget}`:"Run the workflow first to find leads"}
                </p>
              </div>
              {leads.length>0&&(
                <span style={{fontSize:"12px",padding:"4px 12px",borderRadius:"20px",
                  background:"rgba(104,211,145,0.1)",color:"#68d391",border:"1px solid #2d6a4f"}}>
                  ✓ {leads.length} Active
                </span>
              )}
            </div>

            {leads.length===0
              ? <div style={{textAlign:"center",padding:"60px 20px",color:"#484f58",
                  border:"1px dashed #21262d",borderRadius:"12px"}}>
                  <div style={{fontSize:"40px",marginBottom:"12px"}}>🔍</div>
                  <div style={{fontSize:"14px"}}>No leads yet.</div>
                  <div style={{fontSize:"12px",marginTop:"6px"}}>
                    Go to <strong style={{color:"#8b949e"}}>🚀 Workflow</strong> and click Run Full Workflow
                  </div>
                </div>
              : leads.map((lead,i)=>(
                  <LeadCard key={i} lead={lead} onAction={handleLeadAction} loadingAction={loadingAction}/>
                ))
            }
          </div>
        )}
      </div>

      {modalData&&<Modal title={modalData.title} content={modalData.content} onClose={()=>setModalData(null)}/>}
    </div>
  );
}
