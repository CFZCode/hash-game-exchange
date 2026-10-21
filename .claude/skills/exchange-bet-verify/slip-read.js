// The open slip as the page prints it: odds, stake, Profit, Liability and the projected book of its card.
async () => {
  await new Promise((r) => setTimeout(r, 400));
  const odds = document.querySelector('input[aria-label="Odds"]');
  const stake = document.querySelector('input[aria-label="Stake"]');
  const slip = stake?.closest('section') || stake?.parentElement?.parentElement?.parentElement?.parentElement;
  const t = (slip?.innerText || '').replace(/\n+/g, ' | ');
  return { odds: odds?.value, stake: stake?.value, profit: t.match(/Profit \| ?([^|]+)/)?.[1]?.trim(), liability: t.match(/Liability \| ?([^|]+)/)?.[1]?.trim(), card: t.slice(0, 700) };
}
