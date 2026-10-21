---
name: mobile-sheet-scroll
description: Audit and fix scrolling in the player site's mobile bottom sheets and full-screen dialogs (PopCenter sheets, Select sheets, the currency sheet, RouteDialog / DialogShell routes below lg) with real touch swipes over CDP. Use when the user says "mobile view me bottom se jo modal khulte hai unme scroll/overflow nahi ho raha", "sheet scroll nahi hoti", "dialog ka content kat raha hai".
---

# Mobile sheet / dialog scroll audit

## What a sheet is in this frontend

| Kind | Markup | Scroller |
| --- | --- | --- |
| Bottom sheet (`PopCenter type="sheet"/"bottom"`, every `Select` below lg, CurrencySelect, deposit-offer detail, Refer, 2FA) | `.pop-overlayer > .pop-bottomsheet` (`max-height: 80%`) | `.scroll-y.pop-content` |
| Language/currency sheet | own markup, same classes | `.scroll-y.pop-content` |
| Full-screen dialog route below lg (`/deposit`, `/notification`, `/bonus`, `/settings/*`, `/referral/*`, `/vip-*`, `/user/*`, `/login/*`) | `RouteDialog` / `DialogShell` → `.dialog-item` | `.dialog-content.scroll-y` |

Drag-to-dismiss is `src/hooks/useSheetDrag.js`. It only arms when the nearest scroller is within 16px of its top, so it doesn't block scrolling.

## Root cause found (21 Oct 2026)

`.scroll-y` sets `overscroll-behavior: contain`. A panel that brings its own `.scroll-y h-full` and sits inside a dialog's `.scroll-y` became a second scroller. With nothing to scroll, it still swallowed the swipe, so the dialog body never moved. `/notification` on a phone had this.

The fix is in `src/index.css`: `.scroll-y .scroll-y { overscroll-behavior-y: auto }`. Inner scrollers now chain to the outer one, and the outermost one still contains, so the page behind stays put. **Don't add `overscroll-contain` to a scroller that lives inside a sheet.**

## Running the audit

Set up the browser:
- Use the CDP Chrome on port 9333.
- Open a NEW isolated page on `http://localhost:5190`.
- `emulate` it with viewport `390x844x3,mobile,touch`, and also with `360x640x3,mobile,touch`.
- To sign in, `POST /api/v1/user/auth/login {identifier,password}` with a test player, then put the response into `localStorage['api-session']`.

Then run:

```bash
cd .claude/skills/mobile-sheet-scroll
node audit.mjs localhost:5190 http://localhost:5190 /notification /deposit '/deposit@^Fiat$' '/casino/slots@^Sort' '/deposit-offer@detail|rules|view' '/@USDT' /settings/security /referral /vip-detail /user/enter
```

How `audit.mjs` works:
- `route@regex` opens the route, then taps the first visible button whose text matches. That is how a sheet opens.
- Each case reports one result:

  | Result | Meaning |
  | --- | --- |
  | `PASS` | Fits, or a real touch swipe (`Input.dispatchTouchEvent`) moved the scroller |
  | `FAIL-NO-SCROLL` | Overflowing, but the swipe didn't move it |
  | `FAIL-CLIPPED` | Content sits below the panel and nothing can scroll to it |
  | `NO-DIALOG` / `NO-TRIGGER` | The route or the button didn't open anything |

- `SETTLE_MS` sets the wait after navigation (default 5000).
- Rows that are hidden in a collapsed accordion don't count as clipped.

Other helpers:
- `touch-scroll.mjs <url-part>`: swipes the sheet that is already open.
- `wheel.mjs <url-part>`: the same, with the mouse wheel (desktop device mode).
- `probe.js` (`evaluate_script` sourcePath): lists the open panels and their scrollers.

## Checked on 21 Oct 2026, at 390×844 and 360×640, signed in

- Before the fix, only `/notification` failed (FAIL-NO-SCROLL). After the fix it passes.
- These all PASS:
  - The Sort, Providers and More Select sheets, the currency sheet, the deposit-offer terms sheet and Archived.
  - `/deposit` (Crypto and Fiat), `/wallet/withdraw`, `/bonus`, `/vip-level`, `/vip-detail` and `/user/enter`.
  - The `/settings/*` and `/referral/*` routes, `/recent`, `/favorite` and `/login/*`.

## Wallet tables (Transaction, Bet history, Rollover)

To check a table fits a phone, open `/wallet/transaction` or `/wallet/bet-history` at 360 and 390px. Then run `table-check.js` (evaluate_script sourcePath). It does two things:
- It picks the widest time range, then switches through every option of the first filter (Bill / Deposit / Withdraw / Swap / Bonus, or All / Original / …).
- It reports the rows, any page side-scroll, and every cell whose text is cut.

Fixed on 21 Oct 2026. The shared `Table` CELL is compact below sm (`px-2`, `text-sm`, `min-w-0`), and the other fixes are:

| Problem | Fix |
| --- | --- |
| The long timestamp didn't fit | `CellTime` shows the date over the time |
| `CurrencyAmount` crowded the cell on a phone | It drops " USDT" (the icon names the coin) and the fiat icon (₹ is in the text) |
| Long type names were cut | They wrap to two lines |
| The Rollover turnover didn't fit | It hides the coin code on a phone |

Use `fit-audit.mjs` to check many pages at both widths in one run:

```bash
node fit-audit.mjs localhost:5190 http://localhost:5190 '/wallet/transaction*' '/wallet/bet-history*' /wallet/rollover /sports/my-bets /sports/statement
```

It runs every route at 360×640 (touch) and again at 1280×900, and reports any page side-scroll and any cut text. A `*` after a route also runs `table-check.js` there.

Run on 21 Oct 2026 as parkertest01: bet history (every filter), rollover, `/sports/my-bets` and `/sports/statement` were all clean at both widths. The one flag was desktop bet history → Sports, where the time and match name are deliberately shortened with "…" and the row's chevron opens the full detail. That is intended, not a bug.

## Not covered

- A real iPhone or Safari. CDP emulates Chrome only, so check iOS by hand.
- Sheets behind data this test player doesn't have: transaction detail, Refer, 2FA and Manage Assets.

## Rules

- Browser: never touch the user's own pages, and work only in your own isolated context.
- When you fix a sheet, re-run its route through `audit.mjs` and paste the before and after lines.
