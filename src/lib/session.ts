export function getOrCreateSessionId(storageKey: string = "asdPlatformSessionId"): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(storageKey);
  if (!id) {
    const newId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(storageKey, newId);
    return newId;
  }
  return id;
}

export function sessionHeaders(storageKey: string = "asdPlatformSessionId"): Record<string, string> {
  const sid = getOrCreateSessionId(storageKey);
  return sid ? { "x-session-id": sid } : {};
}

