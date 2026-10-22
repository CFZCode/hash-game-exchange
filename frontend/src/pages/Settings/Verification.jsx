import { useNavigate } from 'react-router-dom';
import Loading from '../../components/shared/Loading';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { useResource } from '../../hooks/useResource';
import { getKycStatus } from '../../services/settings';
import { useButtonSize } from './buttonSize';
import {
  IconShieldCheck,
  IconPersonalVerification,
  IconFacial,
  IconGovId,
  IconIdCard,
  IconAddressProof,
  IconVideo,
  IconArrow,
  IconCaution,
} from './icons';
import cautionMark from '../../assets/settings/caution.png';
import kycSuccess from '../../assets/settings/kyc_success.png';
import kycFail from '../../assets/settings/kyc_fail.png';

/* `/settings/verification` — Personal Verification, `index-DUZ1QIOc.js`, 40 KB and the largest of
 * the six panes. Two KYC cards side by side under a heading, over a caution banner.
 *
 * THE PANE IS A SWITCH ACROSS SEVEN STATES AND FIVE OF THEM ARE BUILT NOW. bc.game's own
 * `/account/kyc/statusV2/` answers 6002, so with fixtures on the payload is the chunk's declared
 * default plus the two `levelResults` the pane cannot draw without, and `kycStatus: 'init'` puts
 * both cards on their `isPending || isInit` arm — which is the capture: the rule list, a divider,
 * a Start New Verification row, and the review time.
 *
 * **Against the platform the status is live**, and building these arms is what made that mean
 * anything: the pane used to branch on nothing but `levelResults.length`, so a real status changed
 * no pixel. `services/settings.js` maps the platform's five statuses onto four of these and says
 * why one record is Basic rather than half a ladder.
 *
 * The arms: `isVerified` swaps the card BODY for a success illustration, `isRetry` for a failure
 * one plus the rejection reason, `isReject` (final) for a failure one without it, and `isPending`
 * adds an amber ribbon and disables the action row. Two stay unbuilt because each brings a route
 * that does not exist: `isManualPending` replaces the heading with an "Under Manual Review"
 * notice, and `isKycUsed` (`linkStatus === "can_link"`) adds a Link Existing Account row to each
 * card. The chunk's obfuscated anti-tamper snippet inside `u1` is deliberately not ported, the
 * same call Vault Pro's `ht` got.
 */

/* `w2` — one rule row. `tag` and `content` are used by exactly one entry across the two lists, and
   only on the `bcng` white label (Government ID gets an "UPDATED" pill and a line about NIN/BVN),
   so on this deploy both are absent. Written out because the row would otherwise not survive
   turning that flag on. */
function RuleRow({ icon: Icon, desc, tag, content }) {
  return (
    <div className="mt-4 flex min-h-9 items-center px-5">
      <Icon className="size-6 shrink-0 fill-secondary" />
      <div className="ml-2">
        <div className="flex items-center gap-2">
          <p className="text-base font-semibold">{desc}</p>
          {tag ? (
            <span className="rounded bg-success/20 px-1.5 py-0.5 text-xs font-semibold text-success">
              {tag}
            </span>
          ) : null}
        </div>
        {content ? <p className="mt-0.5 text-xs text-tertiary">{content}</p> : null}
      </div>
    </div>
  );
}

/* `b1` — the action row, and it is shared with the unbuilt Link Existing Account row (`j`), which
   is why it takes an icon, a title and a description rather than being written into the card.
   `first:mt-0` is what makes the two stack correctly when both render.

   `*:fill-brand` on the chevron is the remote's own arbitrary variant — `.\*\:fill-brand>*` really
   is in its bootstrap CSS — and it is belt and braces over the `fill-brand` beside it. */
function ActionRow({ icon: Icon, title, desc, onClick, disabled }) {
  const buttonSize = useButtonSize();

  return (
    <div className="mt-3 flex w-full justify-between rounded-md bg-layer6 p-3 first:mt-0">
      <div className="flex h-full">
        <div className="flex h-full">
          <Icon className="size-6 fill-primary" />
        </div>
        <div className="ml-1 flex h-full flex-col justify-between">
          <span className="text-base text-primary">{title}</span>
          <span className="text-sm text-secondary">{desc}</span>
        </div>
      </div>
      <button
        type="button"
        className={`button ${buttonSize} flex w-10 items-center justify-between p-0`}
        onClick={onClick}
        disabled={disabled}
      >
        <span className="text-brand">Go</span>
        <IconArrow className="size-4 rotate-180 fill-brand *:fill-brand" />
      </button>
    </div>
  );
}

/* `u1`. The two cards differ only in their content object — `l.basic` / `l.advance` — and in one
   class: the basic card takes `sm:mt-4` and the advanced one `mt-4`, so on a phone they stack with
   a gap and on a desktop only the first gets a top margin while the row's own `sm:gap-2` separates
   them. */
const CONTENT = {
  basic: {
    title: 'Basic Verification',
    reviewText: 'Review time: Few mins',
    rules: [
      { icon: IconPersonalVerification, desc: 'Personal Information' },
      { icon: IconFacial, desc: 'Facial Verification' },
      { icon: IconGovId, desc: 'Government ID' },
    ],
  },
  advance: {
    title: 'Advanced Verification',
    reviewText: 'Review time: 10d',
    rules: [
      { icon: IconIdCard, desc: 'Personal Information' },
      { icon: IconAddressProof, desc: 'Proof of Address' },
      { icon: IconVideo, desc: 'Video verification' },
    ],
  },
};

/* `_1` — the block under a REJECTED card: the failure illustration, whatever the arm passes in,
   and a "contact us" line that opens live support. The support widget is not built, so the span
   keeps its `cursor-pointer text-brand` and does nothing — the same call every other live-support
   entry point in this project takes. */
function FailureBlock({ children }) {
  return (
    <>
      <img alt="status" className="h-48" src={kycFail} />
      {children}
      <p className="mt-2 text-center font-extrabold text-secondary">
        If you have any questions, you can
        <span className="mx-1 cursor-pointer text-brand">contact us</span>
      </p>
    </>
  );
}

/* `basic-kyc-level` is the fallback out of `link-main-CtXfDPOw.js`, and the only level this
   platform has — `services/kyc.js` says why nothing is sent with it: their KYC carries no `level`
   field at all.

   BOTH GO BUTTONS OPEN `/settings/verify/enter/:levelName`, THE COUNTRY PICKER, which is what the
   original's do. An earlier pass here skipped that step and navigated straight to the form, on
   the reasoning that the picker only exists to configure Sumsub; that was wrong about what a
   visitor sees, and the picker is now built — it carries its choice into the form's country
   field, so it is a step that answers a question rather than one that repeats it. */
const LEVEL_NAME = 'basic-kyc-level';

function KycCard({ isBasic, kycStatus, reason }) {
  const navigate = useNavigate();
  const content = isBasic ? CONTENT.basic : CONTENT.advance;

  /* `s` — the state object, verbatim. Note `init` and `none` are the SAME arm, and that both
     rejection codes are distinct states rather than one: `rejected_retry` prints the reason and
     lets you try again, `rejected_final` does not. Only the statuses the platform can produce are
     reachable here — `services/settings.js` maps its five onto four of these — but all of them
     are written, because a card whose state machine is half a machine is worse than one arm too
     many. `isKycUsed` (`linkStatus === "can_link"`) and `isManualPending` are the two that stay
     unbuilt: each brings a route that does not exist. */
  const isVerified = kycStatus === 'approved';
  const isReject = kycStatus === 'rejected_final';
  const isRetry = kycStatus === 'rejected_retry';
  const isPending = kycStatus === 'pending';
  const isInit = kycStatus === 'init' || kycStatus === 'none';

  const shell = `relative flex-1 rounded-lg bg-layer4 px-4 pb-2 pt-4 sm:bg-layer5 ${
    isBasic ? 'sm:mt-4' : 'mt-4'
  }`;

  /* `S2` — the verified card is a different BODY, not a badge on the same one: the rule list, the
     divider, the action row and the review time all go, and a centred illustration takes their
     place with the heading pinned to the top of a `min-h-72` box. */
  if (isVerified) {
    return (
      <div className={shell}>
        <div className="center relative h-full min-h-72 w-full flex-col justify-center">
          <p className="absolute top-0 text-center text-base font-extrabold">
            {content.title} Verified
          </p>
          <img alt="status" className="h-48" src={kycSuccess} />
        </div>
      </div>
    );
  }

  if (isReject) {
    return (
      <div className={shell}>
        <div className="center w-full flex-col">
          <p className="text-center text-base font-extrabold">{content.title} Failed</p>
          <FailureBlock />
        </div>
      </div>
    );
  }

  /* `isRetry` — the only arm that prints WHY, and the reason is the row's own
     `moderationComment`. `V2`'s `mt-[66px]` on the divider is the chunk's: it pushes the action
     row down to where it sits on the other arms, so the card does not change height when a
     rejection is showing. */
  if (isRetry) {
    return (
      <div className={shell}>
        {/* `$1` — the ribbon, and it is NOT the pending one: a red 20% wash rather than the
            warning fill, with its own error-coloured label. */}
        <div
          className="absolute right-0 top-0 flex h-7 items-center rounded-bl-xl rounded-tr-xl px-2"
          style={{ background: 'rgba(252, 60, 60, 0.20)' }}
        >
          <IconCaution className="size-4 fill-error" />
          <span className="ml-1 text-xs font-semibold text-error">Verification Failed</span>
        </div>
        <div className="center w-full flex-col">
          <p className="mt-4 text-center text-base font-extrabold">{content.title} Failed</p>
          <div className="mt-6 w-full">
            <p className="text-base font-extrabold">Failed Reason:</p>
            <p className="mt-1 text-base font-extrabold text-error">{reason || '-'}</p>
          </div>
        </div>
        <div className="mb-4 mt-[66px] w-full border-[0.5px] border-solid border-third" />
        <ActionRow
          icon={IconPersonalVerification}
          title="Start New Verification"
          desc="Submit new identity documents"
          onClick={() => navigate(`/settings/verify/enter/${LEVEL_NAME}`)}
        />
      </div>
    );
  }

  /* `isPending || isInit` — the arm the capture shows, and the only difference between its two
     halves is the ribbon and the `mb-4` spacer under it. The action row is DISABLED while a
     review is running (`g()` — pending on a vendor other than shufti), which is what stops a
     second submission landing on top of the first.

     An unrecognised status renders NOTHING, which is `Z1`'s own `fallback: null` rather than a
     defensive default of ours: the arms above cover every status the server can send, so a card
     that matches none of them is a payload this page does not understand. */
  if (!isPending && !isInit) return null;

  return (
    <div className={shell}>
      {isPending ? (
        <>
          <div className="absolute right-0 top-0 flex h-7 items-center rounded-bl-xl rounded-tr-xl bg-warning px-2">
            <IconCaution className="size-4 fill-primary" />
            <span className="ml-1 text-xs font-semibold">Pending Review</span>
          </div>
          <div className="mb-4" />
        </>
      ) : null}
      <p className="text-center text-base font-extrabold">{content.title}</p>
      {content.rules.map((rule) => (
        <RuleRow key={rule.desc} {...rule} />
      ))}
      {/* `border-[0.5px]` — a half-pixel rule, which is the chunk's and renders as a hairline. */}
      <div className="my-4 w-full border-[0.5px] border-solid border-third" />
      <ActionRow
        icon={IconPersonalVerification}
        title="Start New Verification"
        desc="Submit new identity documents"
        disabled={isPending}
        onClick={() => navigate(`/settings/verify/enter/${LEVEL_NAME}`)}
      />
      {/* `font-[400]` on a card whose other text is semibold or extrabold — an arbitrary weight
          rather than a utility, and the chunk's own. */}
      <p className="mt-3 w-full text-center font-[400] text-primary">{content.reviewText}</p>
    </div>
  );
}

export default function SettingsVerification() {
  const isDesktop = useIsDesktop();
  const { data } = useResource(getKycStatus);

  const levels = data?.levelResults ?? [];

  return (
    /* The pane's own card is `sm:` only: on a phone the two KYC cards sit straight on the page
       background with their own `bg-layer4`, and from `sm` up they sit inside this layer4 box and
       switch to `bg-layer5` themselves. That is why both fills appear on each card's class list. */
    <div className="py-4 sm:rounded-lg sm:bg-layer4 sm:px-6 sm:py-6">
      <div className="w-full">
        {isDesktop ? (
          <div className="flex h-12 items-center border-b border-third pb-4">
            <span className="text-base font-extrabold">Personal Verification</span>
          </div>
        ) : null}

        {levels.length === 0 ? (
          <div className="center h-60 w-full">
            <Loading />
          </div>
        ) : (
          <>
            <div className="mb-0 flex w-full flex-col items-center sm:mt-4">
              <div className="flex items-center gap-1">
                <IconShieldCheck className="size-6 fill-brand" />
                <p className="text-lg font-extrabold">ELITE SECURITY · ZERO FRICTION</p>
              </div>
              <div className="text-sm text-tertiary">
                Complete KYC for uncapped power and priority payouts.
              </div>
            </div>

            {/* Basic only (`levelResults[0]`): the site does no face, address or video check, so the
                Advanced card (`[1]`) is not drawn (owner's decision, 22 Oct 2026). */}
            <div className="w-full sm:flex sm:gap-2">
              <KycCard
                isBasic
                kycStatus={levels[0]?.kycStatus}
                reason={levels[0]?.moderationComment}
              />
            </div>
          </>
        )}
      </div>

      {/* `Q2` — the caution banner. `text-error` on the box and `text-secondary` on the paragraph,
          so only the icon and the fill are red; the copy is the page's ordinary secondary. That
          reads as a mistake in the capture and is the chunk's. `bg-error/20` is the fill. The mark
          is the remote's own `caution` asset, a base64 PNG in `index-DCuiUMn6.js` decoded to a
          file — not the `IconCaution` chunk, which is a different drawing. */}
      <div className="mt-4 flex rounded-lg bg-error/20 p-2 text-error">
        <img className="h-6 w-6 flex-none" alt="caution" src={cautionMark} />
        <p className="ml-1.5 text-secondary">
          Verification attempts are limited. Please ensure the submitted documents are clear and
          authentic.
        </p>
      </div>
    </div>
  );
}

/* BOTH GO BUTTONS NOW LEAD SOMEWHERE — `/settings/verify/basic-kyc-level`, the cockpit's own
   route, whose dialog is `components/modals/Verification`. Read the note there before changing
   it: the original's cockpit is Sumsub's hosted WebSDK and the form inside it is the one screen
   in this project that is not a port, because there was nothing to port.

   THE COUNTRY PICKER IN BETWEEN IS SKIPPED. On the original, Go goes to
   `/settings/verify/enter/:levelName` — `CockpitEnter-ztfv3WYR.js`, a single "Select Country"
   dropdown whose button then navigates on to the cockpit. Its whole purpose is to pass a country
   into Sumsub's `withConf({country})`; with no Sumsub there is nothing for it to configure, and
   the platform takes `country` as a field on the form itself. So the step is dropped rather than
   reproduced as a screen that collects a value twice.

   Still not built, each inert at its call site: the KYC appeal dialog and its 50-character
   textarea (`POST /account/kyc/appeal/`), the six unreachable card states listed at the head of
   this file, and the Brazil CPF compliance form the chunk also carries, which is behind a
   `<Show when={!1}>` on this deploy. */
