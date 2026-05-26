// ── REAL LEAD FINDER MODULE ───────────────────────────────────────────────────
// Replaces fake AI-generated leads with REAL business data from:
// 1. CSV Import (paste from LinkedIn Sales Navigator / Apollo export)
// 2. Hunter.io API (find real verified emails by domain/company)
// 3. Apollo.io API (search real companies + contacts)
// 4. Google Places API (local businesses: gyms, restaurants, clinics)
// 5. AI-enrichment: website research + pain point detection per real lead

export const REAL_LEAD_SOURCES = [
  { key: "csv",     icon: "📋", name: "CSV / Paste Import",   desc: "Paste leads from LinkedIn, Apollo, or any spreadsheet" },
  { key: "hunter",  icon: "🎯", name: "Hunter.io",            desc: "Find verified emails by company name or domain" },
  { key: "apollo",  icon: "🚀", name: "Apollo.io",            desc: "Search 275M+ real contacts by niche, title, country" },
  { key: "places",  icon: "📍", name: "Google Places",        desc: "Find local businesses: restaurants, gyms, clinics, salons" },
  { key: "ai",      icon: "🤖", name: "AI Research (Demo)",   desc: "AI generates sample leads — use as a reference only" },
];

// Hunter.io — domain search (finds emails on a company website)
export async function hunterDomainSearch(apiKey, domain) {
  const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${apiKey}&limit=5`;
  const res = await fetch(url);
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e?.errors?.[0]?.details || `Hunter error ${res.status}`); }
  const data = await res.json();
  return (data.data?.emails || []).map(e => ({
    name: data.data.organization || domain,
    contact: [e.first_name, e.last_name].filter(Boolean).join(" ") || "Unknown",
    email: e.value,
    website: `https://${domain}`,
    size: "unknown",
    pain_point: "To be researched",
    platform: "Hunter.io",
    confidence: e.confidence,
    position: e.position || "",
    verified: e.verification?.status === "valid",
  }));
}

// Hunter.io — company search by name
export async function hunterCompanySearch(apiKey, company, domain = "") {
  const param = domain ? `domain=${encodeURIComponent(domain)}` : `company=${encodeURIComponent(company)}`;
  const url = `https://api.hunter.io/v2/domain-search?${param}&api_key=${apiKey}&limit=10`;
  const res = await fetch(url);
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e?.errors?.[0]?.details || `Hunter error ${res.status}`); }
  const data = await res.json();
  return (data.data?.emails || []).map(e => ({
    name: data.data.organization || company,
    contact: [e.first_name, e.last_name].filter(Boolean).join(" ") || "Contact",
    email: e.value,
    website: data.data.domain ? `https://${data.data.domain}` : "",
    size: "unknown",
    pain_point: "To be researched",
    platform: "Hunter.io",
    confidence: e.confidence,
    position: e.position || "",
    verified: e.verification?.status === "valid",
  }));
}

// Apollo.io — people search
export async function apolloSearch(apiKey, { niche, country, title = "owner,founder,ceo,director,manager", page = 1 }) {
  const url = "https://api.apollo.io/v1/mixed_people/search";
  const body = {
    api_key: apiKey,
    q_keywords: niche,
    person_titles: title.split(",").map(t => t.trim()),
    person_locations: [country],
    page,
    per_page: 10,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
    body: JSON.stringify(body),
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e?.message || `Apollo error ${res.status}`); }
  const data = await res.json();
  return (data.people || []).map(p => ({
    name: p.organization?.name || p.employment_history?.[0]?.organization_name || "Unknown Company",
    contact: p.name || "Unknown",
    email: p.email || "",
    website: p.organization?.website_url || "",
    size: p.organization?.estimated_num_employees
      ? p.organization.estimated_num_employees < 50 ? "small"
        : p.organization.estimated_num_employees < 200 ? "medium" : "large"
      : "unknown",
    pain_point: "To be researched",
    platform: "Apollo.io",
    title: p.title || "",
    linkedin: p.linkedin_url || "",
    city: p.city || "",
    country: p.country || country,
    verified: !!p.email,
  }));
}

// Google Places — local business search
export async function googlePlacesSearch(apiKey, { keyword, location, radius = 10000 }) {
  // Note: Google Places API requires server-side or Maps JS SDK for browser.
  // We use the Text Search endpoint via a CORS-friendly approach.
  const query = encodeURIComponent(`${keyword} in ${location}`);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&radius=${radius}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Places error ${res.status}`);
  const data = await res.json();
  if (data.status === "REQUEST_DENIED") throw new Error(data.error_message || "Places API key invalid or not enabled");
  return (data.results || []).slice(0, 10).map(p => ({
    name: p.name,
    contact: "Owner / Manager",
    email: "",  // Places doesn't provide email — use Hunter.io to find
    website: p.website || "",
    address: p.formatted_address || "",
    phone: p.formatted_phone_number || "",
    rating: p.rating || null,
    size: "small",
    pain_point: "To be researched",
    platform: "Google Places",
    place_id: p.place_id,
    verified: true,
  }));
}

// Parse CSV / pasted text into lead objects
export function parseCSVLeads(raw) {
  const lines = raw.trim().split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  
  // Auto-detect delimiter
  const delim = lines[0].includes("\t") ? "\t" : ",";
  
  // Parse header
  const headers = lines[0].split(delim).map(h => h.replace(/"/g, "").trim().toLowerCase());
  
  const fieldMap = {
    name:      ["company", "business name", "company name", "business", "organization", "name"],
    contact:   ["contact", "full name", "first name", "person", "owner", "contact name", "contact person"],
    email:     ["email", "email address", "e-mail", "work email"],
    website:   ["website", "url", "domain", "company url", "web"],
    phone:     ["phone", "phone number", "mobile", "tel"],
    linkedin:  ["linkedin", "linkedin url", "profile"],
    title:     ["title", "job title", "position", "role"],
    size:      ["size", "employees", "company size", "headcount"],
    pain_point:["pain point", "notes", "challenge", "problem"],
  };

  function findCol(field) {
    for (const alias of fieldMap[field]) {
      const idx = headers.findIndex(h => h.includes(alias));
      if (idx >= 0) return idx;
    }
    return -1;
  }

  const cols = {};
  Object.keys(fieldMap).forEach(f => { cols[f] = findCol(f); });

  return lines.slice(1).map(line => {
    const cells = line.split(delim).map(c => c.replace(/"/g, "").trim());
    const get = (field) => cols[field] >= 0 ? (cells[cols[field]] || "") : "";
    return {
      name: get("name") || "Unknown Company",
      contact: get("contact") || "Unknown",
      email: get("email"),
      website: get("website"),
      phone: get("phone"),
      linkedin: get("linkedin"),
      title: get("title"),
      size: get("size") || "unknown",
      pain_point: get("pain_point") || "To be researched",
      platform: "CSV Import",
      verified: !!get("email"),
    };
  }).filter(l => l.name !== "Unknown Company" || l.email);
}
