// Run on an open sheet/dialog at phone width: lists every open overlay panel and whether its content can scroll.
() => {
  const panels = [...document.querySelectorAll('.pop-bottomsheet, .pop-center, .dialog-item, .right-drawer, [role=dialog]')]
    .filter((el) => el.getClientRects().length);
  const vh = innerHeight;
  return panels.map((p) => {
    const r = p.getBoundingClientRect();
    const scrollers = [p, ...p.querySelectorAll('*')].filter((el) => {
      const s = getComputedStyle(el);
      return /(auto|scroll)/.test(s.overflowY);
    }).map((el) => ({
      cls: (el.className?.baseVal ?? el.className).toString().slice(0, 60),
      client: el.clientHeight, scroll: el.scrollHeight, canScroll: el.scrollHeight - el.clientHeight > 1,
    }));
    // content that is clipped (below the panel bottom or the viewport) but has no scroller to reach it
    let maxBottom = 0;
    p.querySelectorAll('*').forEach((el) => { const b = el.getBoundingClientRect().bottom; if (b > maxBottom) maxBottom = b; });
    return {
      cls: p.className.toString().slice(0, 80), top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height), vh,
      contentBottom: Math.round(maxBottom), clipped: maxBottom > Math.min(r.bottom, vh) + 2,
      scrollers,
    };
  });
}
