import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useResource } from '../../../../hooks/useResource';
import { getDepositBonuses } from '../../../../services/bonus';
/* `terms_conditions-CMmbakX6.js` — its own chunk on the original, imported by BOTH this widget and
   the `/deposit-offer` page, which is why importing it across is the arrangement rather than a
   shortcut. It stays in `pages/DepositOffer/` rather than moving to `components/shared/` because
   its two helpers do: `stageMatch` lives in that page's fixture module beside the provenance
   comments it belongs to, and the dialog reads the same bonus row this card does. */
import DetailDialog from '../../../DepositOffer/DetailDialog';
import {
  artFor,
  ARROW_PATH,
  SLIDE_PAD,
  CARD,
  CARD_BODY,
  CARD_TAG,
  CARD_BUTTON,
} from './card';
import Skeleton from '../../../../components/shared/Skeleton';

/* The carousel's first slide — the monthly deposit bonus.
 *
 * WHAT THIS IS ON THE ORIGINAL. `HomeDepositBanners` (`home-deposit-banners-BHZ_UQsB.js`) is
 * three lines long: it renders `<Widget target="banner-home"/>`. The card itself is a UI widget
 * registered against that target inside `widget-entry-DTIkOyrt.js`, the bonus framework, which
 * matches on `["MONTHLY","COMMON-NEWBIE","VN-DAILY","MX-NEWBIE","SPECIAL"]`. Both chunks came
 * off hash.game; neither is in the saved mirror.
 *
 * Only the MONTHLY arm is built, and that is not a shortcut — it is the only one this account
 * can be in. The framework derives `seq` as "last claimed stage + 1" and `currenSeqBonusList`
 * as the rows at that seq, and the feed's `depositBonusType` is MONTHLY.
 *
 * THE FEED IS REAL, and it settles something this project had only reconstructed.
 * `/activity/recharge-bonus/progress/` (named in `deposit-offer-service-C1CBxY0W.js`, which IS
 * in the mirror) answers on hash.game, and its four rows carry
 *
 *   bonusRatio      1.8  2.4  3.0  3.6
 *   extraBonusRatio 0.4  0.6  1.0  1.4
 *   minDeposit      5    10   20   30      currency BCD
 *   expiredTime     1788220799999
 *
 * — which is the /deposit-offer fixture's 180/40, 240/60, 300/100, 360/140 and its five/ten/
 * twenty/thirty exactly, and the same `expiresinms` that page's countdown was derived from.
 * The reconstruction was right on every value. Nothing new had to be added for this card: the
 * percentage below is `stage.bonus + stage.rakeback`, which is the page's own `stageMatch`.
 *
 * `onLearnMore` IS THE CHECK BUTTON AND IT BRANCHES, verbatim from `widget-entry-DTIkOyrt.js`:
 *
 *   onLearnMore: () => {
 *     if (e.rawBonusList.some(p => p.done)) navigate("/deposit-offer");
 *     else popup.push(() => <TermsConditions data={{depositBonusType: e.type,
 *                                                   progressList: e.rawBonusList}} isLock={!1}
 *                                            activeType={t.selectedBonusType}/>)
 *   }
 *
 * — so it only leaves the page once something has been claimed, and otherwise raises a popup. BOTH
 * ARMS ARE WIRED NOW. This file used to take the navigate arm unconditionally, on a note saying the
 * popup was not built; that was wrong twice over. `terms_conditions-CMmbakX6.js` renders
 * `<PopCenter class="bonus-terms-conditions">` over an "Overview" heading and a `<For>` of stage
 * cards carrying `bonusRatio` / `minDeposit` / `currency` — which is precisely the dialog
 * `/deposit-offer` already shows behind View Detail, transcribed there as `DetailDialog` and
 * carrying that same class. One component, two triggers, exactly as the page's own note says of
 * its two.
 *
 * `rawBonusList.some(p => p.done)` HAS NO DIRECT FIELD in this build's fixture, which carries a
 * `currentStage` rather than a per-stage flag — `currentStage: 1` is the capture's own unclaimed
 * state. `> 1` is the nearest expression of it: the stages before the current one are the claimed
 * ones. Both arms are reachable by editing that one number.
 */

/* `I.generateBonusPercentage(n, t)`:
 *   `${new Big(n).mul(100).toFixed(0)}% ${t("Bonus")}`
 * The fixture stores the two halves as whole percents (180 + 40) where the feed sends ratios
 * (1.8 + 0.4), so the ×100 has already happened — same number either way. */
const bonusPercentage = (percent) => `${percent}% Bonus`;

/* `I.generateMonthlyBannerText()`. The arrow is two ASCII characters in the i18n bundle, not
   an entity and not an icon. */
const MONTHLY_BANNER_TEXT = 'Deposit -> Get Bonus';

/* `style` is keen-slider's, threaded in from the carousel — the card's own outer div is the
   slide, so its sizing and transform land here rather than on a wrapper. */
export default function DepositSlide({ style }) {
  const navigate = useNavigate();
  const { data, loading } = useResource(getDepositBonuses);

  /* `Ee.push(...)` on the original — the shared popup stack, which this build has no equivalent of,
     so the dialog is local state here exactly as it is on `/deposit-offer`. */
  const [detail, setDetail] = React.useState(null);

  /* The slide's SLOT is reserved by the carousel whatever this returns — `slides` puts the
     deposit entry at the head of the strip on `type === "top"` without consulting the payload —
     so a bare `return null` while the read is out leaves a hole where a card is, and the strip
     visibly fills in from the left. The placeholder is the card's own box (see `CARD_BODY`'s note
     in ./card.js: 202px, which is `h-[12.625rem]`), so the slide is the right width and height
     from the first frame. `!monthly` after it is the settled "no bonus applies" arm and really
     does render nothing. */
  if (loading) {
    return (
      <div className={SLIDE_PAD} style={style}>
        <Skeleton className="block h-[12.625rem] w-full rounded-xl" radius={0}>
          <div className="size-full" />
        </Skeleton>
      </div>
    );
  }

  const monthly = data?.bonuses?.[0];
  if (!monthly) return null;

  /* `currenSeqBonusList` — the stages at the current seq, of which MONTHLY has exactly one. */
  const stage = monthly.stages[monthly.currentStage - 1];
  if (!stage) return null;

  return (
    <div className={SLIDE_PAD} style={style}>
      {/* Not a link, unlike a feed card: the widget's root is a plain div and each of the two
          buttons carries its own destination. */}
      <div className={CARD}>
        <div
          className={CARD_BODY}
          style={{ backgroundImage: `url(${artFor('deposit_monthly')})` }}
        >
          {/* `c()` — the tag is "New User" for COMMON-NEWBIE and "Deposit" for MONTHLY. */}
          <span className={CARD_TAG}>Deposit</span>

          {/* The bare wrapper is the chunk's own: `label` is an array of two nodes inserted
              into an unclassed div, so the heading and the strapline are siblings inside it. */}
          <div>
            <div className="-mt-1 line-clamp-2 overflow-hidden pb-2 pr-36 pt-1 text-xl font-extrabold uppercase leading-6">
              Deposit Bonus
              <div className="mt-1">{bonusPercentage(stage.bonus + stage.rakeback)}</div>
            </div>
            <div className="line-clamp-2 overflow-hidden pr-40 text-sm uppercase text-secondary">
              <div>{MONTHLY_BANNER_TEXT}</div>
            </div>
          </div>

          {/* `pr-20` here where a feed card has `pr-40` — this row holds two buttons, and the
              second is absolutely positioned over the artwork's right edge. */}
          <div className="relative mt-auto pr-20">
            <button type="button" className={CARD_BUTTON} onClick={() => navigate('/deposit')}>
              <span className="truncate">Deposit Now</span>
            </button>

            <button
              type="button"
              className="button button-xs absolute bottom-1 right-2 flex h-9 w-fit items-center justify-center rounded-lg border border-white_alpha20 bg-black_alpha20 px-3 text-sm text-alw_white backdrop-blur-sm"
              onClick={() =>
                monthly.currentStage > 1 ? navigate('/deposit-offer') : setDetail(monthly)
              }
            >
              Check
              {/* `.icon` is the site's own class and carries `fill: currentColor`, which is why
                  the live DOM has no fill utility on this element. */}
              <svg viewBox="0 0 32 32" className="icon -mr-2 size-5 rotate-180">
                <path d={ARROW_PATH} />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {detail && <DetailDialog bonus={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
