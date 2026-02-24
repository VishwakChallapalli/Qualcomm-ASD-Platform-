const KEY = "honors_sessions_v1";
const MAX = 20;

export function saveSession(sessionObj) {
  const list = loadSessions();
  list.unshift(sessionObj);
  const trimmed = list.slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(trimmed));
}

export function loadSessions() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function clearSessions() {
  localStorage.removeItem(KEY);
}

export function downloadJson(obj, filename = "session.json") {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
