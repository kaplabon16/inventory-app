// backend/src/utils/sfClient.js
import fetch from 'node-fetch';

const {
  SF_LOGIN_URL = 'https://login.salesforce.com',
  SF_CLIENT_ID,
  SF_CLIENT_SECRET,
  SF_REFRESH_TOKEN,
  SF_INSTANCE_URL, // optional; will be learned from refresh response if not set
} = process.env;

let cached = {
  access_token: null,
  expires_at: 0,
  instance_url: SF_INSTANCE_URL || null,
};

async function refreshAccessToken() {
  const url = `${SF_LOGIN_URL.replace(/\/$/, '')}/services/oauth2/token`;
  const form = new URLSearchParams();
  form.set('grant_type', 'refresh_token');
  form.set('client_id', SF_CLIENT_ID || '');
  form.set('client_secret', SF_CLIENT_SECRET || '');
  form.set('refresh_token', SF_REFRESH_TOKEN || '');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Salesforce token refresh failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const now = Math.floor(Date.now() / 1000);
  const ttl = Number(data.expires_in || 3600);

  cached.access_token = data.access_token;
  cached.expires_at = now + Math.max(300, ttl - 60); // buffer before expiry
  cached.instance_url = data.instance_url || cached.instance_url;
  return cached;
}

async function getAccessToken() {
  if (!SF_CLIENT_ID || !SF_CLIENT_SECRET || !SF_REFRESH_TOKEN) {
    throw new Error(
      'Missing Salesforce env vars: SF_CLIENT_ID, SF_CLIENT_SECRET, SF_REFRESH_TOKEN'
    );
  }
  if (!cached.access_token || Math.floor(Date.now() / 1000) >= cached.expires_at) {
    await refreshAccessToken();
  }
  if (!cached.instance_url) {
    throw new Error(
      'Salesforce instance URL unknown. Ensure your refresh flow returned instance_url or set SF_INSTANCE_URL.'
    );
  }
  return cached;
}

/**
 * Minimal helper to call Salesforce REST.
 * Example: sfRequest('/sobjects/Account', { method: 'POST', body: { Name: 'Acme' } })
 */
export async function sfRequest(path, { method = 'GET', headers = {}, body } = {}) {
  const { access_token, instance_url } = await getAccessToken();
  const base = `${instance_url.replace(/\/$/, '')}/services/data/v59.0`;

  const url = path.startsWith('http')
    ? path
    : `${base}${path.startsWith('/') ? '' : '/'}${path}`;

  const h = {
    Authorization: `Bearer ${access_token}`,
    'Content-Type': 'application/json',
    ...headers,
  };

  const opts = { method, headers: h };
  if (body !== undefined) {
    opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SF request failed ${res.status}: ${text}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export default { sfRequest };
