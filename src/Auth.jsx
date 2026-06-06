// src/Auth.jsx — Professional SaaS Landing Page v2
import { useState, useEffect, useRef } from "react";
import { signIn, signUp, signInWithGoogle, resetPassword } from "./supabase";

function Counter({ to, suffix="" }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let s = 0, step = Math.ceil(to/60);
      const t = setInterval(() => { s=Math.min(s+step,to); setVal(s); if(s>=to)clearInterval(t); }, 16);
    }, { threshold:.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open?"open":""}`} onClick={() => setOpen(!open)}>
      <div className="faq-q"><span>{q}</span><span className="faq-icon">{open?"−":"+"}</span></div>
      {open && <div className="faq-a">{a}</div>}
    </div>
  );
}

// ── Landing Page ──────────────────────────────────────────────────────────────
function LandingPage({ onGetStarted, onSignIn, onDemo }) {
  const [scrollY, setScrollY]         = useState(0);
  const [billing, setBilling]         = useState("yearly");
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const h = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", h, { passive:true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const FEATURES = [
    { icon:"🎯", title:"Real Lead Finder",      color:"#6366f1", tag:"Hunter.io · Apollo · Places",
      desc:"Find verified contacts from 275M+ real people. No fake AI names — actual emails, actual companies, ready to outreach." },
    { icon:"🤖", title:"AI Outreach Writer",     color:"#ec4899", tag:"Claude Sonnet · Personalized",
      desc:"Claude AI writes personalized cold emails, DMs and follow-up sequences for each lead automatically." },
    { icon:"📧", title:"Gmail Integration",      color:"#f59e0b", tag:"OAuth · Approval Flow",
      desc:"Send directly through your Gmail. Every email shows in an approval screen — you review before it goes out." },
    { icon:"👥", title:"CRM Pipeline",           color:"#22c55e", tag:"Kanban · Reminders · Activity",
      desc:"Kanban board from New → Won. Reminders, activity logs, notes and follow-up scheduling per lead." },
    { icon:"📁", title:"Portfolio Generator",    color:"#8b5cf6", tag:"Case Studies · HTML · LinkedIn",
      desc:"Turn past projects into professional case studies, downloadable portfolio pages and LinkedIn posts." },
    { icon:"🎯", title:"Freelance Proposals",    color:"#0ea5e9", tag:"Upwork · Fiverr · Gig Creator",
      desc:"Win more jobs with AI-crafted proposals, gig listings, and profile rewrites for Upwork and Fiverr." },
    { icon:"🗂️", title:"Project Manager",        color:"#14b8a6", tag:"Tasks · Invoices · Time Log",
      desc:"Manage tasks, milestones, invoices and time tracking for every client. Generate PDF invoices instantly." },
    { icon:"📊", title:"Google Sheets Sync",     color:"#ef4444", tag:"Auto-sync · 3 tabs · Real-time",
      desc:"All leads, workflows and client data automatically synced to your Google Sheets." },
  ];

  const PLANS = {
    monthly: [
      { name:"Starter", price:"$1", period:"/mo", color:"#6366f1", popular:false, save:"",
        features:["Unlimited AI email writing","Real lead finder (Hunter+Apollo+Places)","CRM pipeline & kanban","Portfolio generator","Project manager + invoicing","Gmail send integration","Google Sheets sync","Cancel anytime"] },
      { name:"Growth", price:"$3", period:"/mo", color:"#8b5cf6", popular:true, save:"Best value",
        features:["Everything in Starter","Priority AI (faster responses)","Team workspace (3 seats)","White-label invoices","Advanced analytics","Priority email support"] },
      { name:"Agency", price:"$9", period:"/mo", color:"#ec4899", popular:false, save:"For teams",
        features:["Everything in Growth","Unlimited team seats","Client portal access","API access","Custom integrations","Dedicated account manager"] },
    ],
    yearly: [
      { name:"Starter", price:"$10", period:"/yr", color:"#6366f1", popular:false, save:"Save $2",
        features:["All Starter monthly features","Billed yearly","2 months free vs monthly"] },
      { name:"Growth", price:"$29", period:"/yr", color:"#8b5cf6", popular:true, save:"Save 19%",
        features:["All Growth monthly features","Priority support","Billed yearly — best value"] },
      { name:"Lifetime", price:"$50", period:" once", color:"#f59e0b", popular:false, save:"Pay once",
        features:["Everything in Growth","Pay once, use forever","All future updates included","Commercial license","Priority support forever"] },
    ],
  };

  const TESTIMONIALS = [
    { name:"Arjun M.", role:"Full-Stack Dev · Top Rated Upwork", avatar:"A", color:"#6366f1",
      text:"Got 4 new clients in the first month. The AI proposal writer saves me 3 hours a week. Replaced Hunter.io + Close CRM + Bonsai with this one tool." },
    { name:"Sarah C.", role:"Digital Agency · London", avatar:"S", color:"#ec4899",
      text:"LinkedIn outreach reply rate went from 4% to 23%. The CRM pipeline keeps everything organized — I never lose track of a prospect." },
    { name:"Carlos R.", role:"SEO Consultant · Madrid", avatar:"C", color:"#22c55e",
      text:"Finally a tool that covers the FULL client acquisition workflow. From finding the lead to sending the invoice. At $1/month it's a no-brainer." },
    { name:"Priya T.", role:"Marketing Consultant · Singapore", avatar:"P", color:"#f59e0b",
      text:"The Upwork proposal generator alone has gotten me 6 extra contracts. The portfolio case study tool turned my past work into actual sales assets." },
  ];

  const FAQS = [
    { q:"Is it really $1/month?", a:"Yes. Full access to all core features for $1/month. No hidden fees, no feature walls for the basics. Cancel any time from your billing portal." },
    { q:"Do I need my own API keys?", a:"You need an Anthropic API key for AI features. Hunter.io, Apollo.io and Google Places have free tiers. All keys are stored only in your browser — never on our servers." },
    { q:"How does Gmail send work?", a:"Connect Gmail via OAuth. Every email goes through an approval screen — you review it before it sends. Completely under your control." },
    { q:"What's different from just using Apollo or Hunter?", a:"Those tools only find leads. ClientFlow connects lead finding → AI writing → Gmail send → CRM tracking → proposals → project management → invoicing in one complete pipeline." },
    { q:"Can I try before buying?", a:"Yes — click 'View Live Demo' to try the full app without creating an account. All features are available in demo mode." },
    { q:"What happens if I cancel?", a:"Cancel anytime, no questions. Your data is exported as CSV before you leave. If you cancel mid-month, you keep access until the period ends." },
  ];

  const navScrolled = scrollY > 50;

  return (
    <div className="lp">
      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav className={`lp-nav ${navScrolled?"lp-nav--scrolled":""}`}>
        <div className="lp-nav__inner">
          <a className="lp-logo" href="#">
            <span className="lp-logo__mark">⚡</span>
            <span className="lp-logo__name">ClientFlow<span className="lp-logo__ai"> AI</span></span>
          </a>
          <div className="lp-nav__links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#testimonials">Reviews</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="lp-nav__cta">
            <button className="lp-nav__signin" onClick={onSignIn}>Sign in</button>
            <button className="lp-nav__start" onClick={onGetStarted}>Get started free →</button>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-hero__bg">
          <div className="lp-orb lp-orb--1"/><div className="lp-orb lp-orb--2"/><div className="lp-orb lp-orb--3"/>
          <div className="lp-grid-overlay"/>
        </div>
        <div className="lp-hero__inner">
          <div className="lp-hero__content">
            <div className="lp-hero__eyebrow">
              <span className="lp-hero__eyebrow-dot"/>
              AI-Powered Client Acquisition — Trusted by 2,400+ Freelancers
            </div>
            <h1 className="lp-hero__h1">
              Land Clients.<br/>
              <span className="lp-hero__h1-grad">Scale Revenue.</span>
            </h1>
            <p className="lp-hero__p">
              Find real verified leads, write AI outreach, manage your pipeline,
              send proposals and invoice clients — all in one tool.
              <strong> Replaces $210+/month of tools for just $1/month.</strong>
            </p>
            <div className="lp-hero__cta-row">
              <button className="lp-btn-primary" onClick={onGetStarted}>
                🚀 Start Free Today
              </button>
              <button className="lp-btn-demo" onClick={onDemo}>
                <span className="lp-demo-pulse"/>&nbsp;View Live Demo
              </button>
            </div>
            <div className="lp-hero__social">
              <div className="lp-avatar-stack">
                {["A","S","C","M","R","P"].map((l,i)=>(
                  <div key={i} className="lp-avatar-stack__face" style={{background:`hsl(${i*60},65%,55%)`}}>{l}</div>
                ))}
              </div>
              <div className="lp-hero__social-text">
                <span><strong>2,400+</strong> freelancers & agencies</span>
                <span className="lp-stars-small">★★★★★ 4.9/5</span>
              </div>
            </div>
          </div>
          {/* Mockup */}
          <div className="lp-hero__visual">
            <div className="lp-mockup">
              <div className="lp-mockup__topbar">
                <div className="lp-mockup__dots"><span/><span/><span/></div>
                <div className="lp-mockup__addr">app.clientflow.ai</div>
                <div className="lp-mockup__live">● Live</div>
              </div>
              <div className="lp-mockup__content">
                <div className="lp-mockup__side">
                  <div className="lp-mockup__brand">⚡ ClientFlow</div>
                  {[["📥","Real Leads"],["🚀","Workflow"],["👥","Pipeline"],["📁","Portfolio"],["🗂️","Projects"]].map(([ic,t],i)=>(
                    <div key={i} className={`lp-mockup__link ${i===1?"active":""}`}><span>{ic}</span><span>{t}</span></div>
                  ))}
                </div>
                <div className="lp-mockup__main">
                  <div className="lp-mockup__mheader">
                    <div><div className="lp-mockup__mtitle">🚀 Workflow Running</div><div className="lp-mockup__msub">E-commerce · United States</div></div>
                    <div className="lp-mockup__badge">⏳ Running</div>
                  </div>
                  <div className="lp-mockup__stages">
                    {[["✅","Leads","done"],["✅","Email","done"],["⏳","Follow-Up","active"],["⬜","Proposal","idle"],["⬜","Meeting","idle"]].map(([ic,lb,st],i)=>(
                      <div key={i} className={`lp-mockup__stage lp-mockup__stage--${st}`}><span>{ic}</span><span>{lb}</span></div>
                    ))}
                  </div>
                  <div className="lp-mockup__terminal">
                    <div className="lp-mockup__tline lp-mockup__tline--ok">[09:14] ✅ 5 verified leads found via Hunter.io</div>
                    <div className="lp-mockup__tline lp-mockup__tline--ok">[09:15] ✅ Personalized email drafted for Acme Store</div>
                    <div className="lp-mockup__tline lp-mockup__tline--run">[09:16] ⏳ Building follow-up sequence…</div>
                    <div className="lp-mockup__tline lp-mockup__tline--dim">[——] ⬜ Generating proposal…</div>
                  </div>
                  <div className="lp-mockup__leads">
                    {[["Acme Store","john@acme.com","✅"],["TechHub","sarah@tech.io","✅"],["BlueWave","m@bw.co","🔍"]].map(([n,e,s],i)=>(
                      <div key={i} className="lp-mockup__lead">
                        <div className="lp-mockup__lavatar">{n[0]}</div>
                        <div><div className="lp-mockup__lname">{n}</div><div className="lp-mockup__lemail">{e}</div></div>
                        <span className="lp-mockup__lstatus">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <div className="lp-statsbar">
        <div className="lp-statsbar__inner">
          {[{to:2400,suffix:"+",lb:"Active Users"},{to:50000,suffix:"+",lb:"Leads Found"},{to:210,suffix:"/mo",lb:"Tools Replaced Value"},{to:99,suffix:"%",lb:"Uptime SLA"}].map((s,i)=>(
            <div key={i} className="lp-statsbar__stat">
              <div className="lp-statsbar__val"><Counter to={s.to} suffix={s.suffix}/></div>
              <div className="lp-statsbar__label">{s.lb}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section className="lp-features" id="features">
        <div className="lp-section-head">
          <div className="lp-chip">Features</div>
          <h2>Everything to win and manage clients</h2>
          <p>11 tools in one app — replacing $210+/month of separate subscriptions</p>
        </div>
        <div className="lp-features__bento">
          {FEATURES.map((f,i)=>(
            <div key={i} className={`lp-fcard ${activeFeature===i?"lp-fcard--active":""}`}
              style={{"--fc":f.color}} onClick={()=>setActiveFeature(i)}>
              <div className="lp-fcard__icon">{f.icon}</div>
              <div className="lp-fcard__body">
                <div className="lp-fcard__title">{f.title}</div>
                <div className="lp-fcard__tag">{f.tag}</div>
                <div className="lp-fcard__desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="lp-how">
        <div className="lp-how__bg"><div className="lp-orb lp-orb--4"/></div>
        <div className="lp-section-head lp-section-head--light">
          <div className="lp-chip lp-chip--glass">How It Works</div>
          <h2 style={{color:"#f1f5f9"}}>From zero to client in 5 steps</h2>
        </div>
        <div className="lp-how__steps">
          {[
            {n:"01",icon:"🔍",t:"Find Real Leads",d:"Search Hunter.io, Apollo, Google Places or import CSV. Get verified emails, phone numbers and company data instantly."},
            {n:"02",icon:"🤖",t:"AI Writes Outreach",d:"Claude AI personalizes cold emails, LinkedIn DMs and follow-up sequences for every lead automatically."},
            {n:"03",icon:"📧",t:"Send via Gmail",d:"Review every message in the approval queue, then send directly through your connected Gmail account."},
            {n:"04",icon:"👥",t:"Track in CRM",d:"Every lead moves through your kanban: Contacted → Replied → Meeting → Proposal → Won."},
            {n:"05",icon:"💵",t:"Invoice & Deliver",d:"Create professional invoices, track time, manage project tasks and deliver work on time."},
          ].map((s,i)=>(
            <div key={i} className="lp-how__step">
              {i<4 && <div className="lp-how__connector"/>}
              <div className="lp-how__num">{s.n}</div>
              <div className="lp-how__sicon">{s.icon}</div>
              <div className="lp-how__stitle">{s.t}</div>
              <div className="lp-how__sdesc">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMPARE ──────────────────────────────────────────────────────── */}
      <section className="lp-compare">
        <div className="lp-section-head">
          <div className="lp-chip">vs Alternatives</div>
          <h2>Replace $210+/month of tools</h2>
          <p>Everything these tools do — in one unified workflow for a fraction of the cost</p>
        </div>
        <div className="lp-compare__table">
          <div className="lp-compare__head">
            <span>Tool Replaced</span><span>Category</span><span className="bad">Their Price</span><span className="good">ClientFlow AI</span>
          </div>
          {[
            ["Hunter.io","Email Finder","$49/mo"],["Apollo.io","Lead Database","$49/mo"],
            ["Close CRM","CRM","$29/mo"],["Calendly","Scheduling","$10/mo"],
            ["Bonsai","Invoicing","$24/mo"],["Copy.ai","AI Writing","$49/mo"],
          ].map(([tool,cat,price],i)=>(
            <div key={i} className="lp-compare__row">
              <span className="lp-compare__tool">{tool}</span>
              <span className="lp-compare__cat">{cat}</span>
              <span className="lp-compare__bad">{price}</span>
              <span className="lp-compare__good">✅ Included</span>
            </div>
          ))}
          <div className="lp-compare__total">
            <span><strong>Total separately</strong></span><span/>
            <span className="lp-compare__total-bad">$210/mo</span>
            <span className="lp-compare__total-good">$1/mo ⚡</span>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section className="lp-reviews" id="testimonials">
        <div className="lp-section-head">
          <div className="lp-chip">Reviews</div>
          <h2>Loved by freelancers & agencies</h2>
          <div className="lp-rating-row"><span className="lp-stars">★★★★★</span><span>4.9/5 from 200+ reviews</span></div>
        </div>
        <div className="lp-reviews__grid">
          {TESTIMONIALS.map((t,i)=>(
            <div key={i} className="lp-review-card">
              <div className="lp-review-stars">★★★★★</div>
              <p className="lp-review-text">"{t.text}"</p>
              <div className="lp-review-author">
                <div className="lp-review-av" style={{background:t.color}}>{t.avatar}</div>
                <div><div className="lp-review-name">{t.name}</div><div className="lp-review-role">{t.role}</div></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <section className="lp-pricing" id="pricing">
        <div className="lp-section-head lp-section-head--light">
          <div className="lp-chip lp-chip--glass">Pricing</div>
          <h2 style={{color:"#f1f5f9"}}>Simple, honest pricing</h2>
          <p style={{color:"#64748b"}}>No hidden fees · Cancel anytime · 30-day money-back guarantee</p>
          <div className="lp-billing-toggle">
            <button className={`lp-billing-btn ${billing==="monthly"?"active":""}`} onClick={()=>setBilling("monthly")}>Monthly</button>
            <button className={`lp-billing-btn ${billing==="yearly"?"active":""}`} onClick={()=>setBilling("yearly")}>
              Yearly <span className="lp-billing-badge">Save up to 80%</span>
            </button>
          </div>
        </div>
        <div className="lp-plans">
          {PLANS[billing].map((p,i)=>(
            <div key={i} className={`lp-plan ${p.popular?"lp-plan--pop":""}`} style={{"--pc":p.color}}>
              {p.popular && <div className="lp-plan__badge" style={{background:p.color}}>Most Popular</div>}
              {p.save && <div className="lp-plan__save">{p.save}</div>}
              <div className="lp-plan__name">{p.name}</div>
              <div className="lp-plan__price">{p.price}<span className="lp-plan__per">{p.period}</span></div>
              <ul className="lp-plan__features">
                {p.features.map((f,j)=><li key={j}><span style={{color:p.color}}>✓</span>{f}</li>)}
              </ul>
              <button className="lp-plan__cta"
                style={p.popular?{background:`linear-gradient(135deg,${p.color},${p.color}cc)`}:{border:`2px solid ${p.color}`,color:p.color,background:"transparent"}}
                onClick={onGetStarted}>
                Get Started →
              </button>
            </div>
          ))}
        </div>
        <div className="lp-pricing__note">🔒 Secure checkout via Stripe · 30-day money-back guarantee · Cancel anytime</div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="lp-faq-sec" id="faq">
        <div className="lp-section-head">
          <div className="lp-chip">FAQ</div>
          <h2>Frequently asked questions</h2>
        </div>
        <div className="lp-faq-list">
          {FAQS.map((f,i)=><FaqItem key={i} q={f.q} a={f.a}/>)}
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="lp-final">
        <div className="lp-orb lp-orb--5"/><div className="lp-orb lp-orb--6"/>
        <div className="lp-final__inner">
          <h2 className="lp-final__h2">Start winning clients today</h2>
          <p className="lp-final__p">Join 2,400+ freelancers and agencies already using ClientFlow AI</p>
          <div className="lp-final__cta">
            <button className="lp-btn-primary lp-btn-primary--lg" onClick={onGetStarted}>🚀 Start Free — From $1/month</button>
            <button className="lp-btn-demo" onClick={onDemo}><span className="lp-demo-pulse"/>Try Live Demo</button>
          </div>
          <p className="lp-final__note">No credit card required for demo · 30-day money-back guarantee</p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer__inner">
          <div className="lp-footer__brand">
            <div className="lp-logo"><span className="lp-logo__mark">⚡</span><span className="lp-logo__name">ClientFlow<span className="lp-logo__ai"> AI</span></span></div>
            <p className="lp-footer__tagline">Complete client acquisition & project management for freelancers and agencies worldwide.</p>
            <div className="lp-footer__socials">
              {["𝕏","in","▶"].map((s,i)=><a key={i} href="#" className="lp-footer__social">{s}</a>)}
            </div>
          </div>
          {[
            {title:"Product",  links:[["Features","#features"],["Pricing","#pricing"],["Live Demo","#"],["Changelog","#"]]},
            {title:"Tools",    links:[["Lead Finder","#"],["AI Email Writer","#"],["CRM Pipeline","#"],["Invoice Creator","#"]]},
            {title:"Support",  links:[["Email Support","mailto:support@clientflow.ai"],["Documentation","#"],["Privacy Policy","#"],["Terms of Service","#"]]},
          ].map((col,i)=>(
            <div key={i} className="lp-footer__col">
              <div className="lp-footer__col-title">{col.title}</div>
              {col.links.map(([label,href],j)=><a key={j} href={href}>{label}</a>)}
            </div>
          ))}
        </div>
        <div className="lp-footer__bottom">
          <span>© 2025 ClientFlow AI. All rights reserved.</span>
          <span>Made for freelancers & agencies worldwide 🌍</span>
        </div>
      </footer>
    </div>
  );
}

// ── Auth Card ─────────────────────────────────────────────────────────────────
function AuthCard({ onAuth, defaultMode="login", onBack }) {
  const [mode, setMode]     = useState(defaultMode);
  const [email, setEmail]   = useState("");
  const [password, setPass] = useState("");
  const [name, setName]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [message, setMessage] = useState("");
  const [showPw, setShowPw] = useState(false);

  async function submit() {
    if (!email.trim()) { setError("Email is required."); return; }
    setLoading(true); setError(""); setMessage("");
    try {
      if (mode==="login") {
        if (!password) { setError("Password required."); setLoading(false); return; }
        const d = await signIn(email.trim(), password);
        if (d?.session) { onAuth(d.session, d.user); return; }
        setError("Login failed. Check credentials.");
      } else if (mode==="signup") {
        if (!password||password.length<6) { setError("Password must be 6+ characters."); setLoading(false); return; }
        const d = await signUp(email.trim(), password, name);
        if (d?.session) { onAuth(d.session, d.user); return; }
        setMessage("✅ Check your email to confirm, then sign in.");
        setMode("login");
      } else {
        await resetPassword(email.trim());
        setMessage("✅ Reset link sent. Check your inbox.");
      }
    } catch(e) {
      const m = e.message||"";
      if (m.includes("Email not confirmed")) setError("Please confirm your email first. Check inbox.");
      else if (m.includes("Invalid login credentials")) setError("Wrong email or password.");
      else if (m.includes("User already registered")) setError("Email already registered. Sign in instead.");
      else setError(m||"Something went wrong.");
    }
    setLoading(false);
  }

  return (
    <div className="lp-auth-bg">
      <div className="lp-orb lp-orb--1"/><div className="lp-orb lp-orb--2"/>
      <div className="lp-auth-card">
        {onBack && <button className="lp-auth-back" onClick={onBack}>← Back to home</button>}
        <div className="lp-auth-logo">
          <span>⚡</span>
          <div>
            <div className="lp-auth-logo-name">ClientFlow AI</div>
            <div className="lp-auth-logo-sub">Client acquisition on autopilot</div>
          </div>
        </div>
        <div className="lp-auth-tabs">
          <button className={`lp-auth-tab ${mode==="login"?"active":""}`} onClick={()=>{setMode("login");setError("");setMessage("");}}>Sign In</button>
          <button className={`lp-auth-tab ${mode==="signup"?"active":""}`} onClick={()=>{setMode("signup");setError("");setMessage("");}}>Sign Up</button>
        </div>
        {mode!=="reset" && <>
          <button className="lp-google" onClick={async()=>{try{await signInWithGoogle();}catch(e){setError("Google sign-in failed.")}}} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.5 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.5 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.3 35.5 26.8 36 24 36c-5.2 0-9.6-3.2-11.3-7.8l-6.5 5C9.6 39.5 16.3 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.9 2.4-2.5 4.5-4.5 5.9l6.2 5.2C42 35.7 44 30.3 44 24c0-1.3-.1-2.7-.4-3.9z"/>
            </svg>
            Continue with Google
          </button>
          <div className="lp-auth-divider"><span>or continue with email</span></div>
        </>}
        <div className="lp-auth-form">
          {mode==="signup" && <div className="lp-auth-field"><label>Full Name</label><input type="text" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/></div>}
          <div className="lp-auth-field"><label>Email</label><input type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
          {mode!=="reset" && <div className="lp-auth-field"><label>Password</label><div className="lp-auth-pw"><input type={showPw?"text":"password"} placeholder={mode==="signup"?"Min 6 characters":"Password"} value={password} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/><button type="button" onClick={()=>setShowPw(s=>!s)}>{showPw?"🙈":"👁"}</button></div></div>}
          {error   && <div className="lp-auth-err">❌ {error}</div>}
          {message && <div className="lp-auth-ok">{message}</div>}
          <button className="lp-auth-submit" onClick={submit} disabled={loading}>
            {loading?"⏳ Please wait…":mode==="login"?"Sign In →":mode==="signup"?"Create Free Account →":"Send Reset Link →"}
          </button>
          {mode==="login" && <button className="lp-auth-link" onClick={()=>{setMode("reset");setError("");setMessage("");}}>Forgot password?</button>}
          {mode==="reset" && <button className="lp-auth-link" onClick={()=>{setMode("login");setError("");setMessage("");}}>← Back to sign in</button>}
          {mode==="signup" && <p className="lp-auth-terms">By signing up you agree to our Terms of Service</p>}
        </div>
        <div className="lp-auth-proof">
          <div className="lp-auth-proof-faces">
            {["A","S","C","M"].map((l,i)=><div key={i} style={{background:`hsl(${i*90},60%,50%)`}}>{l}</div>)}
          </div>
          <span>Joined 2,400+ users · Start in 2 minutes</span>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage({ onAuth }) {
  const [view, setView] = useState("landing");
  if (view==="landing") return (
    <LandingPage
      onGetStarted={()=>setView("signup")}
      onSignIn={()=>setView("login")}
      onDemo={()=>onAuth(
        {access_token:"demo",user:{id:"demo",email:"demo@clientflow.ai",user_metadata:{full_name:"Demo User"}}},
        {id:"demo",email:"demo@clientflow.ai",user_metadata:{full_name:"Demo User"}}
      )}
    />
  );
  return <AuthCard onAuth={onAuth} defaultMode={view} onBack={()=>setView("landing")}/>;
}
