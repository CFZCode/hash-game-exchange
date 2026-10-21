// Install once per page load: records every toast / short text that appears (window.__toasts), so a
// refusal message ("Check Minimum Bet Limit.") can be read after the slip closes. Read: window.__toasts.
() => {
  if (window.__toastObs) return 'already';
  window.__toasts = [];
  window.__toastObs = new MutationObserver((ms) => {
    for (const m of ms) for (const n of m.addedNodes) {
      const t = (n.innerText || n.textContent || '').trim();
      if (t && t.length < 160 && /bet|limit|active|check|placed|success|error|balance|exposure|odds|min|max/i.test(t)) window.__toasts.push([new Date().toISOString().slice(11, 19), t]);
    }
  });
  window.__toastObs.observe(document.body, { childList: true, subtree: true });
  return 'installed';
}
