import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import EmptyPlaceholder from '../../components/shared/EmptyPlaceholder';
import Loading from '../../components/shared/Loading';
import { useResource } from '../../hooks/useResource';
import { useSession } from '../../context/session';
import { getGame, launchGame } from '../../services/game';
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
 * The SHELL is what is built here. The game inside it is not, and cannot be from this side: for a
 * BC Original it is bc.game's own in-house client, and the platform this build is wired to relays
 * its launches from an external game-client host that is not configured (see `services/game.js`).
 * So the play area shows the frame's connecting state — the pill the live page itself shows while
 * its client is not ready — over a note saying why, and the four stats print the site's own `--`,
 * because no source here carries them. `launchGame` still runs, `live: true`, so the day the host
 * is configured the frame takes the URL that comes back and nothing else changes.
 *
 * An unknown slug renders the site's empty state under the slug as its title, which is the list
 * pages' own fallback chain (`searchParams.label ?? MAP[key] ?? key`) one route over.
 */

/* `--` is what the original prints for a figure it does not have (the level card's next tier,
   the vault's return); the same sentinel here for the four stats no source carries. */
const UNKNOWN = '--';

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

export default function GamePage() {
  const { gameUnique = '' } = useParams();
  const { session } = useSession();
  const navigate = useNavigate();

  const readGame = React.useCallback(() => getGame(gameUnique), [gameUnique]);
  const { data: game, loading } = useResource(readGame);

  /* The launch is attempted once the catalogue row is known, and only then — an unknown slug has
     nothing to launch. `null` is both "fixtures on" and "the live host refused", and the frame
     treats the two the same because they are the same: nothing to frame. */
  /* `Promise.resolve(...)` AND NOT A BARE `.catch` — `services/client.js` answers a fixture
     SYNCHRONOUSLY, and this one's fixture is `null`, so with `VITE_USE_FIXTURES=true` the call
     returned `null` and `.catch` threw `Cannot read properties of null`. That is a white screen
     on every game page in the fixture build, and it is the seam `useResource`'s own doc names:
     a service "works whether the service answered synchronously (fixtures) or with a Promise
     (the API)" only if the CALLER stops assuming a thenable. `services/collection.js` wraps
     every one of its reads this way for the same reason. */
  const readLaunch = React.useCallback(
    () => (game ? Promise.resolve(launchGame(gameUnique, { game })).catch(() => null) : null),
    [game, gameUnique],
  );
  const { data: launch } = useResource(readLaunch);
  const frameUrl = launch?.gameLaunchUrl ?? null;

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
    <div className="game-page px-4 sm:px-0">
      <div className="game-page-row">
        <section className="game-stage">
          <div className="game-frame">
            {frameUrl ? (
              <iframe className="game-frame-iframe" src={frameUrl} title={title} allowFullScreen />
            ) : loading ? (
              <Loading />
            ) : (
              <div className="game-frame-connecting">
                <span className="game-frame-pill">Connecting...</span>
                <p className="game-frame-note">
                  {game
                    ? 'The game client is not available on this build.'
                    : 'This game is not in the catalogue.'}
                </p>
              </div>
            )}
          </div>

          {/* The toolbar under the frame: settings, favourite with its count, a swap and
              fullscreen — the live row's four controls. THE STAR IS LIVE; the other three are
              presentational, since each drives the game client this page cannot mount. */}
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
            <button type="button" className="game-tool" aria-label="Fullscreen">
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
                      {game.provider}
                    </Link>
                  </p>
                ) : null}
              </div>
              {game?.tags?.length ? (
                <div className="game-info-tags">
                  {game.tags.map((tag) => (
                    <Link key={tag} to={`/tagname/${encodeURIComponent(tag)}`} className="game-info-tag">
                      # {tag}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
            {game ? (
              <div className="game-stats">
                <Stat label="House Edge" />
                <Stat label="RTP (Return to Player)" />
                <Stat label="Max Win" />
                <Stat label="Stakes Range" />
              </div>
            ) : (
              <div className="game-info-empty">
                <EmptyPlaceholder className="w-full" />
              </div>
            )}
            {!session.login && game ? (
              <p className="game-info-signin">
                <Link to="/login/signin" className="game-info-provider">
                  Sign in
                </Link>{' '}
                to play for real.
              </p>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
