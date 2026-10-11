import applePay from '../../../assets/pay/apple_pay.png';
import mastercard from '../../../assets/pay/mastercard.png';
import visa from '../../../assets/pay/visa.png';
import googlePay from '../../../assets/pay/google_pay.png';
import picPay from '../../../assets/pay/pic_pay.png';

/* `Ot` in bc.game/bc.game/assets/Enter-MsmOuq5R.js — the payment-methods strip.
 *
 * The original branches on locale: an Indonesian visitor gets LinkAja/OVO/DANA/QRIS in
 * place of the card logos, and a Mexican one gets a different component entirely (`ud`).
 * Only the default set is built here.
 *
 * mastercard and visa are inlined as base64 in the bundle rather than shipped as files;
 * they have been decoded into src/assets/pay/ so they behave like every other asset.
 */

/* `En`. Fixed list and fixed order in the original — this is not driven by the user's
   wallet. Icons are the CDN's `.black` variants, the ones the dark theme uses. */
const COINS = ['BTC', 'ETH', 'BNB', 'XRP', 'USDT', 'USDC', 'SOL', 'ADA', 'DOGE', 'MATIC', 'TRX'];

const coinIcons = import.meta.glob('../../../assets/coins/*.png', {
  eager: true,
  import: 'default',
});

const CoinRow = ({ className }) =>
  COINS.map((symbol) => (
    <img
      key={symbol}
      className={className}
      alt={symbol}
      src={coinIcons[`../../../assets/coins/${symbol}.png`]}
    />
  ));

export default function PayYourWay() {
  return (
    /* `mx-4 sm:mx-0` is ours, for the reason the hero, the category cards and every
       GameSection carry `px-4 sm:px-0`: below sm the layout column has no gutter of its own
       and each section supplies it. On the original that gutter comes from the page wrapper —
       `B("relative z-10 w-full px-4", s() ? "sm:px-0" : "mx-auto max-w-[1248px]")` — which
       carries px-4 at every width, so this element never needed one. It was the only Home
       section still missing it, hence the strip running edge to edge on a phone.

       MARGIN, not padding: this element is the one that carries `bg-layer1` and the rounded
       corners, and below sm the coin row sits directly on that background. Padding would hold
       the content in while leaving the layer1 box itself full-bleed — the original insets the
       box, because there the px-4 is on an ancestor. */
    <div className="mx-4 mt-4 rounded-xl bg-layer1 sm:mx-0 sm:mt-7">
      {/* Two coin rows, not one moved around: below sm it sits above the panel on its own
          line, from sm up it is the last flex item inside it. The original renders both and
          lets `sm:!hidden` / `hidden sm:!flex` pick. */}
      <div className="flex items-center justify-center gap-2 pb-4 pt-3 sm:!hidden">
        <CoinRow className="w-6" />
      </div>

      {/* `bg-layer1 dark:bg-alw_dark/70` — the chunk's own pair, and BOTH ARMS ARE WRITTEN. This
          build carried only the dark half, which is a 70% #171A1A wash; in the light theme that
          token is #070F0B and the wash composited to about #4C504F over layer1, i.e. a dark grey
          slab in the middle of a white page. The light arm is `bg-layer1` — the SAME fill as the
          wrapper around it, so the panel is invisible there and the strip reads as one flat card,
          which is the whole reason the outer div carries `bg-layer1` too. */}
      <div className="relative h-24 rounded-xl bg-layer1 dark:bg-alw_dark/70 sm:px-8">
        {/* flex-row-reverse is why the DOM order here reads backwards from the screen: the
            title is last in markup and leftmost on screen. */}
        <div className="relative z-10 flex h-full flex-col items-center justify-center sm:!flex-row-reverse">
          <div className="hidden items-center justify-center sm:!flex">
            <CoinRow className="-ml-1 w-6" />
          </div>

          {/* gap-3 below sm is OURS; the original is gap-6 at every width. The logos are
              fixed w-14/w-7/w-11/w-12/w-15 boxes, so on a phone the five of them plus four
              24px gaps eat most of the panel. sm:gap-6 restores the original from 640 up. */}
          <div className="mx-auto flex items-center justify-center gap-3 sm:gap-6">
            <img className="w-14" alt="apple pay" src={applePay} />
            <img className="w-7" alt="mastercard" src={mastercard} />
            <img className="w-11" alt="visa" src={visa} />
            <img className="w-12" alt="google pay" src={googlePay} />
            <img className="w-15" alt="pic pay" src={picPay} />
          </div>

          {/* mt-2 is OURS; the original stacks these two rows on mt-4 below sm. The panel is a
              fixed h-24 at every width, so tightening the stack only moves the two rows closer
              together inside it. sm:!mt-0 is the original's — from sm up the stack becomes a
              flex-row-reverse and there is no vertical gap to set. */}
          <div className="mt-2 flex items-center justify-center gap-11 sm:!mt-0">
            {/* ONE LINE AT EVERY WIDTH, which is the chunk's own: `p(u, () => y("Pay Your Way"))`
                sets it as a single string with no break. A `<br className="hidden sm:inline" />`
                stood here and split it after "Your" from `sm` up — this build's addition, not a
                transcription, and it is removed rather than made responsive. */}
            <div className="text-lg font-extrabold sm:text-2xl">Pay Your Way</div>
          </div>
        </div>
      </div>
    </div>
  );
}
