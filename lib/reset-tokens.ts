import { createHash, randomBytes } from "crypto";

const TOKEN_TTL_MS = 30 * 60 * 1000;

type ResetTokenRecord = {
  tokenHash: string;
  partnerId: string;
  email: string;
  expiresAt: number;
};

const globalStore = globalThis as unknown as {
  __cuResetTokens?: Map<string, ResetTokenRecord>;
};

function tokens() {
  if (!globalStore.__cuResetTokens) {
    globalStore.__cuResetTokens = new Map();
  }
  return globalStore.__cuResetTokens;
}

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createResetToken(partnerId: string, email: string) {
  // Invalidate any existing tokens for this partner
  const store = tokens();
  for (const [key, record] of store) {
    if (record.partnerId === partnerId) store.delete(key);
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(token);
  store.set(tokenHash, {
    tokenHash,
    partnerId,
    email: email.toLowerCase(),
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });
  return token;
}

export function peekResetToken(token: string): ResetTokenRecord | null {
  const tokenHash = hashResetToken(token);
  const record = tokens().get(tokenHash);
  if (!record) return null;
  if (record.expiresAt < Date.now()) {
    tokens().delete(tokenHash);
    return null;
  }
  return record;
}

/** Consume (single-use) a valid token. */
export function consumeResetToken(token: string): ResetTokenRecord | null {
  const record = peekResetToken(token);
  if (!record) return null;
  tokens().delete(record.tokenHash);
  return record;
}

export function invalidatePartnerResetTokens(partnerId: string) {
  const store = tokens();
  for (const [key, record] of store) {
    if (record.partnerId === partnerId) store.delete(key);
  }
}
