import type { User } from "@supabase/supabase-js";

export class ProGateError extends Error {
  constructor() {
    super("PRO_REQUIRED");
    this.name = "ProGateError";
  }
}

export function isProUser(user: User | null): boolean {
  if (!user) return false;
  return Boolean(user.user_metadata?.is_pro);
}

export function requirePro(user: User | null): void {
  if (!isProUser(user)) {
    throw new ProGateError();
  }
}
