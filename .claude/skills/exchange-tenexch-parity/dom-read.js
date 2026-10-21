// Paste into chrome-devtools evaluate_script on /sports/match/:sid/:gmid (your own page only).
// Prints every market card as one line: title, header limits, cells, row limits, overlays.
async () => {
  await new Promise((r) => setTimeout(r, 6000));
  return [...document.querySelectorAll('section')].map((s) => s.innerText.replace(/\n+/g, ' | ').slice(0, 400));
}
