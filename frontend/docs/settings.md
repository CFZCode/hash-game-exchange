# Global Settings

Part of the bc.game rebuild notes. Index and cross-cutting rules: [../CLAUDE.md](../CLAUDE.md).

## Global Settings

`/settings/*` — six panes behind one rail, and what the account dropdown's "Global Settings" row and the mobile account page's settings link both point at. Its route is a layout with children, the same shape `/wallet` has:

```
{ path: "/settings", component: w("PageSettingLayout"),
  info: { dialog: m.mobile, guards: [ce] },
  children: [ { path: "", component: w("DialogPageSetting"),
                info: { guards: [() => !m.mobile && "/settings/account-info"] } },
              { path: "/account-info" }, { path: "/security" }, { path: "/preferences" },
              { path: "/verification" }, { path: "/payment" }, { path: "/whiteList" } ] }
```

**THE WHOLE FEATURE IS IN THE `account` FEDERATED REMOTE — the Help Center's finding paying out for the third time**, after `/user/enter` and My Profile. `w` resolves through `moduleName: "account"`, so none of these is in `/assets/` at all, and the mirror saved that remote without its lazy chunks. All seven came off `hash.game/modules/account/assets/` under the hashes the remote's own `manifest-zssWG_dx.js` (which **is** in the mirror) already lists: `index-B0Ab1fJ8.js` (the layout and the phone's menu page), `index-baue7lPM.js` (Account Info, 28 KB), `index-DA-0gLy9.js` (Security, 23 KB), `index-BgFc4GKH.js` (Preferences), `index-DUZ1QIOc.js` (Personal Verification, 40 KB), `index-0oESBrPp.js` (Payment Methods), `index-D7PTq2J_.js` (Whitelist Management) — plus `Privacy-ydLbf0kB.js`, `Status-DpPfKxTy.js`, `Tools-DlgQcNJh.js`, `index-DnPIrd_m.js` and a dozen icon chunks. **So nothing on any of the six panes is read off a screenshot**, in a feature where nine screenshots were supplied.

**EVERY FEED IS SHUT AND ALL ELEVEN WERE PROBED**, in the two flavours this project keeps meeting: `6002` for the `/account/*` family (connections, linked accounts, community links, KYC status, anti-phishing code) and a bare gateway `403` with `code: 4001` for `/account/online/status/my/` and the whole `/payment/*` half (both bind lists, the apply history, the whitelist and its check). The one that answers is `/account/open/unified-login-info/`, already in the project as a captured response — a login-domain catalogue rather than anything about an account, which is the same side of the split `game/support` sits on. So what renders comes from three places in order of preference: **the session fixture** (the profile card, every Security tile's state, both Preferences toggle pairs), **a chunk's own declared default** (`Privacy-ydLbf0kB.js`'s initial store literal, `f1` in the verification chunk, the anti-phishing resource's `initialValue`), and for exactly one list **the capture** — see below.

**`components/shared/MenuPageLayout` IS NEW AND IT IS THE WALLET'S OWN SHELL.** `fO` in the main bundle is the site's generic menu page, and this is its second call site, so it moved out of `pages/Wallet/index.jsx` under the rule `Select`, `GameTile` and `LocalAmountItem` moved under. **The settings capture confirms all three of its numbers with nothing tuned**, which is the first independent check that shell has had: at dpr 1.25 the rail box measures 300 image px (240 CSS — `w-60`), the gap to the pane 20 (16 — `gap-x-4`), and rail-left to pane-right 1518 (1214.4, i.e. `.main-layout-container`'s 1216 to within a rounding). The rail's rows measure 50 image px on an 8px inset — `h-10` inside `p-2` — and the heading's text lands at 88.8 CSS, which is `pt-3` plus half of `leading-8` under a 60px header. Only the WIDE arm is shared: the wallet's narrow arm is a horizontal pill strip under 1100 and this route's is a dialog holding a different chunk export, so each keeps its own.

**THE BARE `/settings` IS TWO DIFFERENT COMPONENTS, decided by the child's own guard.** `!m.mobile && "/settings/account-info"` redirects a desktop onto the first pane, so `DialogPageSetting` — a full-page list of the six rows in a `mt-4 rounded-lg bg-layer4 px-3 pb-1` card, each an `h-12` button with a `size-6 rounded bg-layer5` chevron box — only ever renders on a phone. The rail and that list are the same six entries rendered two ways, which is why `menu.js` holds the data and neither owns it. `SettingLayout` itself is `<Show when={!mobile} fallback={props.children}>`, so below the device line the layout draws nothing at all and the pane stands alone inside the dialog.

**The dialog is the one `dialog: m.mobile` route in this build that does NOT pass `pageGutter`**, and the difference is real rather than an oversight: every other such page carries the original's own `px-4 sm:px-0`, where these six carry a vertical rhythm (`py-4 sm:py-0`) and no horizontal inset at all — on the original that comes from `.dialog-content`'s own `padding-inline: 1rem` on a phone and from the pane column on a desktop. Zeroing the shell's half would put every card flush against the screen edges.

**The route and the rail disagree on case on the original**: the router declares the last child as `path: "/whiteList"` while the menu links to `/settings/whitelist`. Both routers match case-insensitively by default, so both spellings resolve either way; this build declares the route lowercase and accepts the capitalised one.

### The six panes

- **Account Info.** Five cards on the original and three that can render here — the middle two, Linked Accounts and Exclusive Communities, are `<Show when={list.length}>` over shut feeds, so they are not empty cards but no cards at all, which is what the capture shows. **Account Connections is the one list in this feature read off a capture**, and it is the documented last rung rather than a shortcut: the chunk was recovered, the endpoint probed, and the resource is a bare `Promise.all` with no `initialValue` to fall back on. Six rows, all disconnected, in the capture's own order. `openName` is both the printed label (through `capitalize`) and the icon switch's key, and that switch tests four names in two cases each — the server being inconsistent, not the component being defensive. The Verified tick is `F.tips`, an IMAGE out of the remote's asset map rather than an icon component: fifteen of that map's sixteen entries are base64 data URIs and this one is a real file, fetched under the plain name.
- **Security.** Six tiles under a strength badge, then the Sessions table. `V` in `Tools-DlgQcNJh.js` is the badge's whole logic and two things in it read as bugs and are the original's: `isMedium` and `isStrong` are not exclusive (every consumer tests strong first), and `isWeak` ignores the password entirely, so an account with a password and nothing else is Weak. **Both read "Weak"**, which took a fixture edit rather than a change here — see the note on `emailVerified` in `context/account.js`. The tiles' spacer + absolutely-positioned footer is one mechanism: from `sm` up the button leaves the flow and pins to the tile's bottom, and the `h-10` spacer reserves what it left, so every tile in a row ends the same height however its description wraps. The Passkey tile is the one with no `dark:` variants on its class list, so in the light theme it is filled layer5 where the other five are layer4 — kept as written. **All four of the tile's spacing numbers are the chunk's**, and the 20px between the description and the button is the site's own: the reserve is 12 + 40 + 24 = 76px while the button occupies the last 56 (`bottom-4` plus 40). Measured against the capture, this build's gap is the same. A tile can still look looser than its neighbour, because the ROW stretches every tile to the tallest and a description that wraps sets the height for all of them; the pair was briefly tightened to `pb-4` / `mt-2` on request and is reverted. Close Account is a seventh tile behind `<Show when={!1}>`, dead on the live site too, and the empty row it sits in is kept because `.settings-security-flex` is what would collapse if the count changed.
- **Preferences.** Four cards, and it carries **THE THIRD THEME CONTROL IN THIS BUILD** after the sidebar's pair and the mobile account page's — two cells that SET a theme rather than one that toggles, with a `bg-layer6` block sliding between them on an inline `left`. None of the three owns the state; all read `darken` and write `setTheme`. One line of `he` is deliberately not ported, exactly as on the account page: it also toggles `dark` onto `<html>`, which here would keep every `dark:` utility applying in the light theme. The Privacy block is three server toggles over one local one (Max profit alert reads `account.setting.maxbetAlert`, which is why it is the only one of the four that moves), and the Marketing pair is **one throttled request for both** — `pe(fn, 1000)` around a body carrying both fields, which is why each handler reads the other switch's current value.
- **Personal Verification.** The pane is a switch across seven states and **five of them are built now**; with fixtures on only `init` renders, and that payload is the chunk's own `f1` **plus the two `levelResults` it cannot draw without**, since the declared default carries an empty array and the pane gates its whole body on that array's length. **Against the iBitPlay backend the status is live, and building the arms is what made that mean anything** — the pane branched on nothing but `levelResults.length`, so a real status changed no pixel until `isVerified`, `isPending`, `isRetry` and `isReject` existed. Their KYC has ONE status and no levels, which had held this back as "synthesising two levels from one"; the answer is that **their KYC *is* the basic level** — name, date of birth, address, one identity document, and no `level` field anywhere in the module — so one record maps onto the one level it corresponds to and Advanced, which has no equivalent there, stays at `none`. `Rejected` maps to `rejected_retry` rather than `rejected_final`, because their review route can reject again after a resubmission and the final arm brings an Appeal flow that does not exist. Two arms stay unbuilt for the same kind of reason: `isManualPending` and `isKycUsed` each need a route that is not there. **2FA needed nothing** — the Security tile already reads `session.google2StepAuth` off the profile's `twoFactorEnabled`, and `/user/2fa/status` answers the same value for the same account, checked rather than assumed. `basic-kyc-level` is the site's own string, out of `link-main-CtXfDPOw.js` in the mirror where it is the fallback for `/settings/verify/${kycLevelName || "basic-kyc-level"}`; its sibling is the one inferred value in this feature, and nothing prints either. The caution banner is `text-error` on the box and `text-secondary` on the paragraph, so only the icon and the fill are red — that reads as a mistake in the capture and is the chunk's.
- **Payment Methods.** Two cards over three shut feeds, and the empty state is the capture: "No card yet! Please add a card" over the crocodile. **That message is desktop-only** — `mobile ? null : <p>…</p>` — so a phone with no cards gets an empty box under the Add button and no message at all, which reads as an oversight and is the chunk's. The tab pills and the Add button read `--Chip-Group-Tab` INLINE, which is why the pane is the one file that adds a class of its own (`settings-page`) to carry it.
- **Whitelist Management.** A switch that arms it, two filters and a table. **The Network filter's options are built from the list** — one entry per distinct `chain`, seeded with the All row — so an empty list leaves exactly that one option, the same arrangement the rollover pane's Bonus Type filter has. A STANDARD address prints its `label` in the Network cell and a UNIVERSAL one its `chain`: the same cell, two fields.

  **COMPLETE AS OF 2026-09-04 — all four writes, both confirms and the phone arm.** This was the last pane in the feature with controls that did nothing: Add, Edit and Delete were icons with no handler and the switch was inert, because until migration 039 there was no store behind any of them. The two forms are their own DIALOG ROUTES at every width (`{dialog: !0, guards: [ce]}`, not the `dialog: m.mobile` device test the six panes take), matched in `App.jsx` beside `<Routes>` and built in `components/modals/WhitelistAddress` from `Add-b1yefrqj.js` and `Edit-B-e1jOSZ.js`. Three departures, each forced by the platform and each argued at its call site: no `new-verify` code step, no universal address, and Edit renames rather than re-points. **Two of the chunk's own strings are wrong and are kept**: the edit dialog is titled "Add Address" and the disarm confirm is titled "Remove Passkey", both plainly forked from the file beside them; each has a named constant that is the one-line revert. The phone row and its three-dot menu were transcribed at the same time and had never rendered — `shot-whitelist.mjs` walks the delete through that menu specifically so they are not theory.

**One departure spans two of the panes and is phone-only**: every secondary line in Security Setup and Account Info takes `max-sm:font-semibold`, where the chunk leaves them at the body's 400 at both widths — the tiles' descriptions, the Contact Info labels and their two prose fallbacks, the User ID line, and each connection's state. **Semibold rather than `font-bold`, and that is the font set rather than a hedge**: this project ships Averta at 400/600/800 only, and CSS weight matching searches upward first, so 700 resolves to the 800 ExtraBold face — the trap the Vault Pro heading documents. 600 is the real step below it, and one word changes it. **Type SIZE was raised on the same two panes and reverted**, and the finding behind it is worth keeping: none of the four settings chunks carries a single `sm:text-*` pair, checked, so the original renders one size at every width — the only thing that moves type on a phone there is the root font-size, `clientWidth / 430 * 16`, which `utils/remScale.js` already ports.

### What came with it

**EVERY BUTTON HERE TAKES ITS SIZE FROM `ot`'S OWN DEFAULT, AND GETTING THAT WRONG IS WHAT MADE THEM ALL 8px TOO TALL.** `s = size || !mobile && "m"`, so a `.button` naming no size is `.button-m` — 2.5rem and `--radius-lg` — on a desktop and has no size class at all on a phone, where `.button`'s 3rem applies. Six of these twelve buttons named none, so they rendered at 48px: the Change button beside a 40px (`sm:h-10`) e-mail field, every Security tile's action, the KYC cards' Go, the Connect/Disconnect column and Payment's Add New Method. It is the SAME miss the Select triggers, the referral terms link and `PcNav`'s back button have each been corrected for, which is why it is now a hook — `pages/Settings/buttonSize.js` — rather than a class written out: `PcNav` can write it flat because it only renders where `!mobile`, and anything rendering at both widths has to make the device test. The six that name their own height keep it (a utility beats the layered rule) and still write the class, because the rendered DOM has it.

**`components/shared/Switch` was extracted**, since these pages render ten of them and the markup had been written out by hand three times already. It is a `<div>` and not a `<button>` — the chunk's own element, and forced at the Do Not Disturb call site, where it sits inside the row's `<button>`. The three older call sites still write their own and can migrate.

**`pages/Settings/Settings.css` is entirely the remote's, not the host's** — none of it is in the mirror's six stylesheets nor in the current deploy's `index-WymgNldA.css`, all checked, because the remote ships its own Tailwind build and its own handful of plain rules in `init-9cZaIprL.js`. Two things there are worth knowing. `bg-setting-yellow` / `bg-setting-red` / `fill-setting-yellow` are flat literals (`#ff9820`, `#fc3c3c`) that happen to equal `--warning` and `--error` exactly — the remote cannot see the host's tokens — and they correctly do not invert with the theme, since the badge they paint carries `text-alw_dark`. And **the security grid's breakpoint is 645px, not a Tailwind step**: `@media screen and (min-width: 645px)`, five pixels past `sm`, the only such line in this project. What makes the tiles wrap is `min-width: 640px` on the ROW rather than a second query — two columns while the pane is wide enough, one when it is not.

**`src/pages/Settings/icons.jsx` is GENERATED** — 34 marks from a dozen chunks, half of them their own file and half inlined in the page that draws them. Names are this file's where the remote's would collide with a different drawing already in the project, which is the `IconInform` / `IconCopy` / Vault Pro trap for the fourth time: `IconAdd` here is the account remote's plus and is not `AfterLogin/icons.jsx`'s.

**The `Status` / `status.js` pair could not both keep their names** — Windows' filesystem is case-insensitive, so `import Status from './Status'` resolved to the data module and the build failed with "default is not exported" pointing at a file that never claimed to export one. That is My Profile's `Medals.jsx` / `medals.js` trap a second time; the helper is `strength.js`.

### Change Password — the one action here that is wired

**`/user-action/password-change`, and it is the first control on any of these six panes to reach a real endpoint.** The tile's own handler names the destination: `b.passwordExist ? P.promisify_new("user-action")("password-change") : (…)("password-bind")`, and `/user-action/:action` is a real route — `component: w("ActionMain")`, in a group closed with `{ dialog: !0, guards: [ce] }`, so a login-guarded dialog route like the rest. `ActionMain` resolves through the remote's manifest to `Main-B0RluUp6.js`, which is **not** in the mirror and came off `hash.game/modules/account/assets/`; it is a switch over `:action` with EIGHT arms, of which the two password-change steps are built and the six e-mail/phone/2FA binding arms are not (each needs a code-issuing endpoint this build has none of). An unknown action renders nothing, which is what the original's `<Show>` with no fallback does too.

So every string, class list and element order in `components/modals/UserAction` is that chunk's, including the amber `rgba(255, 152, 32, 0.10)` notice, and `PasswordInput` with its three-bar meter is `PasswordInput-B8f8WVV4.js` with the strength ladder (`M1` in `utils-DobeMSOM.js`) transcribed arm for arm — a non-monotonic ladder with two quirks that read as bugs and are the original's; the notes are at `passwordLevel.js`.

**The flow is shorter than bc.game's, and the missing middle is an endpoint rather than a decision.** There, step one POSTs `/account/password/check/` to validate the old password alone, then runs `new-verify` with `scenario: "CHANGE_PASSWORD"` — an e-mail or 2FA code — and carries a `flowId` into step two. The platform here has one endpoint, `POST /user/auth/change-password` taking `{currentPassword, newPassword}` and no verification step, so the pre-check and the code step are not sent and a wrong old password is refused at the end of step two, which returns the flow to step one with the message on it. The RSA-and-timestamp wrapping both passwords get on the original is not applied either; the platform takes them plain and would reject a ciphertext.

**AN "ACCOUNT RESTRICTIONS" CONFIRM STANDS IN FRONT OF IT NOW, and it is the flow manager's own first step.** `pe(r)` in `index-CU_BJJlr.js` — the account remote's `userAction` manager, recovered off `hash.game` — does not navigate straight away: it raises `E`, a centred dialog titled "Account Restrictions" whose Confirm button is disabled behind a five-second countdown, and only routes to `/user-action/password-change` once that resolves true. Raised from the TILE rather than from the route, because that is where the original has it: a pasted `/user-action/password-change` skips it there too. The copy is the i18n template with its slots intact (`<1>` is `mx-1 font-semibold text-primary`, which is what makes the middle clause read white against the paragraph's secondary), and the hours come from `ee(type)` — **24 for a password, 48 for an e-mail or phone change**, both carried in `HOURS` although only the password arm is reachable here.

**AND IT REQUIRED A MIGRATION, WHICH IS THE POINT.** The dialog promises that withdrawals are disabled for 24 hours afterwards. Nothing on this platform did that, so porting the screen alone would have put the project's first false promise on screen, about money. Migration 040 adds `users.withdraw_locked_until`, `changePassword` writes it in the same transaction as the password and the session revoke, and both withdrawal rails refuse inside the window — the fiat one ahead of its KYC gate, so a player who is both unverified and frozen is told the temporary blocker first. See Part 4b.18 of `docs/backend-gaps.md`.

**What is not a departure is signing out afterwards.** The server revokes every session on success, the original's step two warns "Re-login will be required after setting password." above its button, and its success path ends `C.success(…), u("/logout")`. Both end signed out; this build signs out and goes home, because `closeOverlay` would land the signed-out visitor back on the login-guarded settings URL with the sign-in dialog over it.

Two things this turned up worth carrying: **`components/shared/Input` was extracted** at its second call site, which is this project's rule and here also the original's structure — the auth dialog's field and the remote's `PasswordInput` are both wrappers around the host's one `Input`, which is why their class lists agree to the character. And **`.input-label` is LAYERED** in `index.css`, because all three call sites write their own `mt-*` and an unlayered rule would beat those utilities outright.

**EVERY SECURITY TILE OPENS ITS MODAL AS OF 2026-09-04, and four of the six cannot submit.** Six cards, six screens, all recovered off `hash.game`: the four missing `user-action` arms (`email-bind`, `email-change`, `phone-bind`, `phone-change`) went into `components/modals/UserAction` beside the two that were already there; the 2FA disable is `components/modals/TwoFactorDisable`, a confirm and then a code-and-password form, raised from the tile because on the original it is a POPUP the flow manager raises rather than a route; the passkey intro is `components/modals/Passkey`; and the anti-phishing trio (`/settings/phishing/enter|create|detail`) is `components/modals/AntiPhishing`. Only the e-mail CHANGE and the 2FA DISABLE reach a route — and the e-mail one is blocked on SMTP, which is a configuration gap. The other four have no backend on this platform at all (`users` has no `email_verified` column, there is no SMS sender, no WebAuthn table, no anti-phishing field), so each form is drawn and each stays SILENT about the gap. Four explanatory sentences were written and then removed: none is in the chunks, and an invented line would be the only text on those screens bc.game never wrote. The reason each control is inert is in its component's note and in the table below, not on the screen. Three more went the same way — the whitelist edit form's "only the name can be changed" note, the add form's invented "saved for X only" line together with the whole universal-address row it sat in, and the edit form's "no longer open" fallback, where the chunk simply navigates back. `password-bind` is the one arm still unbuilt and is unreachable: every account here is created with a password, so the tile never offers "Set Password". Part 4b.19 of `docs/backend-gaps.md` has the table.

Still not built, each inert at its call site: the Contact Info buttons, `/settings/edit-profile` and `/settings/edit-avatar`, a session's Remove, every Connect and Disconnect (each opens a `payment-gateway.html` popup or a bind flow), the KYC cockpit behind both Go buttons and the appeal dialog behind a final rejection, Add New Method and the card forms, and the whitelist toggle's verification flow — which is the LAST of the `new-verify` omissions and by some way the one that matters most, since a whitelist a stolen session can add to is not a whitelist. (The whitelist's add/edit/delete dialogs were on this list and are built; see the pane's note above.)

**A ROUTER BUG THIS PANE'S HIT TESTING FOUND, and it affected all six.** `App.jsx` blanked the `/settings` layout with `element={settingsDialog ? null : <SettingsLayout />}`. React Router picks a route's children with `match.route.element ? element : outlet` — a truthy test — so `null` does not render nothing, it renders the OUTLET. On the seventeen LEAF routes using that same idiom it is harmless, because a leaf has no outlet; on `/settings`, the only route here with children, it meant **every pane was mounted twice on a phone**: once bare and invisible beneath the sheet, once inside it, each with its own reads and its own dialog state. It went unseen for as long as it did because both copies look identical and the top one is the one you touch. `<></>` is truthy, so it renders nothing and takes the children with it.



## Two-factor enrolment — the second tile on Security with a real destination

`twofa-bind` is one of the eight arms `Main-B0RluUp6.js` switches over (`email-bind`,
`email-change`, `phone-bind`, `phone-change`, `password-bind`, `password-change`,
`password-change-steptwo`, `twofa-bind`), so this is the original's own route and its own screen,
not a shape invented here. The chunk was fetched from `hash.game/modules/account/assets/` — it is
not in the mirror — and every class list, string and element order in `TwoFactorBind` is `We`'s
own, down to the two app-store marks, which are inline templates in that chunk (`Fe`, `Re`) and
are transcribed into `UserAction/icons.jsx`.

**`fix-bglayer6` on the two store tiles is dead.** It appears in the account remote's JS and in no
stylesheet — checked against the mirror's `index-DxOqNczA.css` *and* the current deploy's
`index-Dxw2IdQj.css`, which is the two-stylesheet check this project requires before calling a
class dead. Kept, and the tiles render with no fill on the original for the same reason.

`CopyInput` moved to `components/shared/` here, at its second call site: the referral link on the
mobile account page and this secret. It is one component on the original too — both import
`CopyInput-B_53zFi6.js` — so it is a move, not a merge of two lookalikes.

### Where it departs from the original

The platform asks for less than bc.game does, and the flow follows the platform:

- **No `new-verify` step.** bc.game gates the secret behind an e-mail or phone code
  (`scenario: "START_GOOGLE_2FA"`) and carries a `flowId` into the enable call. Nothing here
  issues that code, so `POST /user/2fa/enable` hands the secret over on the first call.
- **No login-password field.** bc.game's `/2-step-auth/start/v2/` takes `{code, timestamp,
  password}` and gates its button on both. `setup-verify` is `.strict()` over `{code}` alone, so a
  password would be a `422` rather than an ignored extra. The field is dropped rather than
  rendered dead — a required input whose value is discarded is a worse lie than an absent one —
  and "Verification Code" takes the `mt-6` the original gives its first label.
- **The QR is a data URI.** `enable` answers `{qrCode, secret}` where `qrCode` is
  `data:image/png;base64,…`, so it goes straight into `<img src>`; the original points at
  `/api/account/google/2-step-auth/key/qrcode/320/`. One fewer request, and not a choice.
- **The two store tiles are `<a>`** where the chunk uses a `<div>` with a click handler. Same
  classes; nothing nests them inside another control, so a link that is a link.

**Disable is deliberately not wired** and the tile still says "Disable 2FA" when it is on.
`POST /user/2fa/disable` takes `{code, password}` and there is no unbind arm in that eight-way
switch to port a screen from. Inventing it is the part this build does not do.

### Two things worth knowing before testing it

**Codes are burned.** The service burns the TOTP step it accepts, so a code used to sign in cannot
then be used to disable inside the same 30-second window — the second call answers
`TWOFA_INVALID_CODE`. Verified by hitting exactly that and having to wait a window out.

**That refusal is a `401`**, which is the same defect gap 22 records for
`AUTH_CURRENT_PASSWORD_INCORRECT`: this project's transport reads a 401 as "the access token has
expired", so it refreshes and replays. A wrong 2FA code therefore reaches the server twice and
rotates a refresh token on the way, exactly as a wrong password does.

## The KYC submission form — the one screen here that is not a port

**bc.game has no KYC form of its own.** `/settings/verify/:levelName` is
`DialogVerificationCockpit`, and `Cockpit-CxSiBuuQ.js` is, in full, an access-token fetch and a
launch of **Sumsub's hosted WebSDK** into `<div id="sumsub-websdk-container">`:

```js
_.init(container, () => get(`/account/kyc/accessToken/?levelName=${levelName}`))
  .withConf({lang, theme, country}).withOptions({addViewportTag:false, adaptIframeHeight:true})
  .build().launch("#sumsub-websdk-container")
```

Every field a bc.game visitor fills in belongs to a third party and is in no chunk. It is the same
arrangement `/sports` has with BetBy. So there was nothing to transcribe, and the form in
`components/modals/Verification` is this build's own — the first screen in the project of which
that is true, which is why it says so at the top of the file rather than leaving it to be found.

**What is still recovered, and is used rather than invented alongside it:** the route itself, from
`Enter-MsmOuq5R.js`'s registry — it declares no `dialog` key of its own, so it inherits the
group's `dialog: !0` and is a dialog at every width, unlike the six panes' `dialog: m.mobile`
device test; the shell `<div class="relative pt-4"><div class="min-h-80">`; and the dialog title
"Personal Verification". The FIELDS are not chosen here either — `kyc.validators.js` dictates all
eight, their limits and the document enum.

**The size is the manager's default, and `[30, 12]` is NOT this route's** — an earlier draft of
this note said it was. `y3` returns `{size: "s"}` for a route whose `info.dialog` is absent or
bare `true`, and `v3` maps a string `"s"` to no class and no inline style, so the card is
`.pc .dialog-list`'s own **30rem x 40rem**. `[30, 12]` belongs to the sibling `verify/enter` route,
the country picker. Other string sizes become `dialog-m` (40rem wide) and `dialog-l` (50rem); an
array becomes inline `width`/`height` in rem, which is how the auth dialog gets its
29.375rem x 45rem.

### The country picker is the modal Go actually opens

**Both Go buttons open `/settings/verify/enter/:levelName`, not the form** — `CockpitEnter-ztfv3WYR.js`,
a short card holding one Select and one button. An earlier pass here skipped it, reasoning that
its only job is to feed Sumsub's `withConf({country})`; that was wrong about what a visitor sees,
and it is now built.

**Its size is what makes it look completely unlike the form**, and it is the one thing on either
route's registry entry: `info.dialog.size = m.mobile ? void 0 : [30, 12]`. `v3` turns an ARRAY
size into inline `width`/`height` in rem, so the picker is **480 x 192** where the cockpit — which
declares no size and takes the manager's `{size: "s"}` default — is `.pc .dialog-list`'s
**480 x 640**. Both measured in the browser after wiring.

Title "Select Country", a `w-full bg-layer3` Select over
`mt-4 flex h-full w-full flex-col items-center justify-around gap-4`, and a full-width brand
Confirm that navigates with `{replace: true}` — all the chunk's own.

Two departures, both forced. `state.areaCodes` comes from `POST /account/phone/get/area/`, which
answers **403 on this deploy for POST and GET alike**; its declared default is `[]`, so a faithful
render of the shut feed is a picker holding only "Other". `data/countries.js` stands in and says
why nothing in it is invented — ISO 3166-1 codes, names from `Intl.DisplayNames`, flags computed
from the code's letters. And `shufti/` is not built: Philippines is the one country the original
routes to a second provider, which is as absent here as Sumsub. PH goes where everything else
goes.

`?country=` is carried on BOTH arms where the original passes it only to shufti. There it
configures a hosted SDK; here the next screen is a form with a country field, so the answer is
worth keeping — which is what stops this step being a screen that collects one value twice.

### What the endpoint takes

`POST /user/kyc/submit` is **multipart, not JSON** — `multer` with three named file fields beside
the text ones, and the only call in the project that hands `request` a `FormData`. That works
because `send()` spreads `init` into `fetch` and sets a Content-Type only when `json` is given:
FormData needs the browser to write its own multipart boundary, and an explicit header breaks it.

Text: `firstName`, `lastName`, `gender` (optional enum), `dateOfBirth`, `address`, `city`,
`country`, `documentType` (`id_card` | `passport` | `driving_licence`). Files: `idFront`,
`idBack`, `passport` — one each, 5 MB, JPEG/PNG/PDF, and the platform checks **magic bytes** rather
than the declared mime, so a renamed file is refused server-side however the picker labelled it.

None of the three files is required by the service, so which ones the form asks for is a matter of
what the document type means rather than what the endpoint enforces: a passport is one page, the
other two have sides. Changing the type clears the files already picked, so nothing is sent under
a field the reviewer will not look at.

`dateOfBirth` is refused outside `age >= 18 && age <= 120`, and "You must be at least 18 years old"
is the platform's own message. The form checks it too, in those words — the same reason the
password dialog checks its two rules on the client. It is NOT enforced with the date input's `max`
attribute, which would be tidier: the shared `Input` forwards a fixed prop list and does not
spread, and widening a primitive used across the project for one call site is the wrong trade.

`levelName` is taken but never sent: their KYC has one level and no `level` field anywhere in the
module. It stays in the path because the original's route has it.

**The two upload refusals are the site's own words**, out of the i18n bundle rather than written
here: "Upload file size exceeds __size__" (the account remote spells its own as "Upload file size
exceeds 10MB", so only the number moves — this platform's cap is 5 MB) and "Please upload a common
image format (e.g., JPG, PNG)", widened to name PDF because `ALLOWED_MIME` takes it and bc.game's
line does not. The type test is a courtesy and not the check: the platform reads magic bytes and
refuses a renamed file whatever `accept` and `file.type` claim.

**What the original shows here is Sumsub, and that was confirmed three ways** before deciding to
keep this form. `Cockpit-CxSiBuuQ.js` is entirely SDK init — a spinner, the container and an
access-token fetch. bc.game's full en-US i18n bundle contains **zero** occurrences of "Date of
Birth", "Document Type" or "Proof of Address", because it never renders those fields. And the
iBitPlay backend has no Sumsub, Shufti, Onfido, Jumio or Veriff integration anywhere — only its
own endpoint. Matching bc.game's screen would mean buying a vendor account, adding an access-token
route and leaving `user_kyc` unused; the form is what feeds the platform that exists.

Verified end to end against the running platform: the form fills, both files upload, the record
lands with `status: Pending` and `documents: {idFront: true, idBack: true}`, and the test row was
deleted afterwards so the seeded Verified application is the only one left. The card measures
480x640 and `.dialog-content scroll-y` scrolls its 845px of content, so Submit is reachable.

## Edit Profile — Account Info's Edit button

`/settings/edit-profile`, `DialogEditProfile` in the registry, `Ze` in `Profile-D32vXKY5.js` —
fetched from `hash.game/modules/account/assets/`, not in the mirror. **The button already
navigated there**; what was missing was a dialog at the other end, so the route fell to the
catch-all and rendered the pane shell underneath.

The template (`Fe`) is a 160px avatar circle with an "Edit Your Avatar" button pinned to its
bottom, the Username label, its input, an error line, the hint "Do not use special symbols,
otherwise your account may not be supported.", an "Avatar Frame" heading beside the selected
frame's description, the frame grid, and Save.

### The avatar-frame grid, and a correction

An earlier version of this note said the frame half could not be built because
`userAvatarFrameList` comes from a shut feed. **That was wrong, and it is worth reading why**: the
feed IS shut, but the conclusion did not follow. The live page draws ten cells, and their layout,
order, templates, badge and padlock are all in the chunk. What the feed carries is which frames an
account OWNS — and the mirror's capture of `/api/account/get/` is logged-out, so it reads `null`
there. Treating an empty default as an empty feature is the mistake; the screenshot of the real
page is what corrected it.

**What is recovered:** the display order, which is `Y` with `Oe` removed —
`[0, 9, 6, 7, 1, 2, 3, 8, 4, 5]`, exactly the ten cells the live page draws, with id 0 as the
"Not used" cell rather than a ring; the `h-[98px]` cell, the `bg-brand` "In use" pill, the dashed
`border-[#697072]` circle and the `#3A4142` selected background, all verbatim; the padlock, which
is the chunk's own `be`; and the rule that keeps two things apart — **the "In use" pill hangs off
the frame's `status`, while SELECTION is only the cell background**, so clicking a locked ring
previews it without claiming it is worn.

**What is not:** the ring artwork. The original draws each with a lazily-registered `Frame`
component (`T3("Frame")`, keyed on the id) that is in no saved chunk, and there is not one frame
image anywhere in the mirror. The nine rings are drawn here instead — concentric strokes in the
colours the live page shows, with gems on the two ornate ones. They are the only invented artwork
in this project and are isolated in `modals/EditProfile/frames.jsx` so they can be replaced the
day the real component can be had.

**Every ring is locked, and that is the truthful state twice over:** it is what a fresh account
sees, and this platform has no frame concept at all — `avatar` is a string up to 500 characters,
there is no frame table, no unlock route, and nothing on `PUT /user/profile` that would accept a
choice. So Save still sends only the name.

The circle draws a real avatar (the same `105522617.png` the header imports) and its button is
kept INERT, since `/settings/edit-avatar` is a second 55 KB chunk that is the frame picker again.
`fix-bglayer5` on the circle is dead the way `fix-bglayer6` is — neither stylesheet has it, both
checked.

### Two checks the original makes and this cannot

- `POST /account/username/change/check` answers whether a change is allowed at all, and the input
  is **disabled** with the tooltip "You can update your username once a month." when it is not.
  The platform has no such route and no such rule, so the field is always enabled.
- `POST /account/username/check`, debounced at 500 ms while typing, answers `status` 0 free /
  1 malformed / 2–3 taken. There is no availability route either, so a collision surfaces as
  `USERNAME_TAKEN` from the PUT, on the field, at Save.

The SHAPE rule is checked as you type, because that one needs no server — and it is **the
platform's**: `/^[A-Za-z0-9_.-]+$/` over 3..30, in the platform's own words. bc.game's message
names 3–20 and letters-required ("Username must be 3-20 characters and include letters(requried),
numbers or '_'." — the typo is theirs), a rule this server does not enforce, so repeating it would
describe something that will not happen.

`PUT /user/profile` also takes `country` and `avatar`. Neither is sent: the original's dialog has
no control for either, and adding one would be this build inventing a field the screen does not
have. An empty body is refused with `422 "Nothing to update"`.

Verified end to end: the dialog opens at 480x640, Save is disabled while the name is unchanged,
the two shape refusals show the platform's wording, a valid change saves and the pane's name
updates — and the demo account was renamed back afterwards, since every harness signs in as it.

### Documents already on file

`GET /user/kyc/documents/:kycId/:field` is wired, and shows the account's previously submitted
documents above the form that would replace them.

**It is reachable in the arm that matters.** The pane disables its Go row while a submission is
Pending (`disabled={isPending}`, the original's own gate) and enables it once one is Rejected —
which is exactly when someone resubmitting wants to see what they sent last time.

Two things shape how it is read. **The route is authenticated**, so unlike a banner image the URL
cannot go into an `<img src>`: the browser would fetch it without the bearer token and get a 401.
`client.js` already answers a non-JSON body as a `Blob`, and a Blob has no `success` key so
`unwrap` hands it straight back — so it is fetched like any other read and turned into an object
URL, which the component revokes on unmount. These are photographs of identity papers; leaving one
pinned for the life of the document is the wrong default even though nothing else would notice.

**And it needs a `kycId` that nothing used to give a player** — `GET /user/kyc/status` returned the
status, the dates, the document type and which documents exist, and never the row's id. That is
the second backend change made from here; Part 4b of `docs/backend-gaps.md` records it.

A field with no file answers `404 DOCUMENT_NOT_FOUND`, the same code as a foreign id, so an absent
document is a refusal to catch rather than an empty body — which is why `status.documents` is read
first and only the fields it marks present are asked for.

Verified end to end: a submission with `idFront` and `idBack` renders both from `blob:` URLs with
real dimensions, a foreign kycId answers 404, and the test submission was deleted afterwards.
