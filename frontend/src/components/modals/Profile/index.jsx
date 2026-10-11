import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DialogShell from '../../shared/DialogShell';
import EmptyPlaceholder from '../../shared/EmptyPlaceholder';
import useResource from '../../../hooks/useResource';
import { IconArrow } from '../../shared/icons';
import { useSession } from '../../../context/session';
import { printCurrency } from '../../../utils/currency';
import { vipTier } from '../../../data/vipConfig';
import { getUserProfile } from '../../../services/profile';
import { orderMedals, visibleMedals, medalIcon } from './catalogue';
import LevelName from './LevelName';
import {
  IconMedal,
  IconStatistics,
  IconTotalWins,
  IconTotalBets,
  IconTotalWagered,
  IconEdit,
  IconHeart,
} from './icons';
/* `j.avatar(userId)` — the CDN's per-account avatar, which is `img2.distributedresourcestorage.com`
   and reachable, but this account has no live avatar to fetch. The same local file the signed-in
   header uses; see the note there on why the purple ring is part of the PNG rather than a frame. */
import avatarArt from '../../../assets/avatars/105522617.png';
import favouriteFallback from '../../../assets/profile/detail.png';
import achieveBg from '../../../assets/profile/achieve_bg.png';
import Loading from '../../shared/Loading';

/* `/user/profile/:userId` — My Profile, and the first of three dialogs that make up this feature.
 * The other two are `/user/medals/:userId` (Master Medals) and `/user/statistics` (Statistics
 * details), each reached from a Details link here and each a real route rather than a nested view.
 *
 * ── FOUND IN THE `account` FEDERATED REMOTE, WHICH IS THE HELP CENTER'S FINDING AGAIN ─────────
 *
 * `Enter-MsmOuq5R.js` resolves all four profile routes through `w = zt(vo)` where
 * `vo.moduleName = "account"` — so none of them is in `/assets/` at all. The mirror saved that
 * remote WITHOUT its lazy chunks, exactly as it saved `static` and `games` without theirs, so the
 * route is `hash.game/modules/account/assets/`: `index-BkEDN5Nc.js` (this dialog),
 * `index-D0DujHZT.js` (Master Medals), `index-DVoHgAYe.js` (Statistics details),
 * `Medal-DUbmmSLY.js` (the single-medal dialog, not built) and `Tool-CuKFgBKm.js`, which carries
 * the medal catalogue, the titles and the profile resource's default. Every class list below is the
 * Solid template's own and every string is verbatim i18n.
 *
 * ── WHAT THE PAGE READS AND WHAT IT DOES NOT ──────────────────────────────────────────────────
 *
 * `/game/support/user/info/<id>/` answers 6001 for every id tried, so the payload is `es`, the
 * resource's own `initialValue` — the third time checking for one has supplied a login-gated
 * fixture. See services/profile.js for what is filled in and why.
 *
 * FIVE THINGS BRANCH ON WHETHER THIS IS YOUR OWN PROFILE (`s()`), and only one arm of each is
 * reachable here, because nothing in this build links to another player's profile:
 *
 *   the title       "My Profile" / "Profile"
 *   the name        the ACCOUNT STORE's `name` for yourself, the payload's for anyone else — so
 *                   the printed name never comes from the fixture at all
 *   the level       likewise `account.vipLevel` against the payload's `level`
 *   the corner      the edit pencil for yourself, a TIP button for anyone else — and TIP is gated
 *                   further on `login && vipLevel >= 2`, so it is two conditions deep
 *   the like        clicking your own heart shows "Only others can click Like for you."
 *
 * ── FOUR THINGS THE CHUNK SETTLES ─────────────────────────────────────────────────────────────
 *
 * THE WAGER CONTEST CARD IS `<Show when={contest.length > 0}>`, so its absence from the capture is
 * the payload rather than a missing card. It is a five-row paginated table (Date / Position / Prize)
 * and it is not built — nothing can reach it, and it would need its own fixture.
 *
 * THE FAVOURITES CARD SHOWS THE CROCODILE, NOT AN EMPTY GRID. `<Show when={favorite.length > 0}
 * fallback={<Empty class="h-full w-full"/>}>` inside an `h-80` box, which is the capture.
 *
 * THE STATISTICS CELLS WRAP BY INDEX, NOT BY CSS: the `For` writes `w-[49%]` for indexes 0 and 1
 * and `mt-2 w-full` for anything after, so the third cell is a full-width row under the pair rather
 * than a third column that happens to wrap. Same shape in the Statistics dialog.
 *
 * `test-base` ON THE STATISTICS HEADING IS A TYPO and it is load-bearing by accident, like
 * `texxt-sm` on the weekly raffle's table: the class does not exist, so the heading inherits the
 * body's 14px instead of being set to 16px — where the Medals heading beside it has no size class
 * at all and lands in the same place. Both are kept as written.
 *
 * ── NOT BUILT, each inert at its call site ────────────────────────────────────────────────────
 *
 *   the avatar popup   clicking the avatar pushes `pt`, a `.pop-center` holding a 480px square
 *                      avatar over a Like button that POSTs `/game/support/system-like/like-event/`.
 *                      The popup needs the shared popup stack and the endpoint is authenticated.
 *   the edit pencil    `/settings/edit-profile`, a real route in the same remote. Falls through to
 *                      the catch-all here. Its unread dot is `a().redDot` off the avatar-frame
 *                      resource, which this build has no feed for.
 *   the avatar frame   `Se` wraps the avatar in a federated `Frame` keyed off `userAvatarFrameList`.
 *                      The fixture's list is empty, so `id` resolves to the original's own "no
 *                      frame" and the `-z-[2]` arm of the avatar's class list is unreachable — see
 *                      the note in the header's AfterLogin tree, which hit the same thing.
 *   `titles`           a coloured name mark behind `<Show when={titles}>`; the payload's is `[]`.
 *   `postMessage`      the dialog announces `{type: "showProfile", userIdNum}` to `window.top` on
 *                      mount, for the native app shell to read. No consumer in a browser build.
 */

/* `x` — the User ID line copies on click and toasts "Copied.". This build has no toast system, so
   the confirmation lives on the element, which is the departure `components/modals/Refer` made
   first. Lift both the day a second thing needs to say something. */
function UserIdLine({ userId }) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <p
      className="flex cursor-pointer items-center text-secondary"
      onClick={() => {
        navigator.clipboard?.writeText(String(userId));
        setCopied(true);
      }}
    >
      <span>{copied ? 'Copied.' : 'User ID:'}</span>
      <span>{userId}</span>
    </p>
  );
}

/* `et` — the Medals card. */
function MedalsCard({ profile, userId }) {
  const navigate = useNavigate();

  /* `o` counts only the UNLOCKED ones, so the heading's figure is not the strip's length. */
  const unlocked = profile.achievements.filter((row) => row.status === '1').length;
  const strip = visibleMedals(orderMedals(profile.achievements));

  return (
    <div className="w-full rounded-lg bg-layer4 p-3">
      <div className="mb-3 flex h-8 w-full items-center">
        <IconMedal className="size-5" />
        <p className="ml-1 font-extrabold">
          <span>Medals</span>
          <span className="ml-1">{unlocked || 0}</span>
        </p>
        <button
          type="button"
          className="center ml-auto px-1"
          onClick={() => navigate(`/user/medals/${userId}`)}
        >
          {/* `btn-like` IS LIVE and worth not mistaking for a dead class: it is
              `user-select: none; touch-action: manipulation` plus every one of `.button`'s
              interaction rules — the `:active` brightness-and-1px-drop and the desktop-only hover
              brightness — without any of its box. So this Details label presses like a button while
              being a span. Already in this project's `index.css`; the odd part is that only ONE of
              the two Details links on the page carries it (the Statistics card's does not), which
              is the chunk's own inconsistency and is reproduced. */}
          <span className="btn-like text-xs font-extrabold text-brand">Details</span>
          <IconArrow className="ml-1 size-4 rotate-180 fill-brand" />
        </button>
      </div>
      <div className="h-[1px] w-full bg-tertiary opacity-20" />
      <div className="hidden-scroll-bar mt-3 flex w-full items-center gap-3.5 overflow-x-auto">
        {strip.map((row) => (
          <div
            key={`${row.type}_${row.subType}`}
            className="center relative h-15 w-11 flex-none"
          >
            {/* The glow behind the account's CURRENTLY FEATURED medal. `achievementType` is 0 in
                the payload and no medal is type 0, so it never renders — the art is local anyway,
                since it is a base64 data URI in the chunk and cost nothing to decode. */}
            {row.type === profile.achievementType && (
              <img alt="bg" className="absolute bottom-0 left-0 z-0 h-auto w-full" src={achieveBg} />
            )}
            <img
              className="relative z-[1] h-full w-full"
              alt=""
              src={medalIcon(row.type, row.subType, row.status !== '1')}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* `rt` — the Statistics card. The three cells are also the Statistics dialog's; the labels differ
   by one word there ("Total Bets" against "Total Bet Counts") and the icons are the same four. */
function StatisticsCard({ profile, userId, userName, settings }) {
  const navigate = useNavigate();

  const cells = [
    { label: 'Total Wins', Icon: IconTotalWins, count: profile.winNum },
    { label: 'Total Bet Counts', Icon: IconTotalBets, count: profile.betNum },
    {
      label: 'Total Wagered',
      Icon: IconTotalWagered,
      count: printCurrency(profile.betAmountUsd, undefined, { settings }),
    },
  ];

  return (
    <div className="mt-3 w-full rounded-lg bg-layer4 p-3">
      <div className="mb-3 flex h-8 w-full items-center">
        <IconStatistics className="size-5" />
        {/* `test-base` is the original's typo; see the header note. */}
        <p className="test-base ml-1 font-extrabold">Statistics</p>
        <button
          type="button"
          className="center ml-auto px-1"
          onClick={() =>
            navigate(`/user/statistics/?userId=${userId}&userName=${encodeURIComponent(userName)}`)
          }
        >
          <span className="text-xs font-extrabold text-brand">Details</span>
          <IconArrow className="ml-1 size-4 rotate-180 fill-brand" />
        </button>
      </div>
      <div className="h-[1px] w-full bg-tertiary opacity-20" />
      <div className="mt-3 flex w-full flex-wrap items-center justify-between">
        {cells.map(({ label, Icon, count }, index) => (
          <div
            key={label}
            /* `y-3` is another of the original's dead classes — there is no such utility, and the
               vertical rhythm comes from `h-[4.375rem]` plus `pt-1`. Kept. */
            className={`y-3 flex h-[4.375rem] flex-none flex-col items-center justify-center overflow-hidden rounded-lg bg-layer5 pt-1 ${
              index <= 1 ? 'w-[49%]' : 'mt-2 w-full'
            }`}
          >
            <div className="flex w-full items-center justify-center">
              <Icon className="mr-1 size-5 flex-none fill-secondary" />
              <span className="text-xs">{label}</span>
            </div>
            <p className="mt-0.5 text-center text-lg font-semibold">{count || '0'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* `ct` — one favourite game. Unreachable with an empty `favorite`, and built because the chunk
   gives it in full. Its artwork FALLS BACK to a local placeholder in two cases the chunk spells
   out: no `iconThreeFour` at all, and one whose URL contains "common" — the CDN's own generic
   cover, which the site replaces rather than showing. `detail_ko` is the Korean twin and is
   deliberately not fetched, for the reason the VIP page's light backdrops are not. */
function FavouriteGame({ item, settings }) {
  const navigate = useNavigate();

  const href = () => {
    const slug = item.gameItem?.gameIdentity?.gameUrl || item.gameUnique;
    if (!slug) return '/sports';
    if (slug.includes('racing-by-bc-originals')) return '/racing';
    if (slug.includes('detrade-trading')) return '/trading/contract';
    return `/game/${slug}`;
  };

  const art = item.gameItem?.iconThreeFour;
  const src = art && !art.includes('common') ? art : favouriteFallback;

  return (
    <div className="mt-3 flex h-[6.5rem] w-full items-center">
      <div
        className="h-full w-[4.875rem] flex-none overflow-hidden rounded"
        onClick={() => navigate(href())}
      >
        <img alt="game" className="h-full w-full sm:cursor-pointer" src={src} />
      </div>
      <p
        className="ml-3 text-base font-extrabold sm:cursor-pointer"
        onClick={() => navigate(href())}
      >
        {item.gameItem.fullName}
      </p>
      <div className="ml-auto flex flex-col items-end">
        <p className="text-xs font-semibold text-secondary">Wagered</p>
        <p className="font-semibold">
          {printCurrency(item.betAmountUsd, undefined, { settings })}
        </p>
      </div>
    </div>
  );
}

/* `it` — the Top 3 Favorite Games card. */
function FavouritesCard({ favorite, settings }) {
  const rows = favorite.filter((row) => !!row.gameItem);

  return (
    <div className="mt-3 w-full rounded-lg bg-layer4 p-3">
      <div className="flex h-8 w-full items-center text-base font-extrabold">
        Top 3 Favorite Games
      </div>
      <div className="my-3 h-[1px] w-full bg-tertiary opacity-20" />
      {favorite.length > 0 ? (
        rows.map((row) => (
          <FavouriteGame key={row.gameUnique ?? row.gameItem.fullName} item={row} settings={settings} />
        ))
      ) : (
        <div className="center h-80 w-full">
          <EmptyPlaceholder className="h-full w-full" />
        </div>
      )}
    </div>
  );
}

/* `enter` is the dialog manager's transition mode, threaded down from App.jsx because only the
   router knows which way the stack moved — see the note there and in DialogShell.css. */
export default function Profile({ onClose, enter }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { session } = useSession();
  const settings = session.setting;

  /* `Number(route.userId || "0")` on the original. `useParams` resolves against a matched <Route>
     and a dialog route has none here, so the segment is read off the pathname — see App.jsx. */
  const userId = Number(pathname.split('/').pop() || '0');
  const isMyself = session.userId === userId;

  /* `ve(() => (!c() || c() === 0) && e(-1))` — an id of zero is not a profile, so the dialog pops
     itself rather than rendering an empty one. Run in an effect here for the reason the original
     runs it on mount: navigating during render is not allowed. */
  React.useEffect(() => {
    if (!userId) navigate(-1);
  }, [userId, navigate]);

  const read = React.useCallback(() => getUserProfile(userId, session), [userId, session]);
  const { data } = useResource(read);
  const profile = data;

  /* `b()` — your own level comes from the ACCOUNT STORE, not from the payload. `vipTier` is the
     project's own split of the captured VIP ladder; `$().tier.fullName` on the original. Note this
     build's fixture is level 3, so the pill reads "Bronze III" where the capture's level-0 account
     reads "Beginner" — the same difference the Bonus page's level card documents. */
  const level = isMyself ? session.vipLevel : (profile?.level ?? 0);
  const tier = vipTier(level);

  /* The dialog's shell is `DialogShell`'s and is mounted by the caller, so this returning nothing
     leaves a titled, closable card with an empty body — which is why the spinner goes here rather
     than at the mount. `/user/info/<id>/` answers 6001 and the fixture is the resource's own
     declared default, so what lands is the capture: Medals 0, three zero statistics, the
     crocodile under Top 3 Favorite Games. */
  if (!profile) {
    return (
      <div className="center h-96">
        <Loading />
      </div>
    );
  }

  /* `I()` — another player can hide their figures; your own are always shown. `status !== 1` is the
     whole-profile version of the same idea. Both arms render the `privacy` empty state, which this
     build has no artwork for (only `empty` was fetched), so neither is built — and neither is
     reachable, since the only profile routed here is your own. */
  return (
    <DialogShell title={isMyself ? 'My Profile' : 'Profile'} onClose={onClose} enter={enter}>
      <div className="center relative w-full flex-col pb-3 pt-6">
        <div className="center relative h-16 w-16 cursor-pointer rounded-full border-2 border-solid border-layer4">
          <img className="absolute rounded-full sm:cursor-pointer" alt="avatar" src={avatarArt} />
        </div>
        <LevelName level={level} className="z-10 -mt-2">
          <span className="center h-full text-xs">{tier.fullName}</span>
        </LevelName>
        <div className="center mt-1 flex w-full">
          <p className="text-xl font-extrabold">{isMyself ? session.name : profile.name}</p>
        </div>
        <UserIdLine userId={profile.userId} />
        <button
          type="button"
          className="absolute left-0 top-6 flex h-8 cursor-auto items-center rounded-lg bg-layer3 px-2"
        >
          <IconHeart className="size-5 fill-error" />
          <span className="ml-1 text-lg font-semibold">{profile.totalLikeNum || 0}</span>
        </button>
        {/* `cursor-auto` on the like button above is the original's own — the count is a readout,
            and the Like action lives in the avatar popup. */}
        <button
          type="button"
          className="center absolute right-0 top-6 h-8 w-8 rounded-lg bg-layer3"
          onClick={() => navigate('/settings/edit-profile')}
        >
          <IconEdit className="size-5" />
        </button>
      </div>

      <MedalsCard profile={profile} userId={userId} />
      <StatisticsCard
        profile={profile}
        userId={userId}
        userName={isMyself ? session.name : profile.name}
        settings={settings}
      />
      <FavouritesCard favorite={profile.favorite} settings={settings} />

      <div className="center mb-6 mt-3 h-7 w-full text-secondary">
        <span className="px-1">Joined on</span>
        <span>{new Date(profile.createTime).toLocaleDateString()}</span>
      </div>
    </DialogShell>
  );
}
