import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const LOGIN_URL   = (process.env.SF_LOGIN_URL || "https://login.salesforce.com").replace(/\/$/,"");
const CLIENT_ID   = process.env.SF_CLIENT_ID || "";
const CLIENT_SECRET = process.env.SF_CLIENT_SECRET || ""; // optional if your Connected App requires it
const PORT        = Number(process.env.SF_LOCAL_PORT || 5174);
const REDIRECT_URI= process.env.SF_REDIRECT || `http://localhost:${PORT}/callback`;


if (!CLIENT_ID) {
  console.error("❌ Set SF_CLIENT_ID env first.");
  process.exit(1);
}

const b64url = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const codeVerifier = b64url(crypto.randomBytes(48));
const codeChallenge = b64url(crypto.createHash("sha256").update(codeVerifier).digest());
const state = crypto.randomBytes(16).toString("hex");


const params = new URLSearchParams({
  response_type: "code",
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  scope: "api refresh_token offline_access",
  prompt: "consent",
  state,
  code_challenge: codeChallenge,
  code_challenge_method: "S256",
});
const authUrl = `${LOGIN_URL}/services/oauth2/authorize?${params.toString()}`;

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname !== "/callback") {
      res.writeHead(200, { "content-type": "text/plain" });
      return void res.end("OK");
    }

    const code = url.searchParams.get("code");
    const gotState = url.searchParams.get("state");
    if (!code || !gotState || gotState !== state) {
      res.writeHead(400, { "content-type": "text/plain" });
      return void res.end("Missing/invalid code or state");
    }

   
    const tokenUrl = `${LOGIN_URL}/services/oauth2/token`;
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    });
    if (CLIENT_SECRET) body.set("client_secret", CLIENT_SECRET);

    const r = await fetch(tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });

    const text = await r.text();
    if (!r.ok) {
      console.error("❌ Token exchange failed:", r.status, text);
      res.writeHead(500, { "content-type": "text/plain" });
      res.end("Token exchange failed; check server logs.");
      server.close();
      return;
    }

    const json = JSON.parse(text);

    // save demo file locally (you can paste refresh_token into your env/railway)
    const outPath = path.resolve("sf_tokens.json");
    fs.writeFileSync(
      outPath,
      JSON.stringify({ savedAt: new Date().toISOString(), ...json }, null, 2),
      "utf8"
    );

    console.log("\n✅ SUCCESS! Tokens received.\n");
    console.log("access_token:", (json.access_token || "").slice(0, 24) + "…");
    console.log("instance_url:", json.instance_url);
    console.log("refresh_token:", json.refresh_token ? "(present)" : "(MISSING — see notes below)");
    console.log(`\nSaved full response to: ${outPath}`);
    console.log("\n➡ Paste refresh token into your .env/hosting as SF_REFRESH_TOKEN\n");

    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(`<h2>Salesforce connected</h2>
<p>Tokens saved to <code>sf_tokens.json</code> on your machine.</p>
<p>You can close this tab.</p>`);

    server.close();
    setTimeout(() => process.exit(0), 300);
  } catch (e) {
    console.error("Server error:", e);
    try {
      res.writeHead(500, { "content-type": "text/plain" });
      res.end("Server error");
    } catch {}
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log("-----");
  console.log("PKCE local helper ready.");
  console.log("1) Ensure your Connected App has this callback URL:");
  console.log("   ", REDIRECT_URI);
  console.log("2) Open this in a browser, login, and Approve:");
  console.log("   ", authUrl);
  console.log("--");
});
