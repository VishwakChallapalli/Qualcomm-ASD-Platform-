export function createSessionLogger() {
  const sessionId = `sess_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  const events = [];

  function log(type, payload = {}) {
    const evt = {
      t: Date.now(),
      type,
      payload: structuredCloneSafe(payload),
    };
    events.push(evt);
    return evt;
  }

  function exportJson() {
    return {
      sessionId,
      createdAt: events[0]?.t ?? Date.now(),
      events,
    };
  }

  return { sessionId, log, exportJson };
}

function structuredCloneSafe(x) {
  try {
    // Most modern browsers
    return structuredClone(x);
  } catch {
    try {
      return JSON.parse(JSON.stringify(x));
    } catch {
      return { value: String(x) };
    }
  }
}
