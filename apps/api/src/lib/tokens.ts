import crypto from "node:crypto";
import { env } from "../config/env";

// Hash do refresh token para persistência segura (nunca o token em claro).
export function hashToken(token: string): string {
  return crypto.createHmac("sha256", env.JWT_REFRESH_SECRET).update(token).digest("hex");
}

const UNIT_MS: Record<"s" | "m" | "h" | "d", number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function msUntil(ttl: string): number {
  const m = /^(\d+)([smhd])$/.exec(ttl);
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const value = Number(m[1]);
  const unit = m[2] as "s" | "m" | "h" | "d";
  return value * UNIT_MS[unit];
}
