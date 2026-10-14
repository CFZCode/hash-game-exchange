import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCanSignUp } from '../../context/gates';
import { BetbyIcon, ChevronIcon, SportIcon } from './icons';
import { hasSportIcon } from './sportArt';
import { placeBet } from '../../services/sports';
import { brandName, siteName, siteTitle, useSiteLogo } from '../../services/siteBranding';
import logoImg from '../../assets/logo.png';

/* The bet slip.
 *
 * ── EVERY BOX BELOW IS THE WIDGET'S, READ WITH A LEG IN THE SLIP ────────────────────────────
 *
 * Built against a complete paint list of the live slip — every element with a fill or text,
 * with its box relative to the slip's own corner, its computed colour, size, weight and line
 * height — taken with a real `page.mouse.click()` on an odds button, which is what puts a leg
 * in (a synthetic event never reaches BetBy's handlers). The same dump is then taken of THIS
 * component and diffed row by row; `Sports.css` carries the numbers, and each rule there says
 * which line of the dump it reproduces.
 *
 * Things the dump settled that a screenshot had got wrong:
 *
 *   · the count badge is BLACK with brand-green digits, not the other way round
 *   · "QUICK BET", "BOOK", "LOGIN" and "POTENTIAL WIN" are title-case text under an uppercase
 *     transform — the DOM says "Quick Bet", "Book", "Login", "Potential Win"
 *   · the Quick Bet toggle is an OUTLINED pill (2px black, radius 60) with a black 18px knob
 *     carrying a lightning glyph, not a filled switch
 *   · the tab row has its own layer3 band under it, 42px including the 2px underline
 *   · the card's remove control is a 40px layer5 strip with the corners rounded only on the left
 *   · the stake is a black 128 x 24 form with the currency in an <i> before the input
 *   · the totals are two columns, 172.8 and 115.2 wide, inside a 16px inset
 *   · the footer's status dot is two stacked 8px discs — a layer2 ring under a brand fill
 *
 * ── WHAT IS STILL OURS, AND SAYS SO ────────────────────────────────────────────────────────
 *
 * The SIGNED-IN action and everything after it. The reference session is signed out, so what
 * replaces BOOK and LOGIN for an account holder has not been seen, and neither has what the
 * widget shows once a bet is down. PLACE BET sits at LOGIN's own box and is gated on a stake;
 * pressing it goes through `services/sports.placeBet`, which is the page's one write and the
 * seam a real placement will land on. The receipt it resolves to is drawn from the slip's own
 * vocabulary — the legs, the stake, the odds, the potential win — rather than from a guess at
 * BetBy's, and the empty state that follows it is this build's for the same reason.
 *
 * The currency symbol comes from THIS site's session rather than being the ₹ the reference shows
 * — that account is INR. Signed out here it is the header's own default, exactly as it is there.
 */

const STAKE_CHIPS = [200, 500, 2000, 5000];
const BET_TABS = ['Single', 'Combo', 'System'];

/* The symbol the live slip prints in front of a stake and a win. Intl for a fiat, the ticker for
   a coin Intl has never heard of. */
const currencySymbol = (currencyName = '') => {
  const code = String(currencyName).replace(/FIAT$/, '');
  try {
    const part = new Intl.NumberFormat('en', { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' })
      .formatToParts(0)
      .find((p) => p.type === 'currency');
    return part ? part.value : code;
  } catch {
    return code;
  }
};

/* Glyphs the widget inlines that are in neither BetBy's sprite set nor bc.game's icon modules.
   All 16 or 24 px, all `currentColor`, so the rules in Sports.css colour them. */
const BoltIcon = ({ className = '' }) => (
  <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
    <path d="M9.2 1.5 3.5 9h4l-.7 5.5L12.5 7h-4l.7-5.5z" />
  </svg>
);
const CrossIcon = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4L13.4 12 19 6.4 17.6 5 12 10.6z" />
  </svg>
);
const CheckIcon = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6 12-12L20.1 5.6z" />
  </svg>
);
const PersonIcon = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="9.5" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6.5 18.2c1.3-2.3 3.3-3.4 5.5-3.4s4.2 1.1 5.5 3.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const TrashIcon = ({ className = '' }) => (
  <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
    <path d="M6 2h4l.7 1.3H14v1.4H2V3.3h3.3L6 2zm-2.7 4h9.4l-.8 8H4.1l-.8-8zm2.7 1.3v5.4h1.3V7.3H6zm2.7 0v5.4H10V7.3H8.7z" />
  </svg>
);
const GearIcon = ({ className = '' }) => (
  <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
    <path d="M8 5.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8zm5.7 2.4c0-.3 0-.6-.1-.8l1.4-1-1.3-2.3-1.6.7a5 5 0 0 0-1.4-.8L10.4 2H5.6l-.3 1.8a5 5 0 0 0-1.4.8l-1.6-.7L1 6.2l1.4 1a5.6 5.6 0 0 0 0 1.6L1 9.8l1.3 2.3 1.6-.7a5 5 0 0 0 1.4.8l.3 1.8h4.8l.3-1.8a5 5 0 0 0 1.4-.8l1.6.7 1.3-2.3-1.4-1c.07-.3.1-.5.1-.8z" />
  </svg>
);

export default function BetSlip({
  selections = [],
  onRemove,
  onClear,
  signedIn = false,
  currencyName = '',
}) {
  /* The owner panel's logo (live mode); else the original wordmark. Same 22px-high slot. */
  const brandLogo = useSiteLogo({ own: 'hash-games' });
  const navigate = useNavigate();
  /* No "Join Now!" on a B2B site, which has no sign-up (context/gates.js). */
  const canSignUp = useCanSignUp();
  const [open, setOpen] = React.useState(false);
  const [quickBet, setQuickBet] = React.useState(false);
  const [stake, setStake] = React.useState('');

  /* ── THE PLACEMENT ────────────────────────────────────────────────────────────────────────
   *
   * Three states: nothing in flight, a request out, a receipt back. The request is
   * `services/sports.placeBet`, which answers after the fixture delay — so the button is
   * genuinely pending for as long as a real write would be, rather than flipping straight to a
   * result — and the receipt it resolves to is what the slip prints next. `live` is the usual
   * guard against a resolve landing after the component has gone. */
  const [placing, setPlacing] = React.useState('idle');
  const [receipt, setReceipt] = React.useState(null);
  const alive = React.useRef(true);
  React.useEffect(() => () => { alive.current = false; }, []);

  const count = selections.length;
  const symbol = currencySymbol(currencyName);

  /* ADDING A LEG OPENS THE SLIP — adjusted during render keyed on the count, the pattern
     `MainLayout` and `App` already use; an effect would paint it shut for a frame first. On an
     add only, so clearing the last leg shows the empty state instead of the slip vanishing. It
     also puts a fresh leg in front of an old receipt, which is what you want when you start the
     next bet. */
  const [lastCount, setLastCount] = React.useState(count);
  if (lastCount !== count) {
    setLastCount(count);
    if (count > lastCount) {
      setOpen(true);
      if (placing === 'placed') setPlacing('idle');
    }
  }

  const totalOdds = selections.reduce((product, pick) => product * Number(pick.value || 0), 1);
  const totalBet = Number(stake || 0);
  const potentialWin = totalBet * totalOdds;
  const money = (value) => (Number.isFinite(value) ? value.toFixed(2) : '0.00');

  const submit = async () => {
    if (placing === 'pending' || !(totalBet > 0) || !count) return;
    setPlacing('pending');
    try {
      const result = await placeBet({ selections, stake: totalBet });
      if (!alive.current) return;
      setReceipt(result);
      setPlacing('placed');
      setStake('');
      /* The legs are spent. Clearing them here, after the receipt is in hand, is what keeps the
         receipt on screen — the `count === 0` branch below defers to it. */
      onClear?.();
    } catch {
      if (alive.current) setPlacing('idle');
    }
  };

  const showReceipt = placing === 'placed' && receipt && count === 0;

  return (
    <div className={`sports-betslip ${open ? 'is-open' : ''} ${count ? 'has-picks' : ''}`}>
      {/* The bar is the TOP of the box; the box sits on the viewport's bottom edge. */}
      <div className="sports-betslip-bar">
        <button
          type="button"
          className="sports-betslip-toggle"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <span className="sports-betslip-mark">
            <BetbyIcon name="ic-navbar-mybets" className="sports-betslip-mark-icon" />
          </span>
          <span className="sports-betslip-label">Betslip</span>
          {count > 0 && <span className="sports-betslip-count">{count}</span>}
          <ChevronIcon className="sports-betslip-chevron" />
        </button>

        <div className="sports-betslip-quick">
          <span className="sports-betslip-quick-label">Quick Bet</span>
          <button
            type="button"
            role="switch"
            aria-checked={quickBet}
            className={`sports-betslip-switch ${quickBet ? 'is-on' : ''}`}
            onClick={() => setQuickBet((value) => !value)}
          >
            <span className="sports-betslip-switch-knob">
              <BoltIcon className="sports-betslip-switch-bolt" />
            </span>
          </button>
        </div>
      </div>

      {open && (
        <div className="sports-betslip-panel">
          {showReceipt ? (
            <div className="sports-betslip-receipt">
              <div className="sports-betslip-receipt-head">
                <span className="sports-betslip-receipt-check">
                  <CheckIcon />
                </span>
                <p className="sports-betslip-receipt-title">Bet placed</p>
                <p className="sports-betslip-receipt-id">{receipt.id}</p>
              </div>
              {receipt.legs.map((leg) => (
                <div key={leg.id} className="sports-betslip-receipt-leg">
                  <p className="sports-betslip-receipt-leg-team">{leg.team}</p>
                  <p className="sports-betslip-receipt-leg-sub">{leg.event}</p>
                  <p className="sports-betslip-receipt-leg-sub">
                    {leg.market} · {leg.value}
                  </p>
                </div>
              ))}
              <div className="sports-betslip-totals">
                <div className="sports-betslip-total-row">
                  <span className="sports-betslip-total-label">Total Bet</span>
                  <span className="sports-betslip-total-value">{money(receipt.stake)}</span>
                </div>
                <div className="sports-betslip-total-row is-win">
                  <span className="sports-betslip-total-label">Potential Win</span>
                  <span className="sports-betslip-total-value">
                    {symbol} {money(receipt.potentialWin)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="sports-betslip-secondary"
                onClick={() => setPlacing('idle')}
              >
                New bet
              </button>
            </div>
          ) : count === 0 ? (
            <div className="sports-betslip-empty">
              <BetbyIcon name="ic-navbar-mybets" className="sports-betslip-empty-icon" />
              <p className="sports-betslip-empty-title">Your betslip is empty</p>
              <p className="sports-betslip-empty-note">
                Tap the odds on any event to add a selection.
              </p>
            </div>
          ) : (
            <>
              <div className="sports-betslip-types">
                {BET_TABS.map((tab, index) => (
                  <button
                    key={tab}
                    type="button"
                    className={`sports-betslip-type ${index === 0 ? 'is-active' : ''}`}
                    disabled={index > 0}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="sports-betslip-list">
                {selections.map((pick) => (
                  <div key={pick.id} className="sports-betslip-pick">
                    <button
                      type="button"
                      className="sports-betslip-remove"
                      aria-label={`Remove ${pick.team ?? pick.outcome}`}
                      onClick={() => onRemove?.(pick.id)}
                    >
                      <CrossIcon className="sports-betslip-remove-icon" />
                    </button>
                    <div className="sports-betslip-pick-main">
                      <p className="sports-betslip-pick-team">
                        {hasSportIcon(pick.sport) && (
                          <SportIcon sport={pick.sport} className="sports-betslip-pick-sport" />
                        )}
                        <span>{pick.team ?? pick.outcome}</span>
                      </p>
                      <p className="sports-betslip-pick-event">{pick.event}</p>
                      <p className="sports-betslip-pick-market">{pick.market}</p>
                      <div className="sports-betslip-pick-foot">
                        <span className="sports-betslip-pick-odd">{pick.value}</span>
                        <label className="sports-betslip-stake">
                          <i className="sports-betslip-stake-symbol">{symbol}</i>
                          <input
                            className="sports-betslip-stake-input"
                            inputMode="decimal"
                            value={stake}
                            onChange={(event) => setStake(event.target.value.replace(/[^\d.]/g, ''))}
                            aria-label="Stake"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <img className="sports-betslip-logo" src={brandLogo ?? logoImg} alt={siteName() ?? siteTitle() ?? brandName()} />

              <div className="sports-betslip-chips">
                {STAKE_CHIPS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    className="sports-betslip-chip"
                    onClick={() => setStake(String(amount))}
                  >
                    {amount}
                  </button>
                ))}
              </div>

              <div className="sports-betslip-totals">
                <div className="sports-betslip-total-row">
                  <span className="sports-betslip-total-label">Total Bet</span>
                  <span className="sports-betslip-total-value">{money(totalBet)}</span>
                </div>
                <div className="sports-betslip-total-row is-win">
                  <span className="sports-betslip-total-label">Potential Win</span>
                  <span className="sports-betslip-total-value">
                    {symbol} {money(potentialWin)}
                  </span>
                </div>
              </div>

              {signedIn ? (
                /* INFERRED — see the head of the file. */
                <button
                  type="button"
                  className={`sports-betslip-primary ${placing === 'pending' ? 'is-pending' : ''}`}
                  disabled={!(totalBet > 0) || placing === 'pending'}
                  onClick={submit}
                >
                  {placing === 'pending' && <span className="sports-betslip-spinner" />}
                  {placing === 'pending' ? 'Placing…' : 'Place Bet'}
                </button>
              ) : (
                <>
                  <p className="sports-betslip-note">
                    <PersonIcon className="sports-betslip-note-icon" />
                    <span>Please, login to place bet</span>
                  </p>
                  <button type="button" className="sports-betslip-secondary">
                    Book
                  </button>
                  <button
                    type="button"
                    className="sports-betslip-primary"
                    onClick={() => navigate('/login/signin')}
                  >
                    Login
                  </button>
                  {canSignUp && (
                  <p className="sports-betslip-join">
                    <span>Don&apos;t you have an account?&nbsp;</span>
                    <button type="button" onClick={() => navigate('/login/regist')}>
                      Join Now!
                    </button>
                  </p>
                  )}
                </>
              )}

              <div className="sports-betslip-footer">
                <button
                  type="button"
                  className="sports-betslip-trash"
                  aria-label="Clear the betslip"
                  onClick={onClear}
                >
                  <TrashIcon className="sports-betslip-trash-icon" />
                </button>
                <button type="button" className="sports-betslip-settings">
                  <GearIcon className="sports-betslip-settings-icon" />
                  <span>Odds Settings</span>
                  <span className="sports-betslip-settings-dot" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
