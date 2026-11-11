import { createRefreshToken, hashRefreshToken } from './jwt.ts';
import { prisma } from '../db/prisma.ts';

export async function createAuthSession(userId: number, ttlSeconds: number) {
  const refreshToken = createRefreshToken();
  const session = await prisma.authSession.create({
    data: {
      userId,
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + ttlSeconds * 1000)
    }
  });
  return { refreshToken, session };
}

export async function findActiveAuthSession(refreshToken: string) {
  const session = await prisma.authSession.findUnique({ where: { refreshTokenHash: hashRefreshToken(refreshToken) } });
  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) return null;
  return session;
}

export async function rotateAuthSession(sessionId: string, userId: number, ttlSeconds: number) {
  const next = await createAuthSession(userId, ttlSeconds);
  await prisma.authSession.update({
    where: { id: sessionId },
    data: { revokedAt: new Date(), lastUsedAt: new Date(), replacedBySessionId: next.session.id }
  });
  return next;
}

export async function revokeAuthSession(refreshToken: string): Promise<void> {
  await prisma.authSession.updateMany({
    where: { refreshTokenHash: hashRefreshToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date(), lastUsedAt: new Date() }
  });
}
