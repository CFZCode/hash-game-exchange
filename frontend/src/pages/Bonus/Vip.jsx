import { SectionGroup } from '../../components/shared/SectionGroup';
import { LockedIcon } from '../Quests/icons';
import { IconBox } from './LevelCard';
import { useSession } from '../../context/session';
import * as icons from './icons';

/* The right-hand panel — `$e` in bonus-v5-page-dF3gugl8.js.
 *
 * IT HAS THREE STATES AND THEY HANG OFF ONE FIELD: `hostCard.userProfile`, out of the vip
 * service. 0 is everyone else, 1 is "YOU ARE IN", 2 is a hosted account. The greeting line
 * changes with it ("We watch. We reach out." / "YOU ARE IN!" / "We're here for you."), and so
 * does what sits under the card:
 *
 *   0  the Bonus teaser (four locked tiles) over the Perks list
 *   1  the Perks list in its VIP form — two rows with tags instead of five — and a Talk to Host
 *      button that emits `live_support`
 *   2  the Your VIP Host card: avatar, name, Telegram handle, Message Host
 *
 * ONLY STATE 0 IS BUILT, and that is what the capture shows. There is no `hostCard` in any
 * captured response and no endpoint here answers for one, so the other two arms would be
 * inventing an account relationship rather than reproducing one. The branch is left in place
 * with its arms named, so filling them in is additive.
 */

/* `oe` — the four locked bonus tiles. Every icon is `text-brand`. */
const BONUS_TILES = [
  { id: 'lossback', Icon: icons.IconLossback, label: 'Lossback' },
  { id: 'reload', Icon: icons.IconReload, label: 'Reload' },
  { id: 'gameplay', Icon: icons.IconGameplayBonus, label: 'Gameplay Bonus' },
  { id: 'topplayer', Icon: icons.IconTopPlayer, label: 'Top Player Bonus' },
];

/* `fe` — the non-VIP perks. Note the colours alternate between brand and `warning_brighter` and
   are the chunk's own per row, not a pattern. */
const PERKS = [
  {
    id: 'host',
    Icon: icons.IconPersonalHost,
    color: 'text-brand',
    title: '24/7 Personal Host',
    description: 'Always on. Always listening.',
  },
  {
    id: 'deposit',
    Icon: icons.IconZeroFee,
    color: 'text-warning_brighter',
    title: 'Zero-fee Deposits & Withdrawals',
    description: 'No transaction fees, ever.',
  },
  {
    id: 'crypto-card',
    Icon: icons.IconCryptoCard,
    color: 'text-brand',
    title: 'Crypto Debit Card',
    description: 'Load with crypto, spend anywhere, withdraw at any ATM.',
  },
  {
    id: 'vip-promotions',
    Icon: icons.IconVipPromotions,
    color: 'text-warning_brighter',
    title: 'VIP-only Promotions',
    description: "Exclusive offers you won't find elsewhere.",
  },
  {
    id: 'events',
    Icon: icons.IconPrivateEvents,
    color: 'text-brand',
    title: 'Private Events & Invites',
    description: 'Meetups, tournaments, and parties - in real life.',
  },
];

/* `le` — the greeting card. Its fill is an inline gradient rather than a token, and the stop at
 * -180% means the brand green never fully lands on the card: what renders is the tail of it in
 * the top-left corner fading into layer3, which is the green wash the capture shows.
 *
 * THE COLOUR STOPS HAD TO BE REWRITTEN, AND THE REASON GENERALISES TO EVERY INLINE COLOUR
 * TRANSCRIBED OUT OF A CHUNK. The original writes `rgb(var(--brand)) -180%, rgb(var(--layer3))
 * 30%`, which works there because Tailwind v3 stores its tokens as bare RGB TRIPLES so that
 * `rgb(var(--x) / <alpha>)` composes. This project's `@theme` stores hex, so
 * `rgb(var(--color-brand))` is not a valid colour, the whole `background` declaration is thrown
 * out at parse time, and the card rendered flat with NO gradient at all — which is exactly how
 * this surfaced. Same trap as the `rgb(var(--fourth) / 0.05)` default the row-group rules had to
 * restate, and the page root's `.app-root` repaint had it too.
 *
 * `Lifetime VIP` is a corner ribbon drawn only for a hosted account, so it is behind the same
 * branch the panel is and is not drawn here. */
function Greeting({ name, title }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-brand/20">
      <div
        className="relative flex items-center gap-6 px-4 py-6"
        style={{
          background: 'linear-gradient(160deg, var(--color-brand) -180%, var(--color-layer3) 30%)',
        }}
      >
        <div className="flex min-w-0 flex-auto flex-col">
          <div className="flex-auto">
            <div className="ellipsis text-xl font-extrabold">
              Good day, <span className="text-brand">{name}</span>
            </div>
            <div className="text-2xl font-extrabold text-primary">{title}</div>
            <div className="mt-2 text-xs text-tertiary">
              Active players, loyal grinders, high rollers. We find our people.
            </div>
          </div>
        </div>
        <div className="size-11 flex-none rounded-xl border border-brand p-1">
          <div className="center size-full rounded-lg bg-brand/20 p-0.5">
            <icons.TierEternal className="icon size-6 rounded-full fill-current text-brand" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* `ie` / `me` — the padlocked subtitle both sections carry while you are outside VIP. */
function LockedNote({ children }) {
  return (
    <div className="mb-2 flex items-center gap-1 text-xs text-quarterary">
      <LockedIcon className="icon size-4 fill-current" /> {children}
    </div>
  );
}

/* `ce` */
function BonusTeaser() {
  return (
    <SectionGroup title="Bonus" subTitle={<LockedNote>Opens up when you make it in</LockedNote>}>
      <div className="flex flex-wrap gap-1.5">
        {BONUS_TILES.map(({ id, Icon, label }) => (
          <div
            key={id}
            className="flex flex-1 basis-36 items-start gap-3 rounded-xl border border-fourth/5 bg-layer3 p-3"
          >
            <div className="mt-0.5 shrink-0">
              <Icon className="icon size-5 fill-current text-brand" />
            </div>
            <span className="text-base font-extrabold text-primary">{label}</span>
          </div>
        ))}
      </div>
    </SectionGroup>
  );
}

/* `Ce` — a perk row. `pr-1` rather than `p-3` on the right is the original's own asymmetry: the
   row has no trailing control, so the padding is trimmed on that side only. */
function PerkRow({ Icon, color, title, description }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-fourth/5 bg-layer3 p-3 pr-1">
      <IconBox className="p-2">
        <Icon className={`icon size-5 fill-current ${color}`} />
      </IconBox>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center text-base font-extrabold text-primary">
          <span className="mr-2">{title}</span>
        </div>
        {description && (
          <span className="mt-.5 text-xs font-semibold text-tertiary">{description}</span>
        )}
      </div>
    </div>
  );
}

/* `J` */
function Perks() {
  return (
    <SectionGroup title="Perks" subTitle={<LockedNote>What VIP actually feels like</LockedNote>}>
      <div className="flex flex-col gap-2">
        {PERKS.map((perk) => (
          <PerkRow key={perk.id} {...perk} />
        ))}
      </div>
    </SectionGroup>
  );
}

export default function Vip() {
  const { session } = useSession();

  /* `t()` — `hostCard.userProfile`, defaulting to 0. There is no hostCard feed here, so this is
     always 0 and the two other arms are unreachable; see the header note. */
  const userProfile = 0;
  const title =
    userProfile === 2 ? "We're here for you." : userProfile === 1 ? 'YOU ARE IN!' : 'We watch. We reach out.';

  return (
    <div className="space-y-2.5">
      <Greeting name={session.name} title={title} />
      <BonusTeaser />
      <Perks />
    </div>
  );
}
