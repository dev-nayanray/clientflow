// src/Auth.jsx — Premium Animated SaaS Landing Page
import { useState, useEffect, useRef, useCallback } from "react";
import { signIn, signUp, signInWithGoogle, resetPassword } from "./supabase";

// ── Hooks ─────────────────────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function useTypewriter(words, speed = 80, pause = 2200) {
  const [displayed, setDisplayed] = useState("");
  const [wordIdx, setWordIdx]     = useState(0);
  const [charIdx, setCharIdx]     = useState(0);
  const [deleting, setDeleting]   = useState(false);

  useEffect(() => {
    const word = words[wordIdx % words.length];
    let timeout;
    if (!deleting && charIdx <= word.length) {
      timeout = setTimeout(() => {
        setDisplayed(word.slice(0, charIdx));
        setCharIdx(c => c + 1);
      }, charIdx === word.length ? pause : speed);
    } else if (deleting && charIdx >= 0) {
      timeout = setTimeout(() => {
        setDisplayed(word.slice(0, charIdx));
        setCharIdx(c => c - 1);
      }, speed / 2);
    }
    if (!deleting && charIdx > word.length) {
      setTimeout(() => setDeleting(true), pause);
    }
    if (deleting && charIdx < 0) {
      setDeleting(false);
      setWordIdx(i => i + 1);
      setCharIdx(0);
    }
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, wordIdx, words, speed, pause]);
  return displayed;
}

function useCounter(to, duration = 1800) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const start = performance.now();
      const tick = (now) => {
        const pct = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - pct, 3);
        setVal(Math.round(ease * to));
        if (pct < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to, duration]);
  return [ref, val];
}

// ── Particle Canvas ───────────────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const COLORS = ["#6366f1","#8b5cf6","#ec4899","#0ea5e9","#a78bfa"];
    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - .5) * .35,
      vy: (Math.random() - .5) * .35,
      r: Math.random() * 1.8 + .4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      opacity: Math.random() * .5 + .15,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(p.opacity * 255).toString(16).padStart(2,"0");
        ctx.fill();

        // Connect nearby particles
        particles.slice(i + 1).forEach(q => {
          const dx = p.x - q.x, dy = p.y - q.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = p.color + Math.round((1 - dist/130) * .18 * 255).toString(16).padStart(2,"0");
            ctx.lineWidth = .6;
            ctx.stroke();
          }
        });
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="plp-canvas"/>;
}

// ── Animated Section ──────────────────────────────────────────────────────────
function AnimSection({ children, className = "", delay = 0 }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} className={`anim-section ${inView ? "anim-in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// ── Tilt Card ─────────────────────────────────────────────────────────────────
function TiltCard({ children, className = "" }) {
  const ref = useRef(null);
  const onMove = useCallback((e) => {
    const el = ref.current; if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = (e.clientX - left - width  / 2) / (width  / 2);
    const y = (e.clientY - top  - height / 2) / (height / 2);
    el.style.transform = `perspective(800px) rotateY(${x*7}deg) rotateX(${-y*7}deg) scale3d(1.02,1.02,1.02)`;
  }, []);
  const onLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = "";
  }, []);
  return (
    <div ref={ref} className={`tilt-card ${className}`}
      onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </div>
  );
}

// ── Marquee ───────────────────────────────────────────────────────────────────
function Marquee({ items }) {
  const doubled = [...items, ...items];
  return (
    <div className="marquee-wrap">
      <div className="marquee-track">
        {doubled.map((item, i) => (
          <div key={i} className="marquee-item">
            <span className="marquee-icon">{item.icon}</span>
            <span className="marquee-text">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
function FaqItem({ q, a, idx }) {
  const [open, setOpen] = useState(false);
  return (
    <AnimSection delay={idx * 60}>
      <div className={`plp-faq-item ${open ? "open" : ""}`} onClick={() => setOpen(!open)}>
        <div className="plp-faq-q">
          <span>{q}</span>
          <div className="plp-faq-icon">{open ? "−" : "+"}</div>
        </div>
        <div className="plp-faq-a">{a}</div>
      </div>
    </AnimSection>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
//  PREMIUM LANDING PAGE
// ════════════════════════════════════════════════════════════════════════════════
function PremiumLanding({ onGetStarted, onSignIn, onDemo }) {
  const [scrollY, setScrollY]   = useState(0);
  const [billing, setBilling]   = useState("yearly");
  const [hoveredPlan, setHoveredPlan] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heroRef = useRef(null);

  const typeText = useTypewriter(
    ["Land More Clients.", "Scale Your Revenue.", "Close More Deals.", "Win Every Pitch."],
    75, 2400
  );

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    const onMouse  = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMouse, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("mousemove", onMouse); };
  }, []);

  // Stats counters
  const [r1, c1] = useCounter(2400);
  const [r2, c2] = useCounter(50000);
  const [r3, c3] = useCounter(210);
  const [r4, c4] = useCounter(99);

  const FEATURES = [
    { icon:"🎯", title:"Real Lead Finder",      color:"#6366f1",
      desc:"Hunter.io · Apollo.io · Google Places · CSV. Get 275M+ verified contacts.", tag:"Find" },
    { icon:"🤖", title:"AI Outreach Writer",     color:"#ec4899",
      desc:"Claude AI writes personalized cold emails and DMs for every lead automatically.", tag:"Write" },
    { icon:"📧", title:"Gmail Integration",      color:"#f59e0b",
      desc:"Send emails through your Gmail with a one-click approval flow before each send.", tag:"Send" },
    { icon:"👥", title:"CRM Pipeline",           color:"#22c55e",
      desc:"Kanban board from New → Won with reminders, activity logs and follow-ups.", tag:"Track" },
    { icon:"📁", title:"Portfolio Generator",    color:"#8b5cf6",
      desc:"Turn past projects into case studies, HTML pages, LinkedIn posts and outreach emails.", tag:"Showcase" },
    { icon:"🎯", title:"Freelance Proposals",    color:"#0ea5e9",
      desc:"Win Upwork & Fiverr jobs with AI proposals, gig listings and profile rewrites.", tag:"Pitch" },
    { icon:"🗂️", title:"Project Manager",        color:"#14b8a6",
      desc:"Tasks, milestones, invoices and time tracking for every client you close.", tag:"Deliver" },
    { icon:"📊", title:"Google Sheets Sync",     color:"#ef4444",
      desc:"All leads, workflows and client data synced to your Sheets automatically.", tag:"Sync" },
  ];

  const TOOLS = [
    { icon:"🎯", name:"Hunter.io  →  $49/mo" },
    { icon:"🚀", name:"Apollo.io  →  $49/mo" },
    { icon:"👥", name:"Close CRM  →  $29/mo" },
    { icon:"📅", name:"Calendly  →  $10/mo" },
    { icon:"📄", name:"Bonsai  →  $24/mo" },
    { icon:"✍️", name:"Copy.ai  →  $49/mo" },
    { icon:"📊", name:"Notion  →  $16/mo" },
    { icon:"🔔", name:"Mailchimp  →  $20/mo" },
  ];

  const TESTIMONIALS = [
    { name:"Arjun M.", role:"Full-Stack Dev · Top Rated Upwork", avatar:"A", color:"#6366f1",
      text:"Got 4 new clients in my first month. The AI proposal writer saves 3 hours/week. Replaced Hunter.io, Close CRM and Bonsai with this one tool." },
    { name:"Sarah C.", role:"Digital Agency Owner · London", avatar:"S", color:"#ec4899",
      text:"LinkedIn reply rate went from 4% to 23%. The CRM keeps everything organized — I never lose track of a prospect anymore." },
    { name:"Carlos R.", role:"SEO Consultant · Madrid", avatar:"C", color:"#22c55e",
      text:"Finally covers the full client acquisition workflow. From finding the lead to sending the invoice. At $1/month it's a complete no-brainer." },
    { name:"Priya T.", role:"Marketing Consultant · Singapore", avatar:"P", color:"#f59e0b",
      text:"The Upwork proposal generator got me 6 extra contracts in 30 days. Portfolio case study tool turned past work into real sales assets." },
    { name:"David L.", role:"Freelance Designer · Toronto", avatar:"D", color:"#0ea5e9",
      text:"The portfolio page generator is insane. I had a professional case study page live in 2 minutes — it's closing clients on autopilot." },
    { name:"Fatima H.", role:"B2B Agency · Dubai", avatar:"F", color:"#8b5cf6",
      text:"We use ClientFlow for the entire team. The project manager and invoicing alone saves us 8 hours a week in admin work." },
  ];

  const PLANS = {
    monthly: [
      { name:"Starter", price:"$1", period:"/mo", color:"#6366f1", popular:false,
        features:["Unlimited AI email writing","Real lead finder (All sources)","Full CRM + kanban board","Portfolio & case study generator","Project manager + invoicing","Gmail OAuth send integration","Cancel anytime"] },
      { name:"Growth",  price:"$3", period:"/mo", color:"#8b5cf6", popular:true,
        features:["Everything in Starter","Priority AI (faster responses)","Team workspace (3 seats)","White-label invoices","Advanced analytics dashboard","Priority email support"] },
      { name:"Agency",  price:"$9", period:"/mo", color:"#ec4899", popular:false,
        features:["Everything in Growth","Unlimited team seats","Client portal access","API access & webhooks","Custom integrations","Dedicated account manager"] },
    ],
    yearly: [
      { name:"Starter", price:"$10", period:"/yr", color:"#6366f1", popular:false,
        features:["All Starter features","Save $2 vs monthly","2 months free","Billed annually"] },
      { name:"Growth",  price:"$29", period:"/yr", color:"#8b5cf6", popular:true,
        features:["All Growth features","Save 19% vs monthly","Priority support","Billed annually"] },
      { name:"Lifetime",price:"$50", period:" once", color:"#f59e0b", popular:false,
        features:["Everything in Growth","Pay once, use forever","All future updates free","Commercial license","Never pay again"] },
    ],
  };

  const FAQS = [
    { q:"Is it really just $1/month?", a:"Yes — the Starter plan is $1/month with full access to all core features. No paywalls, no hidden fees. Cancel anytime from your billing portal." },
    { q:"Do I need my own API keys?", a:"You need an Anthropic API key for Claude AI features. Hunter.io, Apollo.io and Google Places all have generous free tiers that work well for most users." },
    { q:"How does the Gmail integration work?", a:"Connect via Google OAuth. Every email goes through an approval screen first — you review and approve before it sends. Your credentials stay on your device." },
    { q:"What makes this different from Apollo or Hunter alone?", a:"Those tools only find leads. ClientFlow connects finding → AI writing → Gmail sending → CRM tracking → proposals → project management → invoicing in one complete pipeline." },
    { q:"Can I try it before buying?", a:"Yes — click 'View Live Demo' to use the full app without creating an account. All 11 features are available in demo mode." },
    { q:"What happens when I cancel?", a:"Cancel anytime, no questions asked. Export all your data as CSV before you go. If you cancel mid-period, you keep access until the billing period ends." },
  ];

  const navScrolled = scrollY > 50;

  // Spotlight effect coords
  const spotX = mousePos.x;
  const spotY = mousePos.y;

  return (
    <div className="plp" style={{ "--spot-x": `${spotX}px`, "--spot-y": `${spotY}px` }}>
      {/* ── NAV ── */}
      <nav className={`plp-nav ${navScrolled ? "plp-nav--solid" : ""}`}>
        <div className="plp-nav__inner">
          <a className="plp-logo" href="#">
            <span className="plp-logo__bolt">⚡</span>
            <span className="plp-logo__name">ClientFlow<span className="plp-logo__ai">AI</span></span>
          </a>
          <div className="plp-nav__links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#reviews">Reviews</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="plp-nav__right">
            <button className="plp-nav__ghost" onClick={onSignIn}>Sign in</button>
            <button className="plp-nav__cta" onClick={onGetStarted}>
              Get started <span className="plp-nav__arr">→</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="plp-hero" ref={heroRef}>
        <ParticleCanvas />

        {/* Spotlight cursor glow */}
        <div className="plp-spotlight" style={{ left: spotX, top: spotY }}/>

        {/* Gradient orbs */}
        <div className="plp-orb plp-orb--a"/>
        <div className="plp-orb plp-orb--b"/>
        <div className="plp-orb plp-orb--c"/>

        {/* Grid overlay */}
        <div className="plp-grid"/>

        <div className="plp-hero__inner">
          {/* Badge */}
          <AnimSection>
            <div className="plp-hero__badge">
              <span className="plp-badge__pulse"/>
              <span>New — AI-Powered Client Acquisition</span>
              <span className="plp-badge__arrow">→</span>
            </div>
          </AnimSection>

          {/* Headline */}
          <AnimSection delay={100}>
            <h1 className="plp-hero__h1">
              <span className="plp-hero__h1-static">Your Business.</span>
              <br/>
              <span className="plp-hero__h1-type">
                {typeText}
                <span className="plp-cursor">|</span>
              </span>
            </h1>
          </AnimSection>

          {/* Sub */}
          <AnimSection delay={200}>
            <p className="plp-hero__p">
              Find real leads, write AI outreach, manage your pipeline, send proposals
              and invoice clients — all in one tool.{" "}
              <span className="plp-hero__highlight">Replaces $210/month of tools for just $1/month.</span>
            </p>
          </AnimSection>

          {/* CTAs */}
          <AnimSection delay={300}>
            <div className="plp-hero__ctas">
              <button className="plp-btn-glow" onClick={onGetStarted}>
                <span className="plp-btn-glow__shine"/>
                🚀 Start Free Today
              </button>
              <button className="plp-btn-glass" onClick={onDemo}>
                <span className="plp-live-dot"/>
                View Live Demo
              </button>
            </div>
          </AnimSection>

          {/* Social proof */}
          <AnimSection delay={400}>
            <div className="plp-hero__proof">
              <div className="plp-faces">
                {["A","S","C","M","R","P"].map((l,i)=>(
                  <div key={i} className="plp-face" style={{background:`hsl(${i*60+220},65%,58%)`}}>{l}</div>
                ))}
              </div>
              <div className="plp-proof__text">
                <span><strong>2,400+</strong> freelancers trust ClientFlow</span>
                <span className="plp-stars">★★★★★ 4.9/5</span>
              </div>
            </div>
          </AnimSection>

          {/* Animated App Mockup */}
          <AnimSection delay={200}>
            <div className="plp-mockup-wrap">
              <div className="plp-mockup-glow"/>
              <div className="plp-mockup">
                {/* Top bar */}
                <div className="plp-mk__bar">
                  <div className="plp-mk__dots">
                    <span className="plp-mk__dot plp-mk__dot--r"/>
                    <span className="plp-mk__dot plp-mk__dot--y"/>
                    <span className="plp-mk__dot plp-mk__dot--g"/>
                  </div>
                  <div className="plp-mk__url">
                    <span className="plp-mk__lock">🔒</span>
                    app.clientflow.ai
                  </div>
                  <div className="plp-mk__live">● Live</div>
                </div>
                {/* Body */}
                <div className="plp-mk__body">
                  {/* Sidebar */}
                  <div className="plp-mk__side">
                    <div className="plp-mk__brand">⚡ ClientFlow</div>
                    {[["📥","Real Leads"],["🚀","Workflow"],["👥","Pipeline"],["📁","Portfolio"],["🗂️","Projects"],["👑","Admin"]].map(([ic,t],i)=>(
                      <div key={i} className={`plp-mk__link ${i===1?"plp-mk__link--active":""}`}>
                        <span>{ic}</span><span>{t}</span>
                        {i===1&&<span className="plp-mk__link-dot"/>}
                      </div>
                    ))}
                  </div>
                  {/* Main */}
                  <div className="plp-mk__main">
                    <div className="plp-mk__header">
                      <div>
                        <div className="plp-mk__title">🚀 Workflow Running</div>
                        <div className="plp-mk__sub">E-commerce · United States · 5 leads loaded</div>
                      </div>
                      <div className="plp-mk__run">⏳ Running…</div>
                    </div>

                    {/* Pipeline stages */}
                    <div className="plp-mk__stages">
                      {[
                        ["✅","Lead Found","done"],
                        ["✅","Email Drafted","done"],
                        ["⏳","Follow-Up","active"],
                        ["⬜","Proposal","idle"],
                        ["⬜","Meeting","idle"],
                      ].map(([ic,lb,st],i)=>(
                        <div key={i} className={`plp-mk__stage plp-mk__stage--${st}`}>
                          <span>{ic}</span><span>{lb}</span>
                        </div>
                      ))}
                    </div>

                    {/* Terminal log */}
                    <div className="plp-mk__term">
                      <div className="plp-mk__term-title">● Activity Log</div>
                      <div className="plp-mk__line plp-mk__line--ok">[09:14:02] ✅ 5 verified leads found via Hunter.io</div>
                      <div className="plp-mk__line plp-mk__line--ok">[09:14:47] ✅ Personalized email drafted for Acme Store</div>
                      <div className="plp-mk__line plp-mk__line--run">[09:15:13] ⏳ Building 3-email follow-up sequence…</div>
                      <div className="plp-mk__line plp-mk__line--dim">[——————] ⬜ Generating proposal…</div>
                    </div>

                    {/* Lead list */}
                    <div className="plp-mk__leads">
                      {[
                        ["Acme Shopify Store","john@acme.com","✅ Verified","#22c55e"],
                        ["TechHub Solutions","sarah@tech.io","✅ Verified","#22c55e"],
                        ["BlueSky Commerce","m@bluesky.co","⏳ Enriching","#6366f1"],
                      ].map(([n,e,s,sc],i)=>(
                        <div key={i} className="plp-mk__lead">
                          <div className="plp-mk__lavatar" style={{background:`hsl(${i*120+220},60%,55%)`}}>
                            {n[0]}
                          </div>
                          <div className="plp-mk__linfo">
                            <div className="plp-mk__lname">{n}</div>
                            <div className="plp-mk__lemail">{e}</div>
                          </div>
                          <div className="plp-mk__lbadge" style={{color:sc}}>{s}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AnimSection>
        </div>
      </section>

      {/* ── MARQUEE TOOL STRIP ── */}
      <div className="plp-marquee-section">
        <div className="plp-marquee-label">Replaces all of these tools →</div>
        <Marquee items={TOOLS}/>
      </div>

      {/* ── STATS ── */}
      <section className="plp-stats">
        <div className="plp-stats__inner">
          {[
            { ref:r1, val:c1, suffix:"+", label:"Active Users",           color:"#6366f1" },
            { ref:r2, val:c2, suffix:"+", label:"Leads Generated",        color:"#ec4899" },
            { ref:r3, val:c3, suffix:"/mo", label:"Tools Value Replaced", color:"$", prefix:"$" },
            { ref:r4, val:c4, suffix:"%", label:"Uptime SLA",             color:"#22c55e" },
          ].map((s,i)=>(
            <AnimSection key={i} delay={i*80}>
              <div className="plp-stat" ref={s.ref}>
                <div className="plp-stat__num">
                  {s.prefix||""}{s.val.toLocaleString()}{s.suffix}
                </div>
                <div className="plp-stat__label">{s.label}</div>
                <div className="plp-stat__bar" style={{background:s.color}}/>
              </div>
            </AnimSection>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="plp-features" id="features">
        <AnimSection>
          <div className="plp-section-head">
            <div className="plp-chip">✦ Features</div>
            <h2 className="plp-section-h2">
              Everything you need.<br/>
              <span className="plp-grad-text">Nothing you don't.</span>
            </h2>
            <p className="plp-section-p">11 powerful tools in one platform — replace $210+/month of subscriptions</p>
          </div>
        </AnimSection>

        <div className="plp-features__grid">
          {FEATURES.map((f, i) => (
            <AnimSection key={i} delay={i * 60}>
              <TiltCard className="plp-feat-card" style={{"--fc": f.color}}>
                <div className="plp-feat-card__glow"/>
                <div className="plp-feat-card__tag">{f.tag}</div>
                <div className="plp-feat-card__icon">{f.icon}</div>
                <h3 className="plp-feat-card__title">{f.title}</h3>
                <p className="plp-feat-card__desc">{f.desc}</p>
                <div className="plp-feat-card__shine"/>
              </TiltCard>
            </AnimSection>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="plp-how">
        <div className="plp-how__bg">
          <div className="plp-orb plp-orb--d"/>
        </div>
        <AnimSection>
          <div className="plp-section-head plp-section-head--light">
            <div className="plp-chip plp-chip--glass">✦ How It Works</div>
            <h2 className="plp-section-h2 plp-section-h2--light">From zero to client<br/>in 5 steps</h2>
          </div>
        </AnimSection>
        <div className="plp-how__steps">
          {[
            { n:"01", icon:"🔍", t:"Find Real Leads",      d:"Search Hunter.io, Apollo, Google Places or import CSV. Get verified emails instantly." },
            { n:"02", icon:"🤖", t:"AI Writes Outreach",   d:"Claude AI personalizes cold emails, DMs and follow-up sequences for every lead." },
            { n:"03", icon:"📧", t:"Send via Gmail",        d:"Review in approval queue, then send directly through your connected Gmail account." },
            { n:"04", icon:"👥", t:"Track in CRM",          d:"Kanban pipeline: Contacted → Replied → Meeting Booked → Proposal Sent → Won." },
            { n:"05", icon:"💵", t:"Invoice & Deliver",     d:"Professional invoices, time tracking, project tasks and client delivery on time." },
          ].map((s, i) => (
            <AnimSection key={i} delay={i * 100}>
              <div className="plp-how__step">
                <div className="plp-how__step-num">{s.n}</div>
                <div className="plp-how__step-icon">{s.icon}</div>
                <h3 className="plp-how__step-title">{s.t}</h3>
                <p className="plp-how__step-desc">{s.d}</p>
                {i < 4 && <div className="plp-how__arrow">⟶</div>}
              </div>
            </AnimSection>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="plp-reviews" id="reviews">
        <AnimSection>
          <div className="plp-section-head">
            <div className="plp-chip">✦ Reviews</div>
            <h2 className="plp-section-h2">Loved by 2,400+ freelancers</h2>
            <div className="plp-review-rating">
              <span className="plp-stars-lg">★★★★★</span>
              <span className="plp-rating-text">4.9/5 · 200+ verified reviews</span>
            </div>
          </div>
        </AnimSection>
        <div className="plp-reviews__grid">
          {TESTIMONIALS.map((t, i) => (
            <AnimSection key={i} delay={i * 70}>
              <TiltCard className="plp-review-card">
                <div className="plp-review-card__top">
                  <div className="plp-review-avatar" style={{ background: t.color }}>{t.avatar}</div>
                  <div>
                    <div className="plp-review-name">{t.name}</div>
                    <div className="plp-review-role">{t.role}</div>
                  </div>
                  <div className="plp-review-stars-sm">★★★★★</div>
                </div>
                <p className="plp-review-text">"{t.text}"</p>
                <div className="plp-review-card__shine"/>
              </TiltCard>
            </AnimSection>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="plp-pricing" id="pricing">
        <div className="plp-orb plp-orb--e"/>
        <AnimSection>
          <div className="plp-section-head plp-section-head--light">
            <div className="plp-chip plp-chip--glass">✦ Pricing</div>
            <h2 className="plp-section-h2 plp-section-h2--light">Simple, honest pricing</h2>
            <p className="plp-section-p plp-section-p--dim">No hidden fees · Cancel anytime · 30-day money-back guarantee</p>
            <div className="plp-billing-toggle">
              <button className={`plp-billing-btn ${billing==="monthly"?"active":""}`} onClick={()=>setBilling("monthly")}>Monthly</button>
              <button className={`plp-billing-btn ${billing==="yearly"?"active":""}`} onClick={()=>setBilling("yearly")}>
                Yearly <span className="plp-billing-save">Save 80%</span>
              </button>
            </div>
          </div>
        </AnimSection>
        <div className="plp-plans">
          {PLANS[billing].map((p, i) => (
            <AnimSection key={i} delay={i * 80}>
              <div
                className={`plp-plan ${p.popular?"plp-plan--pop":""} ${hoveredPlan===i?"plp-plan--hov":""}`}
                style={{"--pc": p.color}}
                onMouseEnter={()=>setHoveredPlan(i)}
                onMouseLeave={()=>setHoveredPlan(null)}>
                <div className="plp-plan__glow"/>
                {p.popular && <div className="plp-plan__badge">⚡ Most Popular</div>}
                <div className="plp-plan__name">{p.name}</div>
                <div className="plp-plan__price">
                  {p.price}
                  <span className="plp-plan__per">{p.period}</span>
                </div>
                <ul className="plp-plan__feats">
                  {p.features.map((f, j) => (
                    <li key={j}>
                      <span className="plp-plan__check" style={{color:p.color}}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className="plp-plan__cta"
                  style={p.popular
                    ? { background:`linear-gradient(135deg,${p.color},${p.color}cc)`, color:"#fff" }
                    : { border:`1.5px solid ${p.color}44`, color:p.color, background:"transparent" }
                  }
                  onClick={onGetStarted}>
                  <span className="plp-plan__cta-shine"/>
                  Get started →
                </button>
              </div>
            </AnimSection>
          ))}
        </div>
        <AnimSection>
          <div className="plp-pricing__note">
            🔒 Secure checkout via Stripe &nbsp;·&nbsp; 30-day money-back guarantee &nbsp;·&nbsp; Cancel anytime
          </div>
        </AnimSection>
      </section>

      {/* ── FAQ ── */}
      <section className="plp-faq" id="faq">
        <AnimSection>
          <div className="plp-section-head">
            <div className="plp-chip">✦ FAQ</div>
            <h2 className="plp-section-h2">Frequently asked questions</h2>
          </div>
        </AnimSection>
        <div className="plp-faq__list">
          {FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} idx={i}/>)}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="plp-final">
        <div className="plp-orb plp-orb--f"/>
        <div className="plp-orb plp-orb--g"/>
        <AnimSection>
          <div className="plp-final__inner">
            <div className="plp-final__badge">✦ Get started today</div>
            <h2 className="plp-final__h2">
              Start winning clients<br/>
              <span className="plp-grad-text">on autopilot.</span>
            </h2>
            <p className="plp-final__p">Join 2,400+ freelancers and agencies already using ClientFlow AI</p>
            <div className="plp-final__ctas">
              <button className="plp-btn-glow plp-btn-glow--lg" onClick={onGetStarted}>
                <span className="plp-btn-glow__shine"/>
                🚀 Start Free — From $1/month
              </button>
              <button className="plp-btn-glass" onClick={onDemo}>
                <span className="plp-live-dot"/>
                View Live Demo
              </button>
            </div>
            <p className="plp-final__note">No credit card required · 30-day money-back guarantee</p>
          </div>
        </AnimSection>
      </section>

      {/* ── FOOTER ── */}
      <footer className="plp-footer">
        <div className="plp-footer__inner">
          <div className="plp-footer__brand">
            <a className="plp-logo" href="#">
              <span className="plp-logo__bolt">⚡</span>
              <span className="plp-logo__name" style={{color:"#f1f5f9"}}>ClientFlow<span className="plp-logo__ai">AI</span></span>
            </a>
            <p className="plp-footer__tagline">Complete client acquisition & project management for freelancers and agencies worldwide.</p>
            <div className="plp-footer__socials">
              {["𝕏","in","▶"].map((s,i)=>(
                <a key={i} href="#" className="plp-footer__social">{s}</a>
              ))}
            </div>
          </div>
          {[
            { title:"Product",  links:[["Features","#features"],["Pricing","#pricing"],["Live Demo","#"],["Changelog","#"]] },
            { title:"Tools",    links:[["Lead Finder","#"],["AI Email","#"],["CRM Pipeline","#"],["Invoice Creator","#"]] },
            { title:"Company",  links:[["About","#"],["Blog","#"],["Privacy","#"],["Terms","#"]] },
            { title:"Support",  links:[["Email Support","mailto:support@clientflow.ai"],["Documentation","#"],["Status","#"],["Community","#"]] },
          ].map((col,i)=>(
            <div key={i} className="plp-footer__col">
              <div className="plp-footer__col-title">{col.title}</div>
              {col.links.map(([label,href],j)=>(
                <a key={j} href={href} className="plp-footer__link">{label}</a>
              ))}
            </div>
          ))}
        </div>
        <div className="plp-footer__bottom">
          <span>© 2025 ClientFlow AI. All rights reserved.</span>
          <span>Made with ❤️ for freelancers & agencies worldwide 🌍</span>
        </div>
      </footer>
    </div>
  );
}

// ── Auth Card ─────────────────────────────────────────────────────────────────
function AuthCard({ onAuth, defaultMode = "login", onBack }) {
  const [mode, setMode]       = useState(defaultMode);
  const [email, setEmail]     = useState("");
  const [password, setPass]   = useState("");
  const [name, setName]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [message, setMessage] = useState("");
  const [showPw, setShowPw]   = useState(false);

  async function submit() {
    if (!email.trim()) { setError("Email is required."); return; }
    setLoading(true); setError(""); setMessage("");
    try {
      if (mode === "login") {
        if (!password) { setError("Password required."); setLoading(false); return; }
        const d = await signIn(email.trim(), password);
        if (d?.session) { onAuth(d.session, d.user); return; }
        setError("Login failed. Check your credentials.");
      } else if (mode === "signup") {
        if (!password || password.length < 6) { setError("Password must be 6+ characters."); setLoading(false); return; }
        const d = await signUp(email.trim(), password, name);
        if (d?.session) { onAuth(d.session, d.user); return; }
        setMessage("✅ Check your email to confirm your account, then sign in.");
        setMode("login");
      } else {
        await resetPassword(email.trim());
        setMessage("✅ Reset link sent. Check your inbox.");
      }
    } catch(e) {
      const m = e.message || "";
      if (m.includes("Email not confirmed")) setError("Please confirm your email first. Check your inbox.");
      else if (m.includes("Invalid login credentials")) setError("Wrong email or password. Try again.");
      else if (m.includes("User already registered")) setError("Email already registered. Sign in instead.");
      else setError(m || "Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="plp-auth-bg">
      <div className="plp-orb plp-orb--a"/>
      <div className="plp-orb plp-orb--b"/>
      <ParticleCanvas/>
      <div className="plp-auth-card">
        {onBack && (
          <button className="plp-auth-back" onClick={onBack}>
            ← Back to home
          </button>
        )}
        <div className="plp-auth-logo">
          <span>⚡</span>
          <div>
            <div className="plp-auth-name">ClientFlow AI</div>
            <div className="plp-auth-sub">Client acquisition on autopilot</div>
          </div>
        </div>
        <div className="plp-auth-tabs">
          <button className={`plp-auth-tab ${mode==="login"?"active":""}`} onClick={()=>{setMode("login");setError("");setMessage("");}}>Sign In</button>
          <button className={`plp-auth-tab ${mode==="signup"?"active":""}`} onClick={()=>{setMode("signup");setError("");setMessage("");}}>Sign Up</button>
        </div>
        {mode !== "reset" && (
          <>
            <button className="plp-google-btn" onClick={async()=>{try{await signInWithGoogle();}catch(e){setError("Google sign-in failed. Check OAuth settings.");}}} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.5 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.5 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.3 35.5 26.8 36 24 36c-5.2 0-9.6-3.2-11.3-7.8l-6.5 5C9.6 39.5 16.3 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.9 2.4-2.5 4.5-4.5 5.9l6.2 5.2C42 35.7 44 30.3 44 24c0-1.3-.1-2.7-.4-3.9z"/>
              </svg>
              Continue with Google
            </button>
            <div className="plp-divider"><span>or</span></div>
          </>
        )}
        <div className="plp-auth-form">
          {mode==="signup" && (
            <div className="plp-auth-field">
              <label>Full Name</label>
              <input type="text" placeholder="Your name" value={name}
                onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
            </div>
          )}
          <div className="plp-auth-field">
            <label>Email Address</label>
            <input type="email" placeholder="you@example.com" value={email}
              onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
          </div>
          {mode!=="reset" && (
            <div className="plp-auth-field">
              <label>Password</label>
              <div className="plp-pw-wrap">
                <input type={showPw?"text":"password"}
                  placeholder={mode==="signup"?"Min 6 characters":"Your password"}
                  value={password} onChange={e=>setPass(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&submit()}/>
                <button type="button" className="plp-pw-eye" onClick={()=>setShowPw(s=>!s)}>
                  {showPw?"🙈":"👁"}
                </button>
              </div>
            </div>
          )}
          {error   && <div className="plp-auth-err">❌ {error}</div>}
          {message && <div className="plp-auth-ok">✅ {message}</div>}
          <button className="plp-auth-submit" onClick={submit} disabled={loading}>
            {loading ? "⏳ Please wait…"
              : mode==="login"   ? "Sign In →"
              : mode==="signup"  ? "Create Free Account →"
              : "Send Reset Link →"}
          </button>
          {mode==="login" && (
            <button className="plp-auth-link" onClick={()=>{setMode("reset");setError("");setMessage("");}}>
              Forgot password?
            </button>
          )}
          {mode==="reset" && (
            <button className="plp-auth-link" onClick={()=>{setMode("login");setError("");setMessage("");}}>
              ← Back to sign in
            </button>
          )}
          {mode==="signup" && (
            <p className="plp-auth-terms">By creating an account you agree to our Terms of Service</p>
          )}
        </div>
        <div className="plp-auth-proof">
          <div className="plp-auth-faces">
            {["A","S","C","M"].map((l,i)=>(
              <div key={i} style={{background:`hsl(${i*90+220},60%,55%)`}}>{l}</div>
            ))}
          </div>
          <span>Joined by 2,400+ users · Start in 2 minutes</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function AuthPage({ onAuth }) {
  const [view, setView] = useState("landing");

  if (view === "landing") {
    return (
      <PremiumLanding
        onGetStarted={() => setView("signup")}
        onSignIn={() => setView("login")}
        onDemo={() => onAuth(
          { access_token:"demo", user:{ id:"demo", email:"demo@clientflow.ai", user_metadata:{ full_name:"Demo User" } } },
          { id:"demo", email:"demo@clientflow.ai", user_metadata:{ full_name:"Demo User" } }
        )}
      />
    );
  }
  return <AuthCard onAuth={onAuth} defaultMode={view} onBack={() => setView("landing")}/>;
}
