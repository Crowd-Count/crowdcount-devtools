let sessionExpiresAt: number | null = null;

export const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function setSessionExpiry() {
  sessionExpiresAt = Date.now() + SESSION_TIMEOUT_MS;
}

export function getSessionExpiry(): number | null {
  return sessionExpiresAt;
}

export function clearSessionExpiry() {
  sessionExpiresAt = null;
}
