import bcrypt from 'bcryptjs';

/**
 * Cloudflare Worker Authentication & Cryptography Service
 * Utilizes standard Web Crypto APIs for ultra-fast, zero-overhead execution on Edge.
 */

// Helper: base64url encode/decode
function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

/**
 * Generate HMAC-SHA256 JWT Token using Web Crypto
 */
export async function signJwt(payload: any, secret: string, expiresInHours = 168): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInHours * 3600;
  const fullPayload = { ...payload, exp, iat: Math.floor(Date.now() / 1000) };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret || 'fitai_default_secret_key_change_in_cf'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const encodedSignature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));

  return `${data}.${encodedSignature}`;
}

/**
 * Verify HMAC-SHA256 JWT Token
 */
export async function verifyJwt(token: string, secret: string): Promise<{ isValid: boolean; payload?: any }> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { isValid: false };

    const [headerB64, payloadB64, signatureB64] = parts;
    const data = `${headerB64}.${payloadB64}`;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret || 'fitai_default_secret_key_change_in_cf'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBytes = Uint8Array.from(base64UrlDecode(signatureB64), (c) => c.charCodeAt(0));
    const isSigValid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(data));
    if (!isSigValid) return { isValid: false };

    const payload = JSON.parse(base64UrlDecode(payloadB64));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return { isValid: false }; // Expired
    }

    return { isValid: true, payload };
  } catch {
    return { isValid: false };
  }
}

/**
 * Hash password securely using bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compare password against stored hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/**
 * Validates Telegram Mini App initData using Web Crypto HMAC-SHA256
 */
export async function validateTelegramInitData(
  initDataString: string,
  botToken?: string
): Promise<{ isValid: boolean; userData?: any }> {
  if (!initDataString) {
    return { isValid: false };
  }

  let extractedUserData: any = null;
  try {
    const urlParams = new URLSearchParams(initDataString);
    const userRaw = urlParams.get('user');
    if (userRaw) extractedUserData = JSON.parse(userRaw);
  } catch {}

  if (!extractedUserData) {
    try {
      const parts = initDataString.split('&');
      for (const part of parts) {
        const [k, ...vParts] = part.split('=');
        if (decodeURIComponent(k) === 'user') {
          extractedUserData = JSON.parse(decodeURIComponent(vParts.join('=')));
          break;
        }
      }
    } catch {}
  }

  // If testing without bot token configured in CF environment
  if (!botToken || botToken === 'MY_TELEGRAM_BOT_TOKEN') {
    return { isValid: true, userData: extractedUserData };
  }

  try {
    const parts = initDataString.split('&');
    let hash = '';
    const dataCheckArr: string[] = [];

    for (const part of parts) {
      const [k, ...vParts] = part.split('=');
      const key = decodeURIComponent(k);
      const val = decodeURIComponent(vParts.join('='));
      if (key === 'hash') {
        hash = val;
      } else {
        dataCheckArr.push(`${key}=${val}`);
      }
    }

    if (!hash) return { isValid: false, userData: extractedUserData };

    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join('\n');

    const enc = new TextEncoder();
    const webAppDataKey = await crypto.subtle.importKey(
      'raw',
      enc.encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const secretKeyBytes = await crypto.subtle.sign('HMAC', webAppDataKey, enc.encode(botToken));

    const finalKey = await crypto.subtle.importKey(
      'raw',
      secretKeyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const calculatedSig = await crypto.subtle.sign('HMAC', finalKey, enc.encode(dataCheckString));
    const calculatedHash = Array.from(new Uint8Array(calculatedSig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return { isValid: calculatedHash === hash, userData: extractedUserData };
  } catch (err) {
    console.error('Telegram initData Web Crypto validation error:', err);
    return { isValid: false, userData: extractedUserData };
  }
}

/**
 * Checks if a Telegram ID or username is registered as administrator
 */
export function isTelegramIdAdmin(
  telegramId?: string | number,
  username?: string,
  extraAdminChatIds?: string,
  extraAdminUsernames?: string
): boolean {
  const tid = telegramId ? String(telegramId).trim() : '';
  const uname = username ? username.toLowerCase().replace(/^@/, '').trim() : '';

  const knownChatIds = new Set(['6112545552']);
  if (extraAdminChatIds) {
    extraAdminChatIds.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean).forEach((id) => knownChatIds.add(id));
  }

  const knownUsernames = new Set(['timurcik', 'luckmepubg', 'luckme']);
  if (extraAdminUsernames) {
    extraAdminUsernames.split(/[,;\s]+/).map((s) => s.trim().toLowerCase().replace(/^@/, '')).filter(Boolean).forEach((u) => knownUsernames.add(u));
  }

  return (Boolean(tid) && knownChatIds.has(tid)) || (Boolean(uname) && knownUsernames.has(uname));
}
