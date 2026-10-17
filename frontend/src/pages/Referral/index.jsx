import { Navigate, useNavigate } from 'react-router-dom';
import { getReferral } from '../../services/referral';
import { useResource } from '../../hooks/useResource';
import Loading from '../../components/shared/Loading';
import { useSession } from '../../context/session';
import useMediaQuery from '../../hooks/useMediaQuery';
import { REFERRAL_AMOUNT } from './referral';
import { fill } from './format';
import { useSelectedCurrency } from '../../hooks/useSelectedCurrency';
import { LiveRewards, ProgramBand, Faq, Segments } from './blocks';
import * as globMaps from './index.globs.js';
import './Referral.css';

/* The referral programme's landing page — `/referral-exhibition`.
 *
 * That is the original's own path, and it is the page a logged-out visitor actually gets:
 * `/referral` carries `guards: [() => !b.login && "/referral-exhibition"]`, so the sidebar's
 * Referral row lands here rather than on the dashboard. The signed-in `AffiliatePage` behind
 * `/referral` is a different, much larger page and is not built — see services/referral.js,
 * which also documents how all four chunks were recovered.
 *
 * NOTHING HERE IS INFERRED EXCEPT THE FOUR TICKER ROWS. The class lists below are the Solid
 * templates' own, straight out of `index-ve9CyRhD.js` and `Questions-dsRHzmFN.js`; the copy is
 * verbatim i18n. The only screenshot-sourced data on the page is the Live Rewards list, which
 * has a real endpoint but no captured response.
 *
 * THREE DEAD CLASSES ARE KEPT, all the original's own and all verified absent from every
 * stylesheet in the mirror (`index-DxOqNczA.css`, `Enter-uT7xMZD7.css`, and the four others):
 *
 * - `not-full` on the Send Now button. Generates no rule at all.
 * - `contacts-link-item` on the anchor around it. Same.
 * - `l` on the email paragraph. This one is the trap, because the class DOES exist — as
 *   `.wager-item .item-inner .bot .l { opacity: .6 }`, scoped to a component that is nowhere
 *   near this page. The email renders at full opacity, which is what the capture shows. Do not
 *   "restore" the 60% by hoisting that rule.
 *
 * MOBILE. The route carries `info: { dialog: m.mobile }`, the same flag `/vip-detail`,
 * `/deposit-offer` and the promotions family carry — below `sm` the original presents this as a
 * full-screen dialog rather than a page. It is handled the same way here: it renders as a page,
 * and the responsive class lists (which the original ships either way) do the work. Both mobile
 * artwork variants ARE fetched and wired, so the banner and the programme band are already
 * correct for whoever builds that shell.
 */

/* One glob for the page, as every other page here keeps one — `import.meta.glob` resolves
   relative to its own module, so it cannot be shared. */
const art = globMaps.art;
const artFor = (name) => art[`../../assets/referral/${name}.png`];


export default function Referral() {
  const { data } = useResource(getReferral);
  const { session } = useSession();
  const navigate = useNavigate();

  /* `ee.mobile` picks two of this page's images — the hero's artwork and the programme band's
     backdrop — and it is read as the 640 line here for the reason the VIP page documents at
     length: the layout those images belong to swaps at `sm:`, so the file has to swap with it.
     The hero is `sm:flex sm:h-64` over an image that goes from `w-full` to `sm:w-[600px]`, and
     the desktop file is a 1366x822 landscape crop against the mobile file's 856x592. Gate it at
     1024 and everything from 640 to 1023 gets the desktop LAYOUT with the mobile ARTWORK.

     Same caveat as VIP: the original's flag is a DEVICE test, so a phone in landscape is mobile
     to it at any width. No media query can express that. */
  const isDesktop = useMediaQuery('(min-width: 640px)');
  /* `REFERRAL_AMOUNT` is USD-designed; shown in the selected currency (a hook, so above the returns). */
  const cur = useSelectedCurrency();


  const size = isDesktop ? ' button-m' : '';

  /* `guards: [() => b.login && "/referral"]` — the route's own, and the mirror image of the one
     the dashboard carries. It could not be reproduced until the dashboard existed: sending a
     signed-in visitor to `/referral` when nothing rendered there would have bounced them
     straight back, or worse, to the catch-all. */
  if (session.login) return <Navigate to="/referral" replace />;

  /* One read for the whole page — the hero copy, the reward cards, the Live Rewards rows, the
     programme band and the FAQ are all fields of it. */
  if (!data) {
    return (
      <div className="center h-[60vh]">
        <Loading />
      </div>
    );
  }

  const { hero, cards, program, faq, live } = data;

  const amount = cur.show(REFERRAL_AMOUNT, 'USDFIAT');

  /* The FAQ's two clickable spans. The chunk sends a signed-out visitor to registration from
     either of them and only routes for real once logged in — `if (!a.login) { n("/login/regist"); return }`
     — so both land on the auth dialog here, which is a real route in this build. */
  const onAction = (target) => {
    if (!session.login) {
      navigate('/login/regist');
      return;
    }
    navigate(target === 'dashboard' ? '/referral' : target);
  };

  return (
    <div className="px-4 sm:px-0">

      {/* THE TOP MARGIN IS DROPPED. The original's is `sm:mt-6`; putting it back is the
          revert. Three things stack above the artwork on desktop and only one was ever
          this page's to give:

            12px    `--header-mb`, which `.main-layout-content` folds into its padding-top.
                    Shared with every route, so it is left alone here.
            24px    `sm:mt-6`, the original's own. Removed.
            18.7px  INSIDE the card — and this one is not spacing at all.
                    `banner_right.png` is 1366x822 but its opaque ink spans only
                    y 162..780, so at `sm:w-[600px]` the element renders 361px tall,
                    overflows the 256px (`sm:h-64`) card by 52.5px each way under
                    `sm:items-center`, and its own transparent margin puts the first
                    visible pixel 18.7px below the card's top edge.

          So header-to-artwork bottoms out near 31px however this class is written;
          lower than that means changing `--header-mb` for every page, or cropping the
          PNG. Below 640 none of it applies — `--header-mb` is 0px, the margin was
          `sm:`-only, and the banner is already flush against the mobile header.

          `mb-4` is untouched: it separates the hero from the cards, where nothing else
          contributes. */}
      <div
        className="-mx-4 mb-4 bg-cover bg-no-repeat pt-10 sm:mx-0 sm:flex sm:h-64 sm:items-center sm:justify-around sm:rounded-xl sm:pt-0"
        style={{ backgroundImage: `url(${artFor(isDesktop ? 'banner_bg' : 'banner_bg_m')})` }}
      >
        <div className="flex flex-col items-center gap-2 font-extrabold sm:text-center">
          <p className="text-nowrap text-3xl">{hero.title}</p>
          {/* Three nodes in the template's own order: the amount is inserted BEFORE the
              literal " + 25% " text node and "Commission" is appended after it. */}
          <p className="text-nowrap text-2xl font-extrabold text-brand">
            {amount}
            {hero.plus}
            {hero.commission}
          </p>
          {/* `p-6` on a `.button-m`: the height stays 2.5rem, so the 24px is horizontal padding
              in practice. Both are the original's and both are kept. */}
          <button
            type="button"
            className={`button button-brand${size} my-6 p-6 text-base sm:my-2`}
            onClick={() => navigate(hero.cta.href)}
          >
            {hero.cta.label}
          </button>
          <p
            className="cursor-pointer font-extrabold text-brand"
            onClick={() => navigate(hero.terms.href)}
          >
            {hero.terms.label}
          </p>
        </div>
        <img
          className="mt-4 w-full sm:mt-0 sm:w-[600px]"
          alt="bg"
          src={artFor(isDesktop ? 'banner_right' : 'banner_right_m')}
        />
      </div>

      {/* ------------------------------------------------------------- everything below it */}
      {/* One `gap-4` column holding the two reward cards, the ticker, the programme band and
          the FAQ. The `-mx-4 … px-4 sm:mx-0 sm:px-0` pair widens the block to full bleed below
          640 and then puts the gutter back INSIDE it, so the cards keep their inset while the
          container does not. */}
      {/* `mb-3` DROPPED — the original's own class, and the second half of a pair that only
          this build has. The FAQ card is the last thing before the footer, and what sat
          between them was this 12px plus `.footer-bg`'s own 1rem top margin (Footer.css),
          which is OURS rather than the original's — the live site butts its footer straight
          against the content. 28px between the two became 16.

          The footer's margin is deliberately not the one cut: it is the shared gap every
          route gets, and trimming it here would mean re-tuning the trailing `mb-4`/`mb-6`
          the promotions pages carry for the same reason. Restore `mb-3` to revert. */}
      <div className="-mx-4 flex flex-col gap-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex flex-col gap-4 sm:flex-row">
          {cards.map((card) => (
            <div key={card.key} className="relative flex-1 rounded-xl bg-layer4 p-6">
              {/* `sm:w-1/2` on the text column is what leaves the right half for the artwork,
                  which is absolutely positioned from 640 up and simply follows the text below
                  it. The button is appended AFTER the image in the template, so on mobile the
                  order is title, copy, art, button. */}
              <div className="flex flex-col gap-3 sm:w-1/2">
                <p className="text-2xl font-extrabold">
                  <Segments parts={card.title} amount={amount} />
                </p>
                <p className="text-base font-semibold text-secondary">
                  {fill(card.desc, amount)}
                </p>
                <img
                  className="right-4 w-full sm:absolute sm:top-1/2 sm:w-2/5 sm:-translate-y-1/2"
                  alt={card.alt}
                  src={artFor(card.art)}
                />
                <button
                  type="button"
                  className={`button button-second${size} w-full bg-layer5`}
                  onClick={() => navigate(card.cta.href)}
                >
                  {card.cta.label}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* The three shared bands — Live Rewards, the affiliate-programme card and the FAQ.
            All three are `Questions-dsRHzmFN.js` exports, and the signed-in dashboard renders
            the identical trio from the same chunk, which is why they moved to ./blocks.jsx. */}
        <LiveRewards live={live} />
        <ProgramBand program={program} isDesktop={isDesktop} size={size} />
        <Faq faq={faq} amount={amount} onAction={onAction} />
      </div>
    </div>
  );
}
