# Signed-in hero carousel

Part of the bc.game rebuild notes. Index and cross-cutting rules: [../CLAUDE.md](../CLAUDE.md).

## Signed-in hero carousel

What the home page's hero becomes once `session.login` is true — `src/pages/Home/Hero/Banner/`. `Hero` is now the switch (`wd` in `Enter-MsmOuq5R.js`: `<Show when={account.login} fallback={<BC/>}>`) and the "JOIN THE UNTAMED" panel moved into a `SignedOutHero` beside it. The wrapper's `-mx-4 sm:mx-0` is the original's own and cancels nothing here, because this build's page column has no inset below `sm` and the signed-out panel supplies its own `px-4` — the two arms net out the same, which is why that arm renders unchanged.

**The carousel component came off `hash.game`, and so did its feed.** `index-t-7F5FAB.js` (the strip), `createBanner-4SczZOe8.js` (the request), `home-deposit-banners-BHZ_UQsB.js` and `widget-entry-DTIkOyrt.js` (the deposit slide), plus six PNGs. Then the response itself — see the hash.game API note near the top; this is the first fixture in the project that is a live answer rather than a saved capture.

**Six slides: the deposit card, then five feed rows.** The order is `<Show when={type === "top"}>` deposit → `<For>` feed → `<Show when={feed.length < 3}>` the chunk's three hardcoded slides. That last arm does not fire and its trio sits in `banners.js` unused, because the feed has five. `bannerType` is sent and **ignored** by the server — top/bottom/middle/side answer identically.

Three of the five rows are the live response, field for field. **The other two are from the rendered DOM the user pasted, and they cannot be re-fetched**: the feed is per-visitor, and a logged-out request answers three rows no matter what `uid`/`level`/`vip` you send. Both are exact for everything the card renders; `bannerId` is not recoverable that way, so those two carry a slug and it is only ever a React key. Order is the rendered order — the server sorts on `sortNum` and the two DOM rows interleave with the captured ones, so no `sortNum` is recorded and **reordering the array is what changes the strip**. Casing is the feed's own throughout ("SLOTS", "casino", "hit 100X, Double the WIN", "Join now" beside "Join Now"); every one of those renders through an `uppercase` utility, so do not tidy them. Two descriptions carry a literal `\n`, which is what `whitespace-pre-line` is for.

**The deposit slide confirms rather than invents.** `HomeDepositBanners` is three lines that render `<Widget target="banner-home"/>`; the card is a UI widget inside the bonus framework, matching on `["MONTHLY","COMMON-NEWBIE","VN-DAILY","MX-NEWBIE","SPECIAL"]`, and only the MONTHLY arm can apply to this account. Its "220% BONUS" is `generateBonusPercentage(bonusRatio + extraBonusRatio)` = 1.8 + 0.4, which is the `/deposit-offer` fixture's own 180 + 40 — the page's `stageMatch`. So nothing was added: `DepositSlide` derives the figure from `getDepositBonuses()`. One divergence, flagged at the call site: the widget's Check button pushes a terms-and-conditions popup when nothing is claimed yet and only navigates to `/deposit-offer` once something is, and that dialog is not built, so it always navigates.

**keen-slider is reproduced, not wrapped, and the rendered DOM is what settled how.** The original passes `{ dragSpeed: .2, loop: count > 3, slides: { spacing: mobile ? 0 : 8, perView } }` with `selector: ":scope > *"` — so **the slides ARE the cards' own outer divs**; there is no track element and no wrapper per slide, which is why `BannerCard`/`DepositSlide` take a `style` prop. What keen-slider writes on each is exactly `min-width` / `max-width` / `transform: translate3d(x,0,0)`, and at rest with six slides three-per-view the x values were `0, 8, 16, 24, -2320, -2312`. Those last two are the whole mechanism: flex has already placed slide *i* at `i * width`, the transform adds the accumulated `i * spacing`, and **a slide too far ahead is relocated behind the strip rather than duplicated** — so the DOM holds exactly as many nodes as there are slides. An earlier pass here duplicated head and tail and rewound on `transitionend`; it rendered identically and was thrown away for this.

Two consequences of not having the library. The slot rule (`ahead > count / 2` wraps round) is the **one inferred piece** — only one configuration was ever observed and `> count - perView` fits it equally, so the halfway rule is chosen because `moveToIdx` uses the same test to pick a direction and the two can then never disagree. And because CSS does the easing rather than a per-frame rewrite, a wrapping slide has to be given an inline `transition: none` for the render it wraps in, or it animates across the viewport instead of teleporting — that is what `jumped` is, and it is why `from` (the previous position) is state rather than a ref: it is read during render.

**The hover listeners belong on `.carousels`, not on `.carousel-wrap`.** `Q(() => r.container, {mouseenter, mouseleave})` binds them to keen-slider's container. The arrows are `absolute -left-4 / -right-4`, so they stick *out* of that box: hovering one satisfies `.carousel-wrap:hover` — which is the only reason they are visible, since `.carousel-cahnge-btn` is `opacity: 0` — without entering the strip. So the 15s timer keeps running while you reach for an arrow. Put them on the wrapper and it freezes the instant the arrows appear. `.carousel-cahnge-btn:hover svg { fill: rgb(var(--brand)) }` is the original's too: the glyph goes green under the pointer, and it has to be a descendant rule because the hit target is the 16px button beside the strip, not the icon in it.

**LETTING CSS DO THE EASING COSTS TWO BUGS THAT KEEN-SLIDER DOES NOT HAVE, and both showed up as the hero sliding sideways on a reload.** The library rewrites every slide's transform per frame and declares no transition, so a transform that changes for a reason *other* than a move simply lands. Here `.carousels > div` carries `transition: transform .3s`, and every slide's transform is computed from the measured container width — so anything that changes the width animates the whole strip.

The first trigger is the first paint. A `ResizeObserver` does not report until after it, so the strip painted once at `width = 0` — which drives `perView` to 1 through the `(width || 340)` default and sizes every slide at `100%` — and then eased into three across. The measurement moved into a **ref callback**, which runs during commit, so the setState it schedules flushes before the browser paints and the first painted frame is already right. Not `useLayoutEffect`: a synchronous setState in an effect body is what `react-hooks/set-state-in-effect` rejects, and this is exactly the cascading render it is about.

The second survives a correct first measurement, and the usual trigger is not a resize at all — it is the page's own **scrollbar** appearing once the images below the fold have loaded, narrowing the content column by ~15px a beat after the hero has painted. So the slides now animate **only while a move is in flight**: a `moving` flag is set beside the new position and cleared 300ms later, with the transform unchanged so clearing it animates nothing. It sits next to `jumped`, which is the same idea one slide at a time.

The dots are `pd` in Enter, and **the timer lives inside them** — a gsap tween 0→1 over **15s**, `ease: "none"`, `onComplete` calling `onChange(i => (i + 1) % dots)`. There is no separate interval, which is why pausing the strip pauses the fill. The fill is written onto the node rather than held in state, for the reason the promotions tab indicator is. Its colour is `#B3BEC1`, not brand green — sampled off the capture's active pill to the digit — and `Dr` is `createSelector`, so `n(i)` is `i === index` rather than a memo of it.



## The platform's banners, and the one field they can supply

`GET /admin/banners` is public and wired — `services/banner.js` reads it whenever fixtures are
off. It is the first of the "backend has it, we are not using it" routes to be connected.

**A banner row is an image and nothing else.** The whole `banners` table is ten columns and none
is text: `id, type, image, image_data, content_type, byte_size, uploaded_by, is_active,
created_at, updated_at`. There is no title, description, link, tag or sort column. So the
platform can say *which artwork* a slide shows and cannot say what the card reads or where it
goes — every word on it still comes from the capture in `Hero/banners.js`.

That is why the read **overrides art on a known slide** instead of building slides from the
response. A row whose `type` is `home_top_<n>` replaces the artwork of the nth slide, 1-based, in
the order `banners.js` lists them; anything else is ignored rather than guessed at. **The
`home_top_<n>` naming is this build's convention, not the platform's** — `type` is validated only
as `/^[a-z0-9][a-z0-9_-]{0,63}$/`, carries no server-side meaning, and the table was empty when
this was written, so there was no placement name to match.

Two shape notes, both read off the wire rather than the source. The list answers **the rows as
`data` with the count in `meta`**, not the `{total, rows}` that `BannersService.list()` returns —
the envelope reshapes it, so `request()` hands back a plain array. And the image is served by the
gateway at `/api/v1/admin/banners/image/<type>`, cached 300s, so it needs `API_BASE` in front of
it and must not go through `request()`; the card prefers `banner.imageUrl` over its
`artFor(image)` glob when the field is present.

**Every failure path lands on the captured slides.** No rows, all rows inactive, a 500, a refused
fetch, or fixtures mode all render exactly what this build rendered before the platform was
asked, and the carousel's own `rows.length < 3` padding still sits behind that. Verified against
the running backend both ways: with the table empty the five captured images render unchanged,
and with one seeded `home_top_1` row the first card takes the platform's artwork while keeping
its own tag, title, description and button.
