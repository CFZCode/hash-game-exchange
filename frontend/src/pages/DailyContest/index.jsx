import Loading from '../../components/shared/Loading';
import Contest from '../../components/shared/Contest';
import { getDailyContest } from '../../services/contest';
import { useResource } from '../../hooks/useResource';
import { useIsDialog } from '../../context/dialogRoute';
import { useSession } from '../../context/session';

/* The daily contest page — `/promotions/daily-contest`.
 *
 * The original's own path: `Uc = [{ path: "/promotions/daily-contest", component: ... }]` in
 * Enter-MsmOuq5R.js, loading `Contest-Uqb1GQAo.js`. It is what the sidebar's "Daily Contest"
 * row under Promotions means, and one of the four promotion siblings named in the promotions
 * page's own notes.
 *
 * THE PAGE IS A HEADING OVER THE SHARED WIDGET, and that is not a shortcut — the home page's
 * Wager Contest tab and this page render the same component from the same chunk at the same
 * size. Measured off the page capture at dpr 1.25: cards 2:1:1 on a 12px gap filling the
 * 1216px container, 152px tall, plain rows 40px and podium rows 48.5px. Every one of those is
 * what the home widget already produced. Only the container is wider.
 *
 * The heading matches the promotions page's exactly — `text-base ... lg:text-lg` inside a
 * `pb-4 pt-4` wrapper — because it is the same page furniture, and the capture agrees: the
 * title's glyphs start 19px down and the cards begin one `mb-4` below them.
 */
export default function DailyContest() {
  const isDialog = useIsDialog();
  const { session } = useSession();
  const { data } = useResource(getDailyContest);

  /* The page is a heading over one widget fed by one read, so there is nothing to render around
     the spinner. 152px is the contest card's own measured height (`py-7` around a 24px title,
     `mb-3` and an `h-15` box — see the header note), plus the podium rows, which is close enough
     to the settled page that the heading above does not jump. */
  if (!data) {
    return (
      <div className="center h-96 px-4 sm:px-0">
        <Loading />
      </div>
    );
  }

  return (
    /* NO top padding on the page arm, where the promotions page has `pt-4` — dropped at
       request. The layout already pads `main` enough to clear the fixed header, so this would
       be the page's own inset on top of that and it read heavy here. */
    /* `px-4 sm:px-0` — the mobile gutter, as on its promotions siblings. See the note there:
       the layout column has no horizontal padding below 640 and each page supplies its own. */
    /* `pt-4` ONLY IN THE DIALOG, which is the original's own value put back where the shell
       gives none. The chunk's root is the promotions page's `pb-4 pt-4` wrapper; the desktop
       arm here drops the top half at request (above), and below `lg` that left the hero butted
       straight against the title bar, since `.dialog-content` pads its sides and its bottom and
       nothing pads its top. So the page supplies it, the same way it supplies its own `px-4`
       for the shell's zeroed gutter. */
    <div className={`pb-4 px-4 sm:px-0${isDialog ? ' pt-4' : ''}`}>
      {/* THE HEADING GOES WHEN YOU SIGN IN, and the two reasons it can go are not the same one.
          Below `lg` this page is the phone's full-screen dialog and "Daily Contest" is already
          in its title bar — see ./Dialog.jsx, which documents the `PageLayout` mechanism both
          stand in for. The login half is the observed behaviour of the live page and is NOT
          what the chunk says. `tr` in `Contest-Uqb1GQAo.js` writes it as

            const e = location.pathname;
            <Show when={!q.mobile && "/promotions/daily-contest" === e}>
              <div class="mt-4 text-lg font-extrabold text-primary">{t("Daily Contest")}</div>

          — a device test and a pathname test, with no reference to the session at all. Note the
          pathname is read ONCE, imperatively, when the component is created rather than through
          a router hook, so a component created while some other path is current (a dialog route
          over this page, which is exactly what `/login/signin` is) evaluates it against that
          path and the heading never appears. That is the only mechanism in the chunk that could
          produce what the live page does, and it cannot be confirmed from here. The behaviour is
          reproduced against the session because that is what the reference shows; if the real
          cause turns out to be the stale pathname, this is the line to change. */}
      {!isDialog && !session.login && (
        <header className="mb-4 text-base font-extrabold text-primary lg:text-lg">
          Daily Contest
        </header>
      )}
      <Contest contest={data.contest} standings={data.standings} />
    </div>
  );
}
