import { supportedLang } from '../../components/modals/LanguageCurrencyModal/languages';
import { brandLabel } from '../../services/siteBranding';
import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import EmptyPlaceholder from '../../components/shared/EmptyPlaceholder';
import Loading from '../../components/shared/Loading';
import { useResource } from '../../hooks/useResource';
import { useSession } from '../../context/session';
import PopCenter from '../../components/shared/PopCenter';
import Select from '../../components/shared/Select';
import { toast } from '../../components/shared/Toast/toast';
import { getGame, launchGame, launchCurrency } from '../../services/game';
import { tagWords } from '../../services/catalog';
import { getAlias, printCurrency } from '../../utils/currency';
import { addFavoriteGame, isFavoriteGame, removeFavoriteGame } from '../../services/collection';
import { formatOnlineUsers } from '../../utils/gameArt';
import './Game.css';

/* `/game/:gameUnique` — where every game tile points, and the original's own path and param name
 * (`{path:"/game/:gameUnique"}` in Enter-MsmOuq5R.js). Until this page existed the tiles were
 * `href="#"`: a click did nothing, which is the one thing a game tile must not do.
 *
 * ── WHAT THIS PAGE IS, AND WHAT IT IS NOT ────────────────────────────────────────────────────
 *
 * On bc.game the route mounts the game's own client and wraps it in a shell: the play area with a
 * toolbar under it, a side panel of live players, and an info card below — the name, "By
 * <provider>", the tags as `#` chips, and House Edge / RTP / Max Win / Stakes Range. Captured on
 * hash.game at 1280 and on a 390 phone, where the same blocks stack.
 *
 * The SHELL is built here, and the PLAY AREA is the original's slot launcher (`docs/casino.md`,
 * "Opening a game"): nothing launches on arrival; the frame shows the game's cover under the
 * original's overlay card — Sign in for a visitor, "Play With Deposit Balance" for a player —
 * and Play POSTs the launch and frames the URL that comes back. Any failure opens the original's
 * "Under Maintenance" dialog (`GameUnavailable` below). A third-party game takes the original's
 * slot layout — a 16:9 frame and no live-players panel, which belongs to the BC Originals client.
 *
 * An unknown slug (or a game an owner switched off, which reads the same) renders the site's
 * empty state under the slug as its title — the list pages' own fallback chain
 * (`searchParams.label ?? MAP[key] ?? key`) one route over — and opens the same dialog on arrival,
 * which is where the original pushes it (`DISABLED_PLAYING` on the detail read).
 */

/* `--` is what the original prints for a figure it does not have (the level card's next tier,
   the vault's return); the same sentinel here for the four stats no source carries. */
const UNKNOWN = '--';

/** The game's RTP in percent from the provider's `parameters`, or null. */
function rtpOf(game) {
  const rtp = Number(game?.parameters?.rtp);
  return Number.isFinite(rtp) && rtp > 0 && rtp <= 100 ? rtp : null;
}

function Stat({ label, value = UNKNOWN }) {
  return (
    <div className="game-stat">
      <p className="game-stat-label">{label}</p>
      <p className="game-stat-value">{value}</p>
    </div>
  );
}

/* ── THE TWO STARS ARE THE ORIGINAL'S, RECOVERED THROUGH THE `games` REMOTE ───────────────────
 *
 * `/game/:gameUnique` resolves to `X("GameLayout")`, and `X` is `zt(Io)` where `Io` imports
 * `/modules/games/remoteEntry.js` — so this route is NOT in `/assets/` at all and nothing about
 * it is in the mirror. That is rung 3 of the recovery ladder, and an earlier pass here stopped
 * at rung 1 and concluded from the mirror's stylesheet that the original had no favourite
 * styling. It has all of it. remoteEntry -> `manifest-kUovHkMN.js` -> `GameLayout: np` ->
 * `Layout-DI8MpYIQ.js`, where the toolbar component `Ro` renders:
 *
 *   l(Sr, { class: K("size-5 mb-0.5", e.isFavorite ? "fill-warning" : "fill-secondary"),
 *           component: e.isFavorite ? ol : ll })
 *
 * Three things follow, and this build had all three wrong:
 *
 *   THE COLOUR IS `fill-warning`, a token this project already carries (#FF9820 dark, #e68c21
 *   light) — not a gold picked from elsewhere in the palette.
 *   THE ICON SWAPS. `ol` is the M15.2579 25.0916L10.3082 27.8097C9.52925 28.2367 8.56657 27.925 8.15768 27.1115C7.99465 26.788 7.93858 26.4169 7.99724 26.0565L8.94267 20.2996C9.03152 19.76 8.85986 19.2095 8.48462 18.8275L4.48034 14.7509C3.85062 14.1094 3.83768 13.0562 4.45187 12.3986C4.69685 12.1364 5.01689 11.9661 5.36366 11.9139L10.8974 11.0742C11.4158 10.9958 11.8644 10.6553 12.0964 10.1643L14.5713 4.92726C14.9603 4.10382 15.9152 3.76508 16.7045 4.17139C17.0185 4.33356 17.273 4.59843 17.4283 4.92726L19.9031 10.1643C20.1352 10.6553 20.5837 10.9958 21.1022 11.0742L26.6359 11.9139C27.5062 12.0463 28.1092 12.8905 27.9833 13.7995C27.9332 14.1617 27.7693 14.4959 27.5192 14.7518L23.5149 18.8284C23.1397 19.2104 22.968 19.7609 23.0569 20.3005L24.0023 26.0574C24.1507 26.9628 23.5684 27.8223 22.7015 27.9781C22.3564 28.0403 22.001 27.9808 21.6913 27.8106L16.7416 25.0925C16.2775 24.8375 15.7237 24.8375 15.2596 25.0925L15.2579 25.0916Z star (`sl`), `ll` the M14.5713 4.92774C14.9603 4.1043 15.9157 3.76557 16.705 4.17188C17.019 4.33405 17.2734 4.59894 17.4287 4.92774L19.9033 10.165C20.1353 10.656 20.5841 10.9968 21.1025 11.0752L26.6367 11.9141C27.5069 12.0467 28.1092 12.8909 27.9834 13.7998C27.9333 14.1619 27.7696 14.4961 27.5195 14.752L23.5156 18.8291C23.1404 19.2111 22.9688 19.7612 23.0576 20.3008L24.0029 26.0576C24.1512 26.963 23.5689 27.8226 22.7021 27.9785C22.3571 28.0407 22.001 27.9818 21.6914 27.8115L16.7422 25.0928C16.2781 24.8378 15.7238 24.8378 15.2597 25.0928L15.2588 25.0918L10.3086 27.8106L10.1611 27.8818C9.41202 28.1967 8.54163 27.8749 8.15817 27.1123C8.01549 26.8293 7.95504 26.5093 7.98141 26.1924L7.99801 26.0567L8.94332 20.2998C9.02097 19.8277 8.89922 19.3471 8.61617 18.9785L8.48531 18.8281L4.48043 14.751C3.85117 14.1096 3.83832 13.057 4.45211 12.3994C4.69709 12.1373 5.01745 11.9663 5.36422 11.9141L10.8974 11.0752C11.351 11.0066 11.7516 10.7369 12 10.3418L12.0966 10.165L14.5713 4.92774ZM13.9052 11.0195C13.401 12.0864 12.4023 12.8684 11.1972 13.0508L11.1982 13.0518L6.33883 13.7891L9.91207 17.4268C10.7444 18.2743 11.1071 19.4701 10.917 20.625L10.0918 25.6465L15.2353 22.8233L15.4668 22.9434C16.2248 22.8271 17.011 22.9586 17.705 23.3399L21.9082 25.6475L21.0839 20.626L21.0546 20.4092C20.9407 19.3229 21.3083 18.2223 22.0888 17.4277L25.6611 13.7891L20.8027 13.0518C19.5979 12.8692 18.5998 12.0861 18.0957 11.0195L16 6.58595L13.9052 11.0195Z (`il`). Recolouring one path
 *   is not what the original does, and at a glance the outline is what reads as "not saved".
 *   SIGNED OUT, THE STAR OPENS SIGN-IN. `handleFavorite` opens with
 *   `if (!z.login) { X.emit("navigate", "/login/signin"); return }` — it is not inert.
 *
 * `il` ships its path TWICE in the chunk, identically. Drawn once here; a duplicate subpath is a
 * build artefact, not a second stroke.
 */
const IconStarSolid = ({ className = '' }) => (
  <svg viewBox="0 0 32 32" className={className}>
    <path d="M15.2579 25.0916L10.3082 27.8097C9.52925 28.2367 8.56657 27.925 8.15768 27.1115C7.99465 26.788 7.93858 26.4169 7.99724 26.0565L8.94267 20.2996C9.03152 19.76 8.85986 19.2095 8.48462 18.8275L4.48034 14.7509C3.85062 14.1094 3.83768 13.0562 4.45187 12.3986C4.69685 12.1364 5.01689 11.9661 5.36366 11.9139L10.8974 11.0742C11.4158 10.9958 11.8644 10.6553 12.0964 10.1643L14.5713 4.92726C14.9603 4.10382 15.9152 3.76508 16.7045 4.17139C17.0185 4.33356 17.273 4.59843 17.4283 4.92726L19.9031 10.1643C20.1352 10.6553 20.5837 10.9958 21.1022 11.0742L26.6359 11.9139C27.5062 12.0463 28.1092 12.8905 27.9833 13.7995C27.9332 14.1617 27.7693 14.4959 27.5192 14.7518L23.5149 18.8284C23.1397 19.2104 22.968 19.7609 23.0569 20.3005L24.0023 26.0574C24.1507 26.9628 23.5684 27.8223 22.7015 27.9781C22.3564 28.0403 22.001 27.9808 21.6913 27.8106L16.7416 25.0925C16.2775 24.8375 15.7237 24.8375 15.2596 25.0925L15.2579 25.0916Z" />
  </svg>
);

const IconStarOutline = ({ className = '' }) => (
  <svg viewBox="0 0 32 32" className={className}>
    <path d="M14.5713 4.92774C14.9603 4.1043 15.9157 3.76557 16.705 4.17188C17.019 4.33405 17.2734 4.59894 17.4287 4.92774L19.9033 10.165C20.1353 10.656 20.5841 10.9968 21.1025 11.0752L26.6367 11.9141C27.5069 12.0467 28.1092 12.8909 27.9834 13.7998C27.9333 14.1619 27.7696 14.4961 27.5195 14.752L23.5156 18.8291C23.1404 19.2111 22.9688 19.7612 23.0576 20.3008L24.0029 26.0576C24.1512 26.963 23.5689 27.8226 22.7021 27.9785C22.3571 28.0407 22.001 27.9818 21.6914 27.8115L16.7422 25.0928C16.2781 24.8378 15.7238 24.8378 15.2597 25.0928L15.2588 25.0918L10.3086 27.8106L10.1611 27.8818C9.41202 28.1967 8.54163 27.8749 8.15817 27.1123C8.01549 26.8293 7.95504 26.5093 7.98141 26.1924L7.99801 26.0567L8.94332 20.2998C9.02097 19.8277 8.89922 19.3471 8.61617 18.9785L8.48531 18.8281L4.48043 14.751C3.85117 14.1096 3.83832 13.057 4.45211 12.3994C4.69709 12.1373 5.01745 11.9663 5.36422 11.9141L10.8974 11.0752C11.351 11.0066 11.7516 10.7369 12 10.3418L12.0966 10.165L14.5713 4.92774ZM13.9052 11.0195C13.401 12.0864 12.4023 12.8684 11.1972 13.0508L11.1982 13.0518L6.33883 13.7891L9.91207 17.4268C10.7444 18.2743 11.1071 19.4701 10.917 20.625L10.0918 25.6465L15.2353 22.8233L15.4668 22.9434C16.2248 22.8271 17.011 22.9586 17.705 23.3399L21.9082 25.6475L21.0839 20.626L21.0546 20.4092C20.9407 19.3229 21.3083 18.2223 22.0888 17.4277L25.6611 13.7891L20.8027 13.0518C19.5979 12.8692 18.5998 12.0861 18.0957 11.0195L16 6.58595L13.9052 11.0195Z" />
  </svg>
);

/* `Start-DxpZl6gi.js` in the `games` remote — the play-circle every launcher button carries
   (`size-4 mr-2`), Sign in included. */
const IconStart = ({ className = '' }) => (
  <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
    <path d="M16 2.5C8.544 2.5 2.5 8.544 2.5 16S8.544 29.5 16 29.5 29.5 23.456 29.5 16v-.007C29.492 8.542 23.452 2.504 16 2.5m0 24.684c-6.181 0-11.191-5.01-11.191-11.191S9.819 4.802 16 4.802s11.191 5.01 11.191 11.191c-.008 6.178-5.014 11.183-11.19 11.191z" />
    <path d="m20.41 14.454-5.27-3.044a1.782 1.782 0 0 0-2.676 1.539v6.093a1.782 1.782 0 0 0 2.685 1.537l-.008.005 5.27-3.044a1.776 1.776 0 0 0 .008-3.081z" />
  </svg>
);

/* The wrench, `oe` in `GamePageData-B2XkLpDN.js` — drawn in its own `#B1B9B9` (the
   `text-warning` beside it is dead: the path's fill wins). */
const IconWrench = ({ className = '' }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
    <path
      d="M35.6049 37.3046C34.5491 37.3046 33.6946 36.4476 33.6946 35.3893C33.6946 34.331 34.5504 33.4728 35.6049 33.4728C36.6608 33.4728 37.5153 34.331 37.5153 35.3893C37.5153 36.4476 36.6595 37.3046 35.6049 37.3046ZM39.5429 31.5377C37.1362 29.3594 32.5906 25.1917 29.4788 22.333C30.9161 18.2098 29.9925 13.4419 26.704 10.1461C23.6415 7.07617 19.3046 6.06605 15.4 7.10705L15.1765 7.72201L21.4076 13.968L19.869 19.7237L14.1268 21.2661L7.787 14.9102L7.18685 15.13C6.01867 19.1174 7.00039 23.6049 10.1394 26.7501C13.418 30.0361 18.155 30.9672 22.2609 29.5422C25.032 32.5689 29.0712 36.9823 31.4792 39.62C33.5267 41.8613 37.2547 41.8934 39.706 39.3915C42.0683 36.9798 41.5953 33.3913 39.5442 31.5365L39.5429 31.5377Z"
      fill="#B1B9B9"
    />
  </svg>
);

/* ── "UNDER MAINTENANCE", THE ORIGINAL'S ONE ANSWER TO A GAME THAT WILL NOT OPEN ─────────────
 *
 * `re` in `GamePageData-B2XkLpDN.js` (the `games` remote, rung 3 of the recovery ladder):
 *
 *   q({ title: E("Under Maintenance"), children:
 *     <div class="flex flex-col">
 *       <div class="flex-1 p-4"> <oe class="w-10 h-10 text-warning mx-auto mb-4"/>
 *         <div class="text-center text-secondary text-sm">
 *           E("This game is currently unavailable. Please try other games.")
 *       <div class="flex gap-3 p-4 border-layer3">
 *         <Button type="brand" class="flex-1" onClick={() => D.pop()}>OK
 *
 * `q` is the site's popup card — `PopCenter` here — so the cross is the card's own and, like OK,
 * only POPS: the player stays on the page under it, exactly as the original leaves them. The
 * original pushes it for `DISABLED_PLAYING` on the detail read; here it is every way a game can
 * fail to open — no keys (503 `*_NOT_CONFIGURED`), a provider refusal (`JSGAMES_UPSTREAM_*`), a
 * game the catalogue or the owner's plan does not hold, a network failure — because each of them
 * is, to the player, a game that is currently unavailable. The reason goes to the console, not
 * the screen: the rule for an explanation the original does not carry. Its sibling in the same
 * remote, `M` in `checkGameAvailable` ("Game Under Maintenance", the long copy), is the PROVIDER's
 * maintenance flag and has no source here. */
function GameUnavailable({ open, onClose }) {
  return (
    <PopCenter open={open} onClose={onClose} title="Under Maintenance">
      <div className="flex flex-col">
        <div className="flex-1 p-4">
          <IconWrench className="mx-auto mb-4 h-10 w-10 text-warning" />
          <div className="text-center text-sm text-secondary">
            This game is currently unavailable. Please try other games.
          </div>
        </div>
        <div className="flex gap-3 border-layer3 p-4">
          <button type="button" className="button button-m button-brand flex-1" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </PopCenter>
  );
}

/* ── THE OVERLAY CARD OVER THE FRAME ───────────────────────────────────────────────────────────
 *
 * `ve` in the slots module `index-CxQFC9RQ.js` (the standard slot's `renderPCCurrencyOverlay`),
 * over `qe`/`We` in `SlotsGameLayout-D-fxtFdC.js` for the signed-in body:
 *
 *   <div class="absolute inset-0 flex justify-center items-center z-20 bg-black/60">
 *     <div class="w-[30rem] bg-layer3 p-8 rounded-xl">
 *       signed out  "The selected currency will be displayed in <c>, and if you change currency
 *                   while playing, the game will refresh and restart." + brand "Sign in"
 *                   (+ second "Free Play" when the game supports demo)
 *       signed in   "Play with balance in" <Select of wallets> + the status line, then a brand
 *                   w-64 "Play With Deposit Balance" (+ second w-32 "Free Play" with demo)
 *
 * NO FREE PLAY, and that is the original's own rule rather than an omission: both Free Play
 * buttons and the footer's Demo / Real Play switch render only when the game's `supportDemo` is
 * true, and nothing here can make it true — js-games v2 has no demo launch (its validator refuses
 * a `demo` key, checked against the live operator) and v1 has none either.
 *
 * The status line is `qe`'s: `auto` prints the currency sentence, `unwhitelistcurrency` prints
 * "<c> isn't supported for this game right now.Please choose another currency to continue
 * playing." (the missing space is the original's string) and disables Play — the arm a wallet
 * this game's route cannot settle takes. The picker lists only the wallets it CAN settle, so the
 * fix is one tap away; picking writes `setting.currencyName`, the header's own selection, as
 * `We`'s `onChange` does. */
function PlayOverlay({ game, login, currencyName, balances, setting, launching, onPlay, onSignIn, onPickCurrency }) {
  const code = launchCurrency(game, currencyName);
  const alias = getAlias(currencyName || 'INRFIAT');
  /* The wallet's real balance beside its code, in the wallet's OWN currency (`target` pins it, so
     a "display in USD" setting cannot turn the INR the game will settle in into a dollar figure).
     Floored at zero like the header pill. Unknown until the balances read lands. */
  const balanceOf = (name) => {
    const row = (balances ?? []).find((b) => b.currencyName === name);
    if (!row) return null;
    return printCurrency(Math.max(0, Number(row.generalAmount) || 0), name, {
      target: name,
      settings: setting ?? {},
      hasAlias: false,
    });
  };
  const shownBalance = balanceOf(currencyName);
  const choices = (balances ?? [])
    .filter((row) => launchCurrency(game, row.currencyName))
    .map((row) => row.currencyName);
  const sentence = (shown) => (
    <>
      The selected currency will be displayed in <span className="text-brand">{shown}</span>, and if you change
      currency while playing, the game will refresh and restart.
    </>
  );

  return (
    <div className="game-overlay absolute inset-0 z-20 flex items-center justify-center bg-black/60 px-4">
      <div className="game-overlay-card w-full max-w-[30rem] rounded-xl bg-layer3 p-8">
        {login ? (
          <>
            <div className="items-left flex flex-col justify-center gap-2">
              {choices.length ? (
                <div className="sm:flex sm:flex-row sm:items-center sm:justify-center">
                  <span className="text-sm font-extrabold text-primary">Play with balance in</span>
                  <Select
                    value={choices.includes(currencyName) ? currencyName : null}
                    options={choices}
                    onChange={onPickCurrency}
                    title="Play with balance in"
                    className="mt-2 w-full bg-layer5 p-0 sm:ml-2 sm:flex-1 md:mt-0"
                    labelRender={() => (
                      <span className="flex items-center justify-start gap-2 p-1 text-sm font-extrabold whitespace-nowrap text-primary">
                        {alias}
                        {shownBalance != null && <span className="text-secondary">{shownBalance}</span>}
                      </span>
                    )}
                  >
                    {(option) => {
                      const amount = balanceOf(option);
                      return amount != null ? `${getAlias(option)}  ${amount}` : getAlias(option);
                    }}
                  </Select>
                </div>
              ) : null}
              <p className="mb-0 min-h-16 text-center text-xs font-semibold text-secondary sm:mt-5 sm:mb-7 sm:min-h-0">
                {code ? (
                  sentence(alias)
                ) : (
                  <>
                    <span className="text-brand">{alias}</span> isn&apos;t supported for this game right now.Please
                    choose another currency to continue playing.
                  </>
                )}
              </p>
              {/* THE WAY OUT, spelled out: one button per wallet this game CAN settle. Picking one
                  is the player's own choice of header coin (the same write the picker above
                  makes) — nothing switches it for them. */}
              {!code && choices.length > 0 && (
                <div className="mb-4 flex flex-wrap justify-center gap-2">
                  {choices.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className="button button-s button-second px-3"
                      onClick={() => onPickCurrency(name)}
                    >
                      Use {getAlias(name)}
                      {balanceOf(name) != null && <span className="ml-1 text-secondary">{balanceOf(name)}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-x-4">
              <button
                type="button"
                /* Unsupported coin: visibly off (grey, not a dimmed green that still reads as a
                   live button) as well as `disabled`. */
                className={`button button-m mx-auto w-64 ${code ? 'button-brand' : 'button-second cursor-not-allowed'}`}
                disabled={!code || launching}
                title={code ? undefined : `${alias} isn't supported for this game`}
                aria-busy={launching}
                onClick={onPlay}
              >
                <IconStart className="mr-2 size-4" />
                Play With Deposit Balance
              </button>
            </div>
            {shownBalance != null && (
              <p className="mt-3 mb-0 text-center text-xs font-semibold text-secondary">
                Balance: <span className="text-primary">{shownBalance} {alias}</span>
              </p>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="mb-4 text-center text-sm font-semibold text-secondary">{sentence('INR')}</div>
            <div className="flex gap-x-4">
              <button type="button" className="button button-m button-brand w-full" onClick={onSignIn}>
                <IconStart className="mr-2 size-4" />
                Sign in
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* `q` in the original's Logs chunk: Full Screen requests fullscreen on the `.game-iframe` itself,
   and with no game running says so in a toast rather than doing nothing. */
function enterFullscreen() {
  const frame = document.querySelector('iframe.game-iframe');
  if (!frame) {
    toast.error('Please start the game before entering fullscreen.');
    return;
  }
  const request = frame.requestFullscreen ?? frame.webkitRequestFullscreen;
  Promise.resolve(request?.call(frame)).catch(() => {});
}

export default function GamePage() {
  const { gameUnique = '' } = useParams();
  const { session, balances, setSetting } = useSession();
  const navigate = useNavigate();

  /* `attempt` re-runs the read from the inline Retry below. A FAILED read (429 rate limit, 5xx,
     network) is NOT a game missing from the catalogue: it used to fall into `missing` and print
     "This game is not in the catalogue" over a game that is there — the QA report's
     /game/5-lions-by-pragmatic, whose slug resolves fine once the gateway stops answering 429. */
  const [attempt, setAttempt] = React.useState(0);
  const readGame = React.useCallback(() => getGame(gameUnique, attempt), [gameUnique, attempt]);
  const { data: game, loading, error: readError } = useResource(readGame);

  /* ── THE LAUNCH IS A PRESS, NOT AN ARRIVAL ────────────────────────────────────────────────────
   *
   * This page used to launch on mount. Every visit opened a provider session (and wrote a
   * Recently Played row) whether or not the player meant to play, and a refusal had nowhere to
   * go but a line of text under a "Connecting..." pill. The original's standard slot is
   * `autoLaunch: "never"` (`Ht` in `SlotsGameLayout`): the cover and the overlay card first, and
   * a launch only from its Play button. So `play` is the only caller of `launchGame`.
   *
   * The URL is held against the game it was launched FOR, so moving to another game (the route
   * reuses this component) or signing out drops the frame during render — no effect, no stale
   * game left playing behind the next page. `Promise.resolve(...)` because `services/client.js`
   * can answer synchronously (the rule in CLAUDE.md); a `null` answer — fixtures, signed out, a
   * success with no URL — is a failure like any other. */
  const [launched, setLaunched] = React.useState(null);
  const [launching, setLaunching] = React.useState(false);
  const [failedFor, setFailedFor] = React.useState(null);
  /* The original pushes the dialog when the DETAIL read says the game cannot be played. Here that
     is a game the catalogue does not hold (or an owner switched off, which reads the same), and it
     is opened once per slug: closing it must not reopen it on the next render. */
  const [dismissedFor, setDismissedFor] = React.useState(null);
  /* The frame is ALSO held against the coin it was launched in. Switching the header coin while a
     game runs used to leave the provider's session in the old currency (INR in the frame, USDT in
     the header). Now the frame drops and the overlay comes back: Play relaunches in the new coin,
     or — if this game cannot settle in it — says so with Play disabled and the coins it can use. */
  const currentCode = launchCurrency(game, session.setting?.currencyName);
  const frameUrl =
    session.login && launched?.for === gameUnique && launched.currency === currentCode ? launched.url : null;
  const missing = !loading && !game && !readError;
  const unavailableOpen = failedFor === gameUnique || (missing && dismissedFor !== gameUnique);
  const closeUnavailable = () => {
    setFailedFor(null);
    setDismissedFor(gameUnique);
  };

  const play = async () => {
    if (!session.login) {
      navigate(`/login/signin?redirect=${encodeURIComponent(`/game/${gameUnique}`)}`);
      return;
    }
    if (!game || launching) return;
    setLaunching(true);
    const target = gameUnique;
    try {
      const url = await Promise.resolve(
        launchGame(game, {
          currencyName: session.setting?.currencyName,
          language: supportedLang(session.setting?.lang),
          /* v1 only: where the provider's own home button lands — this page, not the lobby. */
          homeUrl: `${window.location.origin}/game/${gameUnique}`,
        }),
      );
      if (url) setLaunched({ for: target, url, currency: launchCurrency(game, session.setting?.currencyName) });
      else setFailedFor(target);
    } catch (error) {
      console.warn('[game] launch refused', error?.code ?? error?.status ?? error);
      setFailedFor(target);
    } finally {
      setLaunching(false);
    }
  };

  /* Third-party games take the original's SLOT layout (`index-CxQFC9RQ.js` -> `SlotsGameLayout`):
     a 16:9 frame across the column and no live-players panel, which is the BC Originals client's.
     Fixture rows carry no `launch`, so the provider stands in for it there. */
  const isSlots = Boolean(game) && (game.launch ? game.launch === 'aggregator' : game.provider !== 'BC Originals');

  /* Below `lg` the original's frame is a 16:9 card and Play is "Zoom & Play" — the frame goes
     `fixed inset-0 z-[9999]` with a close bar (`ic` in Layout-DI8MpYIQ.js). Closing ends the
     game, as its `onClose` does. */
  const closeFrame = () => setLaunched(null);

  const title = game?.name ?? gameUnique;

  /* ── THE STAR IS A CONTROL NOW, AND IT IS THE ONLY WAY INTO `/favorite` ──────────────────────
   *
   * It was drawn here from the start and did nothing, because nothing on the platform stored a
   * favourite — `docs/backend-gaps.md` gap 1, closed by migration 038 and the three routes in
   * Part 4b.7. This page is where bc.game puts the control too, in the same toolbar slot.
   *
   * `null` is the third state and it is not "off": it means the list has not been read, and it is
   * what a SIGNED-OUT visitor stays at, since favourites are per-account and there is nothing to
   * ask. Drawing a filled star for "unknown" would be a lie the next press acts on — so the
   * OUTLINE is what an unknown state shows, which is also what a signed-out visitor sees on the
   * original.
   *
   * The toggle is OPTIMISTIC and reverts on a refusal. Both writes are idempotent on the server,
   * so a double press cannot desynchronise anything, and the only failure that matters is the
   * network one — where the star must go back to what the server still holds.
   */
  const [fetched, setFetched] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  /* The press animation, and it is a separate signal from `starred` on purpose: a page that LOADS
     with the game already starred must not burst, because the state arriving from the server is
     not a press. Cleared on a timer rather than on `animationend`, so a press that lands while the
     previous burst is still running restarts it cleanly. See the note in `Game.css`. */
  const [burst, setBurst] = React.useState(0);

  React.useEffect(() => {
    if (!session.login || !gameUnique) return undefined;
    let live = true;
    isFavoriteGame(gameUnique).then((on) => {
      if (live) setFetched(on);
    });
    return () => {
      live = false;
    };
  }, [session.login, gameUnique]);

  React.useEffect(() => {
    if (!burst) return undefined;
    const timer = setTimeout(() => setBurst(0), 500);
    return () => clearTimeout(timer);
  }, [burst]);

  /* DERIVED DURING RENDER rather than cleared in the effect — the project's own rule for a value
     seeded from a read, and here it is also the simpler statement: signing out does not make a
     game un-starred, it makes the answer unknown again. */
  const starred = session.login ? fetched : null;

  const toggleStar = async () => {
    /* The original's own first branch — `if (!z.login) { X.emit("navigate", "/login/signin") }`.
       The star is a live control for a signed-out visitor and it takes them to sign in; an
       earlier pass here disabled it instead, which is not what the chunk does. */
    if (!session.login) {
      navigate(`/login/signin?redirect=${encodeURIComponent(`/game/${gameUnique}`)}`);
      return;
    }
    if (starred === null || saving) return;
    const next = !starred;
    setFetched(next);
    /* Only on the way ON — a burst celebrates an addition, and firing it on a removal reads as
       though the removal failed. An un-star CLEARS it rather than ignoring it, which is what lets
       a fast off-then-on inside one burst's 500ms restart the animation: the class has to leave
       the element for a CSS animation to run again, and the removal is the natural moment. */
    setBurst(next ? (n) => n + 1 : 0);
    setSaving(true);
    try {
      /* `in-house` only where the platform's own catalogue agrees, which for this build's slugs
         means the twenty BC Originals. Everything else is honestly `unknown` — see the note on
         these two calls in `services/collection.js`. */
      if (next) await addFavoriteGame(game?.ref ?? gameUnique, game?.source ?? (game?.provider === 'BC Originals' ? 'in-house' : 'unknown'));
      else await removeFavoriteGame(game?.ref ?? gameUnique);
    } catch {
      setFetched(!next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`game-page px-4 sm:px-0${isSlots ? ' is-slots' : ''}`}>
      <div className="game-page-row">
        <section className="game-stage">
          <div className={`game-frame${frameUrl ? ' is-playing' : ''}`}>
            {frameUrl ? (
              <>
                {/* The phone arm's close bar (`wo`'s onClose); hidden from `lg` up, where the
                    frame stays in the column. */}
                <div className="game-frame-zoombar">
                  <span className="truncate">{title}</span>
                  <button type="button" className="game-frame-zoomclose" aria-label="Close game" onClick={closeFrame}>
                    &times;
                  </button>
                </div>
                {/* `at` in SlotsGameLayout-D-fxtFdC.js, attribute for attribute: no `sandbox`
                    (providers need scripts, storage and their own cashier pop-ups), the
                    original's `allow` list and `allowfullscreen`. The URL goes in unchanged — it
                    carries the provider's session. */}
                <iframe
                  className="game-frame-iframe game-iframe"
                  src={frameUrl}
                  title={title}
                  allow="autoplay; geolocation; camera; microphone; clipboard-read; clipboard-write"
                  allowFullScreen
                />
              </>
            ) : loading ? (
              <Loading />
            ) : game ? (
              <>
                {game.image ? <img className="game-frame-cover" src={game.image} alt="" aria-hidden="true" /> : null}
                <PlayOverlay
                  game={game}
                  login={session.login}
                  currencyName={session.setting?.currencyName}
                  balances={balances}
                  setting={session.setting}
                  launching={launching}
                  onPlay={play}
                  onSignIn={play}
                  onPickCurrency={(name) => setSetting('currencyName', name)}
                />
              </>
            ) : readError ? (
              <div className="game-frame-connecting">
                <p className="game-frame-note">Couldn&apos;t load this game right now.</p>
                <button type="button" className="button button-s button-second mt-3" onClick={() => setAttempt((n) => n + 1)}>
                  Retry
                </button>
              </div>
            ) : (
              <div className="game-frame-connecting">
                <p className="game-frame-note">This game is not in the catalogue.</p>
              </div>
            )}
          </div>

          {/* The toolbar under the frame: settings, favourite with its count, a swap and
              fullscreen. THE STAR AND FULL SCREEN ARE LIVE (Full Screen is the original's `q`:
              fullscreen on the `.game-iframe`, a toast with no game running). Settings (whose
              menu holds Like, Share and Movie Mode on the original) and the swap stay
              presentational: nothing here backs Like/Share, and Movie Mode resizes the
              original's own page container. */}
          <div className="game-toolbar">
            <button type="button" className="game-tool" aria-label="Game settings">
              <span className="game-tool-dot" />
            </button>
            <button
              type="button"
              className={`game-tool game-tool-fav${starred ? ' is-on' : ''}${burst ? ' is-burst' : ''}`}
              aria-label={starred ? 'Remove from favourites' : 'Add to favourites'}
              aria-pressed={starred ?? false}
              aria-busy={saving}
              /* Live when signed out — it opens sign-in, as the original's does. Only the moment
                 between mount and the list landing is inert, and that window shows the outline. */
              disabled={session.login && starred === null}
              onClick={toggleStar}
            >
              {/* The swap is the original's, not a recolour of one path. */}
              {starred ? (
                <IconStarSolid className="game-tool-icon" />
              ) : (
                <IconStarOutline className="game-tool-icon" />
              )}
              {game ? <span className="game-tool-count">{formatOnlineUsers(game.players ?? 0)}</span> : null}
              {/* `key` on the counter, so a second press inside the first burst remounts the ring
                  and restarts its animation rather than leaving the first one to finish. */}
              {burst ? <span key={burst} className="game-tool-fav-ring" aria-hidden="true" /> : null}
            </button>
            <button type="button" className="game-tool" aria-label="Switch game">
              <svg viewBox="0 0 24 24" className="game-tool-icon" aria-hidden="true">
                <path d="M7 7h10l-2.5-2.5L15.9 3 21 8l-5.1 5-1.4-1.5L17 9H7zm10 10H7l2.5 2.5L8.1 21 3 16l5.1-5 1.4 1.5L7 15h10z" />
              </svg>
            </button>
            <button type="button" className="game-tool" aria-label="Fullscreen" onClick={enterFullscreen}>
              <svg viewBox="0 0 24 24" className="game-tool-icon" aria-hidden="true">
                <path d="M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z" />
              </svg>
            </button>
          </div>
        </section>

        {/* The live players panel. Its feed is the game client's own socket, so it is the site's
            empty state here under the heading the live panel carries. */}
        <aside className="game-side">
          <div className="game-side-head">
            <span className="game-side-dot" />
            <span className="game-side-players">0/0 Players</span>
          </div>
          <div className="game-side-columns">
            <span>Player</span>
            <span>Cashout</span>
            <span>Amount</span>
          </div>
          <div className="game-side-empty">
            <EmptyPlaceholder className="w-full" />
          </div>
        </aside>
      </div>

      <section className="game-info">
        {loading ? (
          <div className="game-info-loading">
            <Loading />
          </div>
        ) : (
          <>
            <div className="game-info-head">
              <div>
                <h1 className="game-info-title">{title}</h1>
                {game ? (
                  <p className="game-info-by">
                    By{' '}
                    <Link
                      to={`/gamelist/brand`}
                      className="game-info-provider"
                    >
                      {brandLabel(game.provider)}
                    </Link>
                  </p>
                ) : null}
              </div>
              {tagWords(game?.tags).length ? (
                <div className="game-info-tags">
                  {tagWords(game.tags).map((tag) => (
                    <Link key={tag} to={`/tagname/${encodeURIComponent(tag)}`} className="game-info-tag">
                      # {brandLabel(tag)}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
            {game ? (
              <div className="game-stats">
                {/* Slotegrator rows carry `parameters.rtp`; the JSGames import has none (shows "--"). */}
                <Stat label="House Edge" {...(rtpOf(game) != null ? { value: `${(100 - rtpOf(game)).toFixed(2)}%` } : {})} />
                <Stat label="RTP (Return to Player)" {...(rtpOf(game) != null ? { value: `${rtpOf(game)}%` } : {})} />
                <Stat label="Max Win" />
                <Stat label="Stakes Range" />
              </div>
            ) : (
              <div className="game-info-empty">
                <EmptyPlaceholder className="w-full" />
              </div>
            )}
          </>
        )}
      </section>
      <GameUnavailable open={unavailableOpen} onClose={closeUnavailable} />
    </div>
  );
}
