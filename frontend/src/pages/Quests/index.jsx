import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '../../context/session';
import { useSettings } from '../../context/settings';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { useResource } from '../../hooks/useResource';
import { getQuests, getCompletedQuests, getExpiredQuests } from '../../services/quest';
import { groupQuests } from './quests';
import EmptyPlaceholder from '../../components/shared/EmptyPlaceholder';
import Loading from '../../components/shared/Loading';
import { IconArrow } from '../../components/shared/icons';
import { SectionGroup } from '../../components/shared/SectionGroup';
import { QuestCard, QuestFooter, QuestAction, QuestReward, QuestProgress } from './QuestCard';
import { LockedIcon, CheckIcon } from './icons';

/* The Quest Hub — `/quests`, the sidebar's own row, and the second of the two rows that only
 * appear once you are signed in (Bonus is the other and is not built).
 *
 * ROUTE. `Enter-MsmOuq5R.js`: `{path: "/quests", component: c(() => L.Quests()), info: {guards:
 * [() => !b.login && "/"], dialog: !!m.mobile}}`. Both halves are the original's and only one is
 * expressible here:
 *
 * - The guard IS reproduced — a logged-out visitor is sent to `/`, not to the sign-in dialog.
 * - `dialog: !!m.mobile` is a DEVICE test, the same shape `/wallet/withdraw` carries, so the
 *   original serves a phone a full-screen dialog and a desktop a page. Only the page arm is
 *   built. The consequence is visible below 640, where the original's page never renders: the
 *   heading is `hidden … sm:block` and the card drops its padding and its fill, so this build
 *   supplies `px-4 sm:px-0` on the root the way the VIP and promotions pages do. That gutter is
 *   OURS; everything else on the page is the chunk's.
 *
 * CHUNK. `index-TGm-4VyO.js`, off `hash.game/assets/` — not in the saved mirror. So the markup,
 * the class lists and every string are the deploy's own and nothing here is read off a
 * screenshot. Its stylesheet (`index-D_qd3jqG.css`) came too and turns out to be entirely the
 * sibling `/challenge` page's scratch-card animations — this page is pure utilities.
 *
 * THE DATA IS THE PART THAT IS NOT REAL. All three endpoints are login-gated and answer 403; see
 * the long note in `quests.js` for exactly which one field is inferred.
 *
 * NOT BUILT, each a real component rather than an oversight:
 *
 * - The Lucky Rookie Quest banner between the heading and the tabs (`oc` → `sc`), gated on
 *   `isVisible()` and absent from the capture.
 * - Nine of the ten quest handlers — see the registry in `quests.js`.
 * - The ƒ(x) popup behind the chip on each card (`Hi.popup` → `Wi`: a "How You Earn" three-step
 *   list over six rules, all verbatim i18n in the chunk). The chip renders because it is part of
 *   the card; clicking it does nothing.
 * - The Connect button's own action, `emit("open-cwalletbind")`, which opens the Cwallet binding
 *   dialog. That dialog is a separate feature and is not built, so the button is inert.
 * - `Rt(() => An())` on mount. The body-background swap that sat under it in this list IS built
 *   now — see the effect in the component; it was unreachable while the build was dark-only.
 */

/* `ir`-formatted rows are the completed and expired tabs' business; the in-progress tab reads its
   items straight off `groupQuests`. */

/* `Br` in the chunk — the wrapper both the completed and expired lists put their rows in.
 *
 * `separated` is `!Ee.mobile`, a DEVICE test: a desktop gets a two-column grid of individually
 * bordered cards, a phone gets one bordered box with hairlines between the rows. Only the
 * desktop arm is built, and nothing renders it today because both lists are empty — but the
 * prop is kept so the shape of the decision survives. */
function QuestRows({ items, children, separated = true }) {
  if (separated) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((row, i) => (
          <div key={row.id ?? i} className="overflow-hidden rounded-xl border border-fourth/5">
            {children(row)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-fourth/5">
      {items.map((row, i) => (
        <div key={row.id ?? i} className="border-fourth/5 [&:not(:last-child)]:border-b">
          {children(row)}
        </div>
      ))}
    </div>
  );
}

/* `ga` — the In Progress tab. Its empty state is the odd one on this page and it is the
 * original's: the fallback branches on `we.bcmx`, and only THAT white label gets the "No quests
 * in progress" message. bc.game takes the other arm, which is a spinner in a `min-h-40` box —
 * so an empty in-progress list spins forever rather than saying anything. DEPARTURE (live QA,
 * 2026-10-19): the platform has no quests, so that spinner never settled — the spinner is kept
 * only while the read is pending and an answered empty list takes the bcmx arm's message. */
function InProgress({ groups, pending }) {
  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {groups.length > 0 ? (
        groups.map((group) => (
          <SectionGroup
            key={group.label}
            title={group.label.toUpperCase()}
            className="text-xs [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-quarterary"
          >
            <div className="overflow-hidden rounded-xl border border-fourth/5 sm:grid sm:grid-cols-2 sm:gap-3 sm:rounded-none sm:border-0 sm:border-transparent">
              {group.items.map((item) => (
                <div
                  key={item.questName}
                  className="border-fourth/5 sm:overflow-hidden sm:rounded-xl sm:border [&:not(:last-child)]:border-b"
                >
                  <QuestCard
                    title={item.title}
                    description={item.description}
                    formula={item.formula}
                    /* The ƒ(x) popup is not built — see the header note. */
                    onFormula={undefined}
                    footer={<QuestFooter {...item.footer} />}
                    progressBar={item.progress ? <QuestProgress {...item.progress} /> : undefined}
                    /* Both are undefined for the one quest that exists, which is why its right
                       column holds nothing but the button and centres it. */
                    rewardAmount={
                      item.rewardAmount ? (
                        <QuestReward amount={item.rewardAmount} currency={item.rewardCurrency} />
                      ) : undefined
                    }
                    rewardPrefix={
                      item.locked ? <LockedIcon className="icon size-4.5 fill-primary" /> : undefined
                    }
                    rewardClass={item.locked ? 'flex items-center gap-1' : undefined}
                    action={<QuestAction action={item.actionLabel} disabled={item.disabled} />}
                  />
                </div>
              ))}
            </div>
          </SectionGroup>
        ))
      ) : pending ? (
        <div className="center flex size-full min-h-40">
          <Loading />
        </div>
      ) : (
        <div className="text-quarterary">
          <EmptyPlaceholder>No quests in progress</EmptyPlaceholder>
        </div>
      )}
    </div>
  );
}

/* `ti` in the chunk — the little brand-tinted disc that prefixes a completed row's reward. */
const CompletedMark = () => (
  <div className="center size-3.5 rounded-full bg-brand/10">
    <CheckIcon className="icon size-2.5 fill-brand" />
  </div>
);

const THIRTY_DAYS = 30 * 864e5;

/* `ni` — the Completed tab. The split at thirty days is the original's, and it is on
   `createTime` rather than `completedTime`; anything older folds behind a toggle that starts
   closed. The chevron is the shared left-arrow rotated, which is how the site draws every
   caret: `rotate-90` points it down when the section is shut. */
function Completed({ items }) {
  const [showOld, setShowOld] = React.useState(false);
  /* Read once at mount rather than per render. There is no interval behind it as there is on a
     countdown: a thirty-day boundary does not move while the tab is open, and reading the clock
     during render is what `react-hooks/purity` rejects. */
  const [now] = React.useState(() => Date.now());

  const recent = items.filter((q) => q.createTime && now - q.createTime < THIRTY_DAYS);
  const old = items.filter((q) => q.createTime && now - q.createTime >= THIRTY_DAYS);

  const row = (q) => (
    <QuestCard
      title={q.questNames}
      compact
      className="[&_.quest-card-left]:basis-4/5 [&_.quest-title]:text-secondary"
      /* The call site passes an already-wrapped div here and the card wraps it again — the
         original's own double wrap, kept because it renders identically. */
      description={
        q.subtitles ? (
          <div className="truncate text-xs font-semibold text-quarterary">{q.subtitles}</div>
        ) : undefined
      }
      formula={false}
      rewardAmount={<QuestReward amount={q.amount} currency={q.currencyName} />}
      rewardPrefix={<CompletedMark />}
      rewardClass="flex items-center gap-1 text-secondary !font-semibold"
      footer={
        q.completedTime ? (
          <QuestFooter variant="completed" completedTime={q.completedTime} />
        ) : undefined
      }
    />
  );

  return (
    <div className="flex flex-col gap-4 pt-2.5">
      {items.length > 0 ? (
        <>
          {recent.length > 0 && <QuestRows items={recent}>{row}</QuestRows>}
          {old.length > 0 && (
            <>
              <button
                type="button"
                className="flex cursor-pointer items-center justify-center gap-1.5 text-sm font-semibold text-tertiary"
                onClick={() => setShowOld((v) => !v)}
              >
                <span>Quests completed over 30 days ago</span>
                <IconArrow
                  className={`icon size-3 text-tertiary transition-transform ${
                    showOld ? '-rotate-90' : 'rotate-90'
                  }`}
                />
              </button>
              {showOld && <QuestRows items={old}>{row}</QuestRows>}
            </>
          )}
        </>
      ) : (
        <div className="text-quarterary">
          <EmptyPlaceholder>No completed quests yet</EmptyPlaceholder>
        </div>
      )}
    </div>
  );
}

/* `si` — the Expired tab. Same rows as Completed but for the footer and the reward weight, and
   its own `text-quarterary` empty state. `unLockRate` is printed as a percentage beside the
   date when a partially-unlocked bonus expires. */
function Expired({ items }) {
  return (
    <div className="flex flex-col gap-4 pt-2.5">
      {items.length > 0 ? (
        <QuestRows items={items}>
          {(q) => (
            <QuestCard
              title={q.questNames}
              compact
              className="[&_.quest-card-left]:basis-4/5 [&_.quest-title]:text-secondary"
              description={
                q.subtitles ? (
                  <div className="truncate text-xs font-semibold text-quarterary">{q.subtitles}</div>
                ) : undefined
              }
              rewardAmount={<QuestReward amount={q.amount} currency={q.currencyName} />}
              rewardClass="flex items-center gap-1 font-extrabold"
              footer={
                <QuestFooter
                  variant="expired"
                  expiredAt={q.expireTime}
                  unLockRate={q.unLockRate}
                />
              }
            />
          )}
        </QuestRows>
      ) : (
        <div className="text-quarterary">
          <EmptyPlaceholder>No expired quests yet</EmptyPlaceholder>
        </div>
      )}
    </div>
  );
}

const TABS = [
  { id: 'progress', label: 'In Progress', panelClass: '!rounded-none !bg-transparent' },
  { id: 'completed', label: 'Completed', panelClass: 'overflow-hidden !bg-transparent' },
  { id: 'expired', label: 'Expired', panelClass: 'overflow-hidden !bg-transparent' },
];

export default function Quests() {
  /* `useSession()` hands back the CONTEXT — `{ session, balances, signIn, … }` — and the account
     is `session` inside it. Reading `login` off the wrapper gets `undefined`, which fails the
     guard below and bounces a signed-in visitor to Home. */
  const { session } = useSession();
  const [tab, setTab] = React.useState('progress');

  const { data: list, loading: listLoading } = useResource(getQuests);
  const { data: completed } = useResource(getCompletedQuests);
  const { data: expired } = useResource(getExpiredQuests);

  /* The tab indicator is MEASURED, not computed from an index — `[&_.tabs-btn]:max-w-fit` with
     `[&_.tabs-btn-group]:gap-6` makes every tab as wide as its own label, so there is no even
     division to derive it from. That is the promotions page's situation exactly.

     `clientWidth` and `offsetLeft` are the ORIGINAL'S own two properties (`p` inside `iT`), not
     a rectangle diff: `offsetLeft` resolves against `.tabs-title`, which is `position: relative`,
     so it already measures from the strip. The promotions page subtracts two bounding rects
     instead because its group could carry padding; here it cannot, and the simpler pair is what
     the component itself uses.

     Written onto the node rather than into state, for the reason the promotions tab indicator
     and the referral ticker both are: measuring into state is the cascading render
     `react-hooks/set-state-in-effect` rejects. */
  /* THE PAGE REPAINTS THE BODY IN THE LIGHT THEME, and it is the one piece of `iu` that used to
     be listed as unbuilt. Verbatim from index-TGm-4VyO.js:

       const r = !Ee.mobile && typeof document != "undefined",
             l = r ? document.body.style.backgroundColor : "";
       Ve(() => { r && (document.body.style.backgroundColor = ae.darken ? l : "#f7f9fa") });
       He(() => { r && (document.body.style.backgroundColor = l) });

     So on a light DESKTOP the body goes #f7f9fa — light `layer2`, a step up from `--site_bg`'s
     #f4f4f4 — and in the dark theme it is written straight back to whatever it already was,
     which is the branch this build could only ever reach while it was dark-only.

     `Ee.mobile` is a DEVICE test and is read as the 1024 line, as everywhere in this project.
     Below it the original leaves the body alone entirely; the page is a dialog there.

     `previous` is re-read on every run rather than captured once at mount, which the original
     does — but the cleanup restores it BEFORE the next run, so the value is the same either way
     and this survives the theme changing under it. An inline style rather than a class or a
     `<style>` tag because that is what the original writes, and because it has to beat
     `body`'s own `background-color: var(--site-bg)` without a specificity argument.

     The Bonus page does the same job the other way, with an inline `<style>` that unmounts with
     the page — the two are not shared, because that one repaints `.app-root` for the whole route
     and this one only swaps a single colour on a desktop. */
  const isDesktop = useIsDesktop();
  const { darken } = useSettings();

  React.useEffect(() => {
    if (!isDesktop) return undefined;

    const previous = document.body.style.backgroundColor;
    document.body.style.backgroundColor = darken ? previous : '#f7f9fa';

    return () => {
      document.body.style.backgroundColor = previous;
    };
  }, [isDesktop, darken]);

  const listRef = React.useRef(null);
  React.useLayoutEffect(() => {
    const strip = listRef.current;
    const active = strip?.querySelector('[aria-selected="true"]');
    if (!strip || !active) return;

    strip.style.setProperty('--tabs-width', `${active.clientWidth}px`);
    strip.style.setProperty('--tabs-indicator-position', `${active.offsetLeft}px`);
  }, [tab]);

  /* `guards: [() => !b.login && "/"]` — the route's own, and a redirect rather than the sign-in
     dialog the deposit route raises. */
  if (!session.login) return <Navigate to="/" replace />;

  const groups = groupQuests(list);
  const panel = TABS.find((t) => t.id === tab);

  return (
    <div className="bonus-scope px-4 sm:px-0">
      <div className="hidden px-1.5 pb-4 pt-4 sm:block">
        <h2 className="text-2xl font-extrabold text-primary">Quest</h2>
        <div className="pt-2 text-sm font-semibold text-tertiary">
          Simple tasks, real rewards. Start earning today.
        </div>
      </div>

      {/* The Lucky Rookie Quest banner sits here on the original, between the heading and the
          card, and is gated on its own `isVisible()`. Not built — see the header note. */}

      <div className="sm:rounded-xl sm:bg-layer1 sm:px-6 sm:pb-8 sm:pt-2">
        <div
          ref={listRef}
          role="tablist"
          data-type="indicator"
          /* `[&_.tabs-indicator]:bg-main` is what makes this underline near-white rather than
             the brand green `.tabs-indicator` declares — `--main` is `--fourth`'s #E4EAF0 at
             80%, added to @theme for this page. */
          className="scroll-x tabs-title hide-scroll h-11 rounded-none border-b border-fourth/5 !bg-transparent font-semibold sm:mb-4 [&_.tabs-btn-group]:gap-6 [&_.tabs-btn]:max-w-fit [&_.tabs-btn]:!bg-transparent [&_.tabs-btn]:px-0 [&_.tabs-indicator]:bg-main"
        >
          <div className="tabs-btn-group">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                {...(t.id === tab ? { 'aria-selected': 'true' } : {})}
                className="tabs-btn btn-like"
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="tabs-indicator test-indicator-tab" />
        </div>

        {/* A TabItem's `class` belongs to the CONTENT panel, not to the button — the same trap
            the deposit dialog documents. In Progress carries `!rounded-none`, the other two
            `overflow-hidden`; all three kill the panel's own layer4 fill. */}
        <div className={`tabs-content ${panel.panelClass}`}>
          {tab === 'progress' && <InProgress groups={groups} pending={listLoading} />}
          {tab === 'completed' && <Completed items={completed ?? []} />}
          {tab === 'expired' && <Expired items={expired ?? []} />}
        </div>
      </div>
    </div>
  );
}
