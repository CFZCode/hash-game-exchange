// Press Place Bet on the open slip and wait for the outcome toast (needs toast-watch.js installed).
async () => {
  const before = window.__toasts?.length || 0;
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Place Bet');
  if (!b) return { error: 'no slip' };
  if (b.disabled) return { error: 'Place Bet disabled' };
  b.click();
  for (let i = 0; i < 60 && (window.__toasts?.length || 0) === before; i++) await new Promise((r) => setTimeout(r, 250));
  await new Promise((r) => setTimeout(r, 500));
  return { toasts: (window.__toasts || []).slice(before), slipOpen: !!document.querySelector('input[aria-label="Stake"]') };
}
