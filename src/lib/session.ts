export function getOrCreateSessionId(storageKey: string = "asdPlatformSessionId"): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(storageKey);
  if (!id) {
    id = (crypto as any).randomUUID?.() || `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(storageKey, id);
  }
  return id;
}

export function sessionHeaders(storageKey: string = "asdPlatformSessionId"): Record<string, string> {
  const sid = getOrCreateSessionId(storageKey);
  return sid ? { "x-session-id": sid } : {};
}

