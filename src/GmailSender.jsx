// ── GMAIL SEND MODULE ─────────────────────────────────────────────────────────
// Real Gmail sending via Google OAuth2 + Gmail API
// Flow: User clicks "Send with Approval" → Preview modal → Confirm → Sent

const GMAIL_SCOPES = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly";

// ── OAuth Token Management ────────────────────────────────────────────────────
let _gmailToken = null;

export function getGmailToken() { return _gmailToken; }
export function setGmailToken(t) { _gmailToken = t; }
export function clearGmailToken() { _gmailToken = null; }

export async function initGmailAuth(clientId) {
  return new Promise((resolve, reject) => {
    if (!clientId) { reject(new Error("Google Client ID required. Add it in ⚙️ Setup.")); return; }
    if (!window.google?.accounts?.oauth2) { reject(new Error("Google Identity Services not loaded. Refresh the page.")); return; }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GMAIL_SCOPES,
      callback: (resp) => {
        if (resp.error) { reject(new Error(resp.error_description || resp.error)); return; }
        _gmailToken = resp.access_token;
        resolve(resp.access_token);
      },
    });
    client.requestAccessToken();
  });
}

export async function getGmailProfile(token) {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Could not fetch Gmail profile");
  return res.json(); // { emailAddress, messagesTotal, threadsTotal }
}

// ── Email Builder ─────────────────────────────────────────────────────────────
function buildRFC822(from, to, subject, body) {
  const email = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    body,
  ].join("\r\n");
  return btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ── Gmail API Send ────────────────────────────────────────────────────────────
export async function gmailSend(token, { from, to, subject, body, threadId }) {
  if (!token) throw new Error("Not authenticated with Gmail. Click 'Connect Gmail' first.");
  if (!to || !to.includes("@")) throw new Error("Invalid recipient email address.");

  const raw = buildRFC822(from, to, subject, body);
  const payload = { raw };
  if (threadId) payload.threadId = threadId; // for replies

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || `Gmail error ${res.status}`;
    if (res.status === 401) throw new Error("Gmail session expired. Reconnect Gmail.");
    throw new Error(msg);
  }
  return res.json(); // { id, threadId, labelIds }
}

// ── List Recent Sent ──────────────────────────────────────────────────────────
export async function gmailListSent(token, maxResults = 20) {
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=SENT&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Gmail list error ${res.status}`);
  const data = await res.json();
  return data.messages || [];
}

export async function gmailGetMessage(token, id) {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=To&metadataHeaders=Date`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const headers = data.payload?.headers || [];
  const get = (name) => headers.find(h => h.name === name)?.value || "";
  return { id: data.id, subject: get("Subject"), to: get("To"), date: get("Date"), snippet: data.snippet };
}

// ── Parse subject/body from AI-generated email text ──────────────────────────
export function parseEmailText(raw) {
  const lines = raw.trim().split("\n");
  let subject = "";
  let bodyStart = 0;

  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    const line = lines[i].trim();
    if (/^subject[:\s]/i.test(line)) {
      subject = line.replace(/^subject[:\s]*/i, "").trim();
      bodyStart = i + 1;
      // skip blank line after subject
      while (bodyStart < lines.length && !lines[bodyStart].trim()) bodyStart++;
      break;
    }
  }

  if (!subject) {
    subject = "Following up on a quick opportunity";
    bodyStart = 0;
  }

  const body = lines.slice(bodyStart).join("\n").trim();
  return { subject, body };
}
