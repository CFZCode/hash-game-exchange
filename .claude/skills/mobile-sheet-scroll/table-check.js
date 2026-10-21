// Wallet table fit check (run with evaluate_script on /wallet/transaction or /wallet/bet-history at phone width).
// Picks the widest time range, then every option of the first filter (Bill/Deposit/Withdraw/… or All/…),
// and reports rows + any cell whose text is cut (scrollWidth > clientWidth) or page side-scroll.
async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const triggers = () => [...document.querySelectorAll('button.select')].filter((b) => b.getClientRects().length);
  const pick = async (trigger, re) => {
    trigger.click(); await wait(700);
    const opts = [...document.querySelectorAll('[role=option]')].filter((o) => o.getClientRects().length);
    const names = opts.map((o) => o.innerText.trim());
    const o = re ? opts.find((x) => re.test(x.innerText)) : null;
    if (o) o.click(); else document.querySelector('.pop-overlayer')?.click();
    await wait(2500);
    return names;
  };
  const timeBtn = triggers().find((b) => /hours|days|month/i.test(b.innerText));
  if (timeBtn) await pick(timeBtn, /90|60|30/);
  const measure = () => {
    const cut = [...document.querySelectorAll('.border-b .ellipsis, .border-b .truncate')]
      .filter((e) => e.getClientRects().length && e.scrollWidth > e.clientWidth + 1)
      .map((e) => e.innerText.replace(/\s+/g, ' ').slice(0, 28));
    return { rows: document.querySelectorAll('.border-b.border-third').length, sideScroll: document.documentElement.scrollWidth > innerWidth, cut: [...new Set(cut)].slice(0, 6) };
  };
  const out = {};
  const typeNames = await pick(triggers()[0], null);
  for (const name of typeNames) {
    await pick(triggers()[0], new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
    out[name] = measure();
  }
  return out;
}
