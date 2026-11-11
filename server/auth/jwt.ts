import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

export type JwtClaims = {
  sub: string;
  jti: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
};

export type JwtConfig = {
  secret: string;
  issuer: string;
  audience: string;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
  enforce: boolean;
};

const base64UrlEncode = (value: string | Buffer) => Buffer.from(value).toString('base64url');
const base64UrlDecode = (value: string) => Buffer.from(value, 'base64url').toString('utf8');

function sign(input: string, secret: string): string {
  return createHmac('sha256', secret).update(input).digest('base64url');
}

export function createJwtConfig(isProd: boolean): JwtConfig {
  const enforce = isProd || process.env.AUTH_REQUIRE_JWT === 'true';
  const secret = process.env.JWT_SECRET || (enforce ? '' : randomBytes(32).toString('base64url'));
  if (enforce && secret.length < 32) throw new Error('JWT_SECRET phải có ít nhất 32 ký tự');

  return {
    secret,
    issuer: process.env.JWT_ISSUER || 'aura-talent',
    audience: process.env.JWT_AUDIENCE || 'aura-talent-web',
    accessTtlSeconds: Number(process.env.JWT_ACCESS_TTL_SECONDS || 900),
    refreshTtlSeconds: Number(process.env.JWT_REFRESH_TTL_SECONDS || 2_592_000),
    enforce
  };
}

export function createAccessToken(userId: string, config: JwtConfig): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload: JwtClaims = {
    sub: userId,
    jti: randomUUID(),
    iss: config.issuer,
    aud: config.audience,
    iat: now,
    exp: now + config.accessTtlSeconds
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const input = `${header}.${encodedPayload}`;
  return `${input}.${sign(input, config.secret)}`;
}

export function verifyAccessToken(token: string, config: JwtConfig): JwtClaims {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('JWT không hợp lệ');
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const expectedSignature = Buffer.from(sign(`${encodedHeader}.${encodedPayload}`, config.secret));
  const receivedSignature = Buffer.from(encodedSignature);
  if (expectedSignature.length !== receivedSignature.length || !timingSafeEqual(expectedSignature, receivedSignature)) {
    throw new Error('JWT signature không hợp lệ');
  }

  const header = JSON.parse(base64UrlDecode(encodedHeader));
  const claims = JSON.parse(base64UrlDecode(encodedPayload)) as JwtClaims;
  const now = Math.floor(Date.now() / 1000);
  if (header.alg !== 'HS256' || claims.iss !== config.issuer || claims.aud !== config.audience || claims.exp <= now || !claims.sub) {
    throw new Error('JWT claims không hợp lệ');
  }
  return claims;
}

export function createRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return createHmac('sha256', 'aura-refresh-token-hash').update(token).digest('hex');
}

export function serializeRefreshCookie(token: string, config: JwtConfig): string {
  const secure = config.enforce ? '; Secure' : '';
  return `aura_refresh_token=${encodeURIComponent(token)}; Max-Age=${config.refreshTtlSeconds}; Path=/api/auth; HttpOnly; SameSite=Lax${secure}`;
}

export function clearRefreshCookie(config: JwtConfig): string {
  const secure = config.enforce ? '; Secure' : '';
  return `aura_refresh_token=; Max-Age=0; Path=/api/auth; HttpOnly; SameSite=Lax${secure}`;
}

export function readRefreshCookie(cookieHeader: string | undefined): string | undefined {
  const match = cookieHeader?.split(';').map((part) => part.trim()).find((part) => part.startsWith('aura_refresh_token='));
  return match ? decodeURIComponent(match.slice('aura_refresh_token='.length)) : undefined;
}
