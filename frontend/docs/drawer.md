# The right-hand drawer: notifications and global chat

Part of the bc.game rebuild notes. Index and cross-cutting rules: [../CLAUDE.md](../CLAUDE.md).

## Global chat

The second of the three panels the right-hand drawer holds — `src/components/Chat/`. The container, the `right()` signal it keys off and the transition are all documented under The right-hand drawer above and are not repeated here; what follows is the chat panel's own data, which was recovered separately from its markup.

Note `src/layouts/MainLayout/GlobalChat/` is a **dead placeholder** from before the drawer was shared — two empty files that nothing imports. Delete them; the panel lives under `components/` beside the notification one, because the container owns all three.

- **`GET /chat/room/list/` answers unauthenticated** — a room list is a catalogue, so it falls on the answering side of the split the ladder above describes. 21 rooms, captured verbatim in the server's own order, which is what puts Global and Sports above the per-language rooms. Two of its strings are the server's own mistakes and are kept: `Руccкий` carries two Latin c's, and `Tiếng việt` lower-cases a word the language capitalises. Correcting either would be inventing a response.
- **`roomLabel` looks like dead code and is not.** `roomId === 0 ? "Global" : roomId === 14 ? "Sports" : label` — those two ids belong to the store's HARDCODED OFFLINE FALLBACK, whose ids are the live ones minus 100, so neither test ever matches a fetched room. It is the site's translation seam rather than an inert branch, and in en-US both arms agree.
- **The message feed is a WEBSOCKET, so there is no endpoint to probe and never was one to capture** (`Ct("chat", handler)` takes protobuf frames). `components/Chat/messages.js` is therefore the project's documented last resort — six rows read off the reference capture, taken only after the mirror, `hash.game/assets/` and the live API had each been tried. Its `level` values are DERIVED from each badge's tier suffix through `data/vipConfig.js` rather than read; `userId` is the one invented field and is deliberately small and synthetic, since it is only a React key and a profile link. `getChatMessages` is also the one read in the project that does **not** go through `request`, and deliberately: the seam this becomes is a subscription, and handing `request` an invented path would start 404ing the moment `VITE_USE_FIXTURES` is turned off. Only the Global room has a transcription behind it, so every other room correctly renders the empty state rather than being handed Global's lines.
- **The send glyph is bc.game's Telegram mark**, and that is not a mix-up to tidy: its mask is named `mask_icon_telegram_mx` and its two `<rect>`s paint from `--icon-mx-green` / `--icon-mx-red`, custom properties nothing here declares, so both fall back to `transparent` and what renders is the bare paper plane. Keep the rects.


## The right-hand drawer

`src/components/RightDrawer/` — ONE 380px container pinned to the right edge of the window, holding a shared close square and whichever of three panels the signal names. `Se` in `Header-CTF5n6al.js`, which is in the mirror, and its shape is why this is a component rather than each drawer owning a shell:

```
<Portal ref={el => el.className = "chat-notice"}>
  <div class="right-slide-content relative h-full w-full">
    <Button class="absolute end-2 top-3.5 z-[101] ..." onClick={() => setRight("")}><IconClose/></Button>
    <Show when={right() !== ""}>
      <Transition name="fadeRight">
        <Show when={right() === "notice"}><NoticePanel/></Show>
        <Show when={right() === "chat"}><Chat/></Show>
        <Show when={right() === "private-chat"}><PrivateChat/></Show>
```

**THE SIGNAL IS A STRING NAMING WHICH DRAWER IS OPEN, not a boolean per drawer** — `""` / `"notice"` / `"chat"` / `"private-chat"` — and it lives in `MainLayout` rather than in the component, because two of the three things hanging off it are the layout's: opening **folds the sidebar below 1280** (240 + page + 380 does not fit) and a resize tick **closes it at 1024 and under**, which is the whole of what makes the drawer desktop-only. It was a boolean while `notice` was the only arm built; two are built now.

**The close square is outside the transition and is always mounted**, because it belongs to `.right-slide-content` and not to any panel — which is why it does not slide in with the content, and why its `z-[101]` has to beat the notice panel's sticky tab strip and the chat's `header-layer` (z-100) alike. It is invisible when closed for the same reason the panels are: the container is 0 wide.

**THE WHOLE CONTAINER IS NOT MOUNTED BELOW 640, and it had to be.** Every rule in
`RightDrawer.css` sits inside `@media (min-width: 640px)` — the original's own scope, since under
that line bc.game has no drawer at all and the mobile bell navigates to `/notification` instead —
but the portal was created unconditionally, so on a phone the container landed at the end of
`<body>` with **no rules on it**: no `position: fixed`, no `width: 0`, no `overflow: hidden`. The
close square is deliberately mounted outside the transition, so it exists whether a panel does or
not, and unclipped it painted as a loose ✕ tile under the last section of every mobile page. It
cost layout as well, which is the half that is easy to miss: `.right-slide-content` is `h-full` of
an auto-height parent, i.e. zero, but an **absolutely positioned descendant still contributes to
the document's scrollable overflow**, so `top-3.5` over a `size-8` button added ~46px of empty
scroll below the page — which is what made the home page's bottom gap look immovable while three
rounds of margin trimming reached nothing. Gated in JS rather than with a `display: none`, on two
counts: it matches the original, which does not render this tree on a phone, and a hidden button
is still in the tab order. At **640**, the line the stylesheet stops at, not the drawer's own 1024
JS gate — the mount and the rules must not disagree about which widths are unstyled. Worth
checking on any other permanently-mounted portal whose CSS is breakpoint-scoped; `Explore` is the
one to compare against, and it is safe because it returns `null` when closed.

**`private-chat` is not built and has no entry point.** It is bc.game's TypeX private-messages panel (`ChatTypeXSide-DUoEr9uF.js`) behind a third-party SDK handshake, and the button that opens it is the one the signed-in header documents as deliberately not rendered.

### Notification drawer

What the desktop header's bell opens — `src/components/Notification/`, the `notice` arm of the container above. Not a route on a desktop; the mobile bell navigates to `/notification` instead, which is a real dialog route on the original and falls to the catch-all here. The container, its stylesheet (`RightDrawer.css`) and the `fadeRight` animation moved out of this component when the chat arm landed; what is left here is the panel.

**Recovered in two halves, and one of them was in the mirror all along.** The shell (`_e`) is in `Header-CTF5n6al.js`, which is saved; the body is **`Main-_tXJgJzI.js`, 24 KB**, which is not and came off `hash.game/assets/` with `compact-IdC0O8xF.js` and `IconEmojisports-BU35Rj6X.js` under the hashes Header's own `__vite__mapDeps` already lists. `IconDelete-D_A0Wcow.js` and `ClearAll-BQO1_4tO.js` were already there. So every class list is a Solid template's own and every string is verbatim i18n — nothing is read off the screenshot.

**IT PUSHES THE PAGE; IT DOES NOT OVERLAY IT, and that is the part a screenshot rebuild would most likely miss** — except that this one is measured as well as read. `.chat-unfold #root { margin-inline-end: 380px }` over `@media (min-width: 1080px) { .chat-unfold > .header { padding-inline-end: 380px } }`, and in the reference capture the avatar and every page column end exactly 380px short of the window's right edge. Both are written as DESCENDANT selectors here, which is forced: the original portals its header to `<body>` so `>` matches, while this build's sits inside `#root`. `#root` is `.main-layout-content`.

**The whole `.chat-notice` family came off the CURRENT deploy's stylesheet** (`index-DGr5jguQ.css`), not the mirror's — only `.right-slide-content` is in the saved one. What makes the rest trustworthy is that that declaration is byte-identical in both. The mechanism is `.explore-pop`'s, one axis over: a permanently mounted `position: fixed` container that is **0 wide with `overflow: hidden`** until `chat-unfold` lands on `<body>`, at which point it is 380px, transitioned over 0.2s. Nothing toggles `display`, so the panel inside animates on its own.

**The signal is a STRING naming which of three drawers is open** — `right()` is `""` / `"notice"` / `"chat"` / `"private-chat"`, and all three share one container and one transition. Only `notice` is built, so it is a boolean here. It lives in `MainLayout` rather than in the component because two of the three things hanging off it are the layout's: opening it **folds the sidebar below 1280** (240 + page + 380 does not fit), and a resize tick **closes it at 1024 and under** — which is the whole of what makes the panel desktop-only. The original also RESTORES the last value on the way back up; only the closing half is reproduced.

**The animation is `fadeRight` and BOTH HALVES EXIST, which is the difference from `fadeUp2`.** Out of the transition table in `index-BsFv7ByC.js`: `from {opacity: 0, x: "100%"}` → `to {opacity: 1, x: 0}` at `{duration: .3, ease: "power2.out"}` — cubic, not quartic. `g3`'s `onExit` runs `fromTo(el, to, {...from, onComplete})`, the same tween backwards with the unmount deferred until it finishes, and that IS the slide-out. Two keyframe sets rather than one played in reverse, since `reverse` would flip the easing too. Note the body class goes off the instant the drawer closes, not when the exit finishes: the container collapses over its own 0.2s while the panel slides out over 0.3s and is clipped away by it, which is the original's behaviour and reads as one gesture.

**BOTH FEEDS ANSWER 403 AND THAT IS THE CORRECT RENDERING** — the fifth page here where being locked out is the answer rather than a compromise. `POST /home/system-notice/list/v2/` and `POST /comment/reply/unread/list/` both return a bare gateway 403 on `hash.game`, probed rather than assumed, and unlike the referral family they agree with each other. **And the fixture is the store's own declared state**, the fourth time checking for one has paid: `Us` in `Enter-MsmOuq5R.js` opens with a literal carrying an empty `noticeList`, an empty `commentData` and all four counts at zero — which is exactly the first capture, three unbadged tabs over the crocodile with only "Show unread" in the bottom bar. `<Show when={total > 0}>` is why "mark all as read" is absent.

**ONE ROW WAS ADDED OFF A SECOND CAPTURE, and it is the only thing in this feature that did not come out of a chunk.** A Cronos Chain deprecation notice under System, transcribed from two overlapping screenshots of the rendered panel. Read rather than assumed: it sits under **System**, so `type` is 4; there is no green dot beside the date, so `isRead` is 1; there is no "Exclusive Notification" strip, so `isTop` is 0; and there is no View More button, so no `contentType: 2` block. It is not clamped either, and that is `Yt`'s own gate rather than a choice — the 220px test is `Ls.includes(type)` and 4 is not in `[1,2,3,5]`, so a System notice renders at full height however long it is, which is why the capture needed two screenshots. Two things ARE inferred: `afficheId`, which nothing prints and which only feeds two writes that cannot fire, and that **the whole body is ONE `contentType: 1` block with `\n\n` between paragraphs** rather than one block per paragraph. That second one was measured, not assumed — the gaps between paragraphs are exactly two line pitches, i.e. one blank line under `whitespace-pre-wrap`, where separate blocks would give `my-2`'s 8px. The 📢 line measures the same way, so it is the first line of that block and not a heading.

**`createTime` is built from LOCAL parts rather than pinned to an epoch.** The only evidence is the printed string `7/30/2026, 11:44:12 AM`, which is `toLocaleString()` in the *viewer's* zone — so a pinned UTC instant would reproduce the capture only for a reader in the same zone as whoever took it. Constructing it from local parts prints those digits everywhere, which is what the capture actually attests to. Same call as the deposit bonus's month reset and the raffle's draw clock.

**The fixture honours `showUnread`, unusually for this project.** The filter is the SERVER's on the original — the flag goes into the request body and flipping the switch refetches — so against a static fixture the control would be visibly inert. `isRead === 0` is what the parameter's name says it selects and is the same test `Bs` counts unread rows with, so the reading is the chunk's. The one captured row is read, so turning the switch on empties the System tab, which is what the live site would do with this account.

**The scroller shows the site's scrollbar and must not be given `hidden-scroll-bar`.** `_e` hands it exactly `class: "h-full"`, where the Explore overlay two functions up gets `"hidden-scroll-bar h-full w-full"` — a real difference between the two, not an oversight in either. It carried Explore's class for one revision, copied along with the portal pattern, and a drawer taller than the window with no bar to show for it is the one thing here that cannot be right. The 4px thumb comes from `.app-root ::-webkit-scrollbar` in index.css, which reaches a `<body>` portal because `app-root` is on `<body>`.

Six things the chunks settle:

- **The three panes are three FILTERS over one list, not three feeds.** `Ls = [1,2,3,5]` is Promotions, `Ps = 6` Transactions, `xs = 4` System; a notice's `type` decides where it lands. The System tab is the odd one — it merges that filter with the comment feed, and its badge is the only one that sums two counts.
- **`class` on a `TabItem` belongs to the CONTENT PANEL** (`mt-4 bg-transparent`), the fourth page to need saying after the deposit dialog and both referral tabs.
- **Two notices are hard-coded by id in the reducer.** `Bs` forces `afficheId === 106076` to type 4 and drops `106115` entirely, alongside a whitelist-or-blacklist region gate keyed on `areaCode` OR `userCountry`. Reproduced rather than tidied.
- **`h-13` on the notice row's footer is a dead class and cannot be kept — the `w-30` / `h-22` trap a third time.** It is in neither the mirror's stylesheet nor the current deploy's, both checked; v3's height scale steps 12 → 14 → 16 and the site's own additions are 15, 18, 20. So the row is auto height there and Tailwind v4 would emit 3.25rem. `size-4.5`, `h-15`, `h-18` and `w-15` beside it all really do exist.
- **The shell's height looks wrong and is not.** `_e` is `calc(100% - 3.75rem)` while the scroller inside it is `h-full` — 100% of *that* box — so the scroller overflows its parent by exactly the title bar's 60px and its bottom edge lands flush with the window's, which is what puts the sticky bottom bar on the last row of pixels. Nothing clips it, since `.chat-notice` is `top: 0; bottom: 0`.
- **The pending spinner is `absolute inset-0` against `.right-slide-content`**, not against the pane — there is no positioned ancestor between them, so it covers the whole drawer. Adding `relative` to `.tabs-content` would quietly shrink it.

**One divergence, and it is React rather than taste.** A `contentType: 2` block is not content at all — it carries the row's CTA link and label — and the original discovers it by calling a `batch` setter from inside the block list's render. That is the cascading render `react-hooks/set-state-in-effect` exists for, so `cta` is a `useMemo` over the same array instead: same value, one render earlier, no state.

`.button-brightBg` went into `@layer components` for the CTA button (#f2f2f2 / #464f50, index-DxOqNczA.css's own). It is not a button type — it is a bare background a call site writes on top of one, and the row also writes the same two colours as `bg-[#f2f2f2] dark:bg-[#464f50]`, which is the original's own belt and braces.

`.notification-box` is in the stylesheet and **nothing applies it** — no chunk in the mirror or off `hash.game` carries the string. Its one nested rule restates `.tabs-btn[aria-selected]`'s own fill, so it would be inert even if something did. Left out rather than kept, since there is no element to put it on.

Not built, each inert at its call site: **the whole comment half of the System tab** — `Le` (a reply row with an avatar, a like toggle, the replied-to game's 3:4 cover and a delete), `de`/`me` (unread and read lists with a Load More pager), `Dt` (the reply dialog) and `yt` (a 200-emoji picker with a `localStorage` history under `emojiHistory`), all needing `/comment/*`; `Mt`/`Et`, the comment body's `[k=v,v]` mini-markup, of which one type is handled (a `@user` mention); `Pt`, the relative timestamp only a comment row prints; the `<Show when={!0}>` around the tab strip, whose fallback is dead on the live site too; and the `/notification` route itself, whose wrapper (`index-CwG2ydUc.js`) is three lines — `<PageLayout title="Notification" class="max-width-dialog"><Main/></PageLayout>` — so building it is the shell, not the body. `Main-_tXJgJzI.js` also carries an obfuscated anti-tamper snippet, deliberately not ported, the same call Vault Pro's `ht` got.

### Global chat

`src/components/Chat/` — the `chat` arm, and what the desktop header's chat button opens. **Both header trees open it**, signed in and signed out alike, which is the original's own wiring: `Se` hands its logged-out arm the identical `setRight`, so the room is readable without an account and only posting needs a session.

**THE CHUNK NAMED AFTER CHAT IS THE WRONG ONE, and that is the first thing to get right here.** `ChatTypeXSide-DUoEr9uF.js` is the obvious candidate in the deps table and is **not** this panel — it is the PRIVATE-messages side panel, built on a third-party SDK, and its header reads "Private Messages". The global chat is `index-CUBJDfzw.js` (149 KB, off `hash.game/assets/`), reached the long way round: the shell renders `X` for this arm, `X` is `a7` re-exported from `Enter-MsmOuq5R.js`, and `a7` is `Ih`, a lazy import of that file.

**THE STORE WAS IN THE MIRROR ALL ALONG EVEN THOUGH THE UI WAS NOT.** `Enter-MsmOuq5R.js` carries the room state, the socket wiring and every REST path, which is how `services/chat.js` names real endpoints for a feature whose markup had to be fetched. Check the main bundle for a feature's *store* before assuming the whole thing is missing.

**`/api/chat/room/list/` ANSWERS UNAUTHENTICATED** — a room catalogue is not per-account, the same split `game/support` has demonstrated repeatedly — so `src/data/chatRooms.js` is a live response: 21 rooms in the server's own order. Two of its strings are the server's own errors and are kept as written (`Руccкий` carries two Latin c's; `Tiếng việt` lower-cases a word the language capitalises). `/chat/room/<id>/pinned-msg/` answers too and its panel is the one unbuilt piece here with real data already waiting for it.

**THE MESSAGES ARE THE EXCEPTION, AND THE REASON IS STRUCTURAL RATHER THAN A GAP IN THE CAPTURE.** The feed is a **websocket** — the store joins a room and receives protobuf frames — so there is no history endpoint that could be probed and no response that could ever have been saved. The six rows in `components/Chat/messages.js` are read off the reference capture, the project's documented last resort, taken only after the mirror, `hash.game/assets/` and the live API had each been tried. What is read and what is derived is written at the fixture; `userId` is the one invented field, and the first row's photograph is deliberately **not** substituted — it is a third party's upload, so the part is kept with its real path and renders as the broken-image state a deleted upload would.

Four things the chunk settles:

- **A message's content is an ARRAY, not a string.** `yt` walks `data.chat` and switches per entry: a bare string is text (split on newlines into `<br>`s), and an object is one of `user` (an @mention linking to the profile, in **brand green**), `gif` (Giphy, by id), `link` or `img`. The server parses, so the fixture stores the parsed form rather than a string it would have to re-parse.
- **A row's header only renders for the first message of a run.** `isFirst` is `chats[i-1].userId !== chats[i].userId` and it gates the avatar AND the name line AND the row's own `pt-4`, so a second message from one author is a bare bubble tucked under the first. Every row in the capture is a different author, which is exactly when that rule is invisible.
- **The level badge prints the TIER'S SUFFIX, not the level**, inside `<Show when={level > 0 && ICON[base]}>` — so a tier with no glyph renders no badge rather than an empty box. That `Show` is also what makes the ladder's newline quirk visible here: every third step is named `"Bronze
III"`, `splitLevelName` splits on the last SPACE, and a name with none yields no tier family — so **no level whose numeral is III can draw a badge at all**. One capture row reads as III and is recorded as II with that reasoning written at the fixture, since no III could reproduce what the capture shows.
- **The composer's trailing button swaps on focus**: idle it is the `+` that opens the extras sheet, focused it is the brand send button, which enters with `.sliding` — a bounce (100% → -8% → 10% → 0), not a fade. The send glyph is bc.game's **Telegram mark**, whose two `--icon-mx-*` rects fall back to transparent, leaving the bare paper plane.

The idle `+` square is `bg-layer5` with a **secondary** glyph, not a brand fill — a raised grey box that only turns green once the field takes focus and the glyph has become the send arrow. It was briefly written as brand on a misreading of the capture and corrected back to the chunk.

`pc:pe-[2.75rem]` on the header is written out as `pe-11`, because `pc` is a plain class on the original's root rather than a breakpoint (the referral pane documents that) and the variant would emit nothing here — while the padding is not optional, since it is what keeps the channel name clear of the container's close square.

Four tier glyphs are wired, the four this project already had; **Beginner, Diamond and Eternal/External are in `IconNblevelexternal-DFbHcrE9.js`, which IS in the mirror** (exports `b`, `a`, `I`), and are not pulled in because no row in this fixture reaches them.

**`class` ON THE SITE'S SELECT BELONGS TO THE LAYER, NOT TO THE TRIGGER — the `TabItem` trap in a second component, and the room picker is where it showed.** `Nt`'s trigger is its `children` (here a plain Button, which is why it carries none of `.select`'s border or fill), while `class`, `style` and `space` all reach the dropdown: `class: mobile ? "bg-layer3 dark:bg-layer2" : "-ms-2 bg-layer4 p-2"`, a centred-glow `box-shadow`, and `space: 18`. Three things fall out of that and all three were wrong here. **`-ms-2` is the whole of the left alignment**: the popover start-aligns to the trigger's box, so the layer would sit at the header's own `px-4` inset and this pulls it back 8px — measured off the reference at dpr 1.25 the layer's left edge is 8.8 CSS px against a trigger at 16. **`space` is a PROP, not the constant 8** `Select/position.js` had (`(t.space ?? 8) * remScale`), and it is measured from the trigger's BOTTOM — so the trigger also has to keep `button-m`'s 40px, which an `!h-auto` here was cancelling, or the layer rides 10px high. And the fills are a step lighter than this build's defaults: layer4 for the layer against `Dropdown`'s own `bg-layer3`, layer5 for the selected row against `.select-item[aria-selected]`'s layer4 — both sampled off the capture's pixels, and both needing `!` for the cascade reason the auth dialog's third-party buttons document. The rows are `radio select-item btn-like mb-1 h-10` around a `font-extrabold` span, which is the 44px pitch the reference measures and the weight it shows; `Select` grew `space`, and `labelRender` now takes the layer's open state as a second argument, which is what turns the label brand and flips its chevron.

**THE TWO HEADER BUTTONS BOTH DO SOMETHING NOW, and one of them turned up a probing rule worth carrying forward.** The ⓘ pushes `L1`, six numbered chat rules over the shared `PopCenter` (`W` is `cl`), every string verbatim `A("…")` out of the chunk — including rule 4's "advertising/ trading/ selling/ buying", whose spaces really are after the slashes. `rule-item` and `more-rule` are dead classes in the mirror's six stylesheets and the current deploy's `index-WymgNldA.css` alike, so the whole layout is the card's own padding. The trophy toggles `V1`, the BIGGEST WINNER TODAY board, and **it belongs to the HEADER rather than to the message list** — `q1`'s third child is a bare `<div class="relative w-full">` under the header row and the board is `absolute` inside it, so it hangs over the messages and nothing reflows. Its fill is `bg-layer1 sm:bg-layer2`, a step DARKER than the `bg-layer4` bar it hangs off, which is what separates it from the room behind rather than a border. Both artworks are the deploy's own: `K.rich`/`K.star` are base64 PNGs inlined in the chunk, `K.rich_close` (the struck-through trophy, which is what the button shows while the board is open) and the three medals are `/assets` files off `hash.game`.

**`GET /game/support/rich-list/get/` ANSWERS UNAUTHENTICATED AND `POST` DOES NOT — the chunk uses POST.** A leaderboard is public and a player's place in one is not, which is the `game/support` split for a seventh family; what is new is that **the verb the source uses can be the shut one**, so try the other before writing a path off. `src/data/richList.js` is that live answer, and its three rows are the reference capture's three players in its order — `ndtrocal`'s $55,863.34 to the cent, the other two drifted, because a daily board moves. Drift, not transcription error; the same call `data/achievements.js` records. The avatars are real too, off `img2.distributedresourcestorage.com/avatar/<id>/s` for those real ids, and two of the three share one default image exactly as the capture shows.

Not built, each a real component in the chunk rather than a stub: the other twelve message **types** (bet shares — the "Payout 0x" card at the top of the capture is one — coin drops and their claim dialog, rain, spin-wheel gifts, jackpot ribbons, invite cards), the pinned message, the emoji and GIF pickers, slash commands, sending (`POST /chat/room/<id>/send/`, and with it the mute check and the 1000-character refusal), moderation, and the unread and @-mention pills.

### The mobile arm — `/chat-public`

**`src/pages/ChatPublic/`, and the panel above is unchanged by it: the page is a BOX around the same component**, the way `/explore` is a box around the Explore panel. Below `lg` the original has no right-hand drawer at all, so the bottom tabbar's fifth button is a plain link and this is what it links to — `mn(e)` in `Enter-MsmOuq5R.js` says so outright (`{ label: "Chat", icon: "chat", link: "/chat-public", buttonName: "tabbar_chat" }`) and the consumer navigates with a bare `t(u.link)`. The button had no handler at all until this route existed.

**It is a PAGE route with a device guard, not a dialog** — `{ path: "/chat-public", component: Sp, info: { guards: [() => !m.mobile && "/"] } }` at `Enter-MsmOuq5R.js:8460`, sitting *after* the `{dialog: !0}` group closes rather than inside it. Same guard as Explore's, read the same way (a guard returning a path is a redirect; `m.mobile` is the 1024 line), and the redirect lives **inside the component** because it needs a live matchMedia subscription — widening the window while the screen is open bounces to `/`. 1024 is also where the two entry points hand over, the tabbar being `lg:hidden` and the header's chat button `hidden lg:flex`, so there is no width with neither and none with both.

`Sp` resolves to `index-CUBJDfzw.js`, **not in the mirror** — rung 2, off `hash.game/assets/` under the hash `__vite__mapDeps` already lists. Its default export is thin: `<Show when={!initRoom() || transitioning} fallback={<Chat/>}>` over a loader that is `fixed inset-0` on a phone and `size-full` centred otherwise. So the page IS the panel, and everything else had to be measured off `hash.game/chat-public` at 390 with a phone UA:

| | |
| --- | --- |
| the chat's own header | `.header-layer` **fixed** at 0,0 390×51, z-100 — the panel's own `h-14` at this width's 14.51px root, not a bar the page adds |
| the site's header | `.page-header` still mounted at z-99, **covered** rather than unmounted. Reproduced by stacking |
| the tabbar | **stays**, fixed at y=779, 65 tall (4.5rem), with its Chat button lit green — so the panel has to stop above it, not under it |
| the document | `scrollHeight === innerHeight`; nothing behind it scrolls |
| the cross | **navigates to `/`** (clicked it live and read the URL back) |

`#root` measured 116px tall there, which is what says the panel is fixed rather than flowed. Hence `.chat-public`: `position: fixed`, `inset: 0 0 4.5rem` off **the tabbar's own declared height** rather than a repeated measurement, `z-index: 100` so it covers the z-99 site header, and `.right-slide-content`'s two fills, because it is the same panel and `components/Chat` declares no background of its own.

**`margin: 0` IS LOAD-BEARING THERE AND NOTHING ABOUT THE SYMPTOM SAYS SO.** This page is the layout column's `:last-child`, which `MainLayout.css` gives `margin-bottom: 1rem`; a fixed box with BOTH insets named and `height: auto` solves `top + margin-top + height + margin-bottom + bottom = viewport`, so that inherited rem came off the bottom of the panel. Measured: it ended at 764.2 against a tabbar starting at 778.7, leaving a 15px strip of page showing between the two.

The cross is the drawer's own button to the class list (`end-2 top-3.5 z-[101] size-8 rounded-lg bg-layer5 p-0`), which is what the original does too — the live phone header's third square reports as `button.button.size-8.bg-layer5`. Only the action differs, and it is the one the route implies: there is no drawer to close, so it goes home.

**The full-screen loader is the one arm not reproduced.** It is the socket JOIN (`initRoom()`), which this build has no analogue for — `components/Chat` reads a room *list* and renders the site's own 12px inline spinner in the channel name while that lands. A second, full-viewport spinner in front of it would be this build's invention rather than a port.


