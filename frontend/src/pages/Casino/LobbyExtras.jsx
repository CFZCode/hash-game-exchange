import React from 'react';
import { Link } from 'react-router-dom';
import useResource from '../../hooks/useResource';
import { getPromotions } from '../../services/promotions';
import { loadEnabledCurrencies, ownerImage } from '../../services/currencies';
import { USE_FIXTURES } from '../../services/client';
import { useGates } from '../../context/gates';
import { coinIcon } from '../../utils/coinArt';

/* Two Jack55 lobby blocks that sit between the game rows (Casino/index.jsx `Lobby`):
 *
 *  - LobbyPromoBanner, after Hot Games: the newest live CASINO promotion from the site admin
 *    (`GET /admin/promotions`, the same list /promotions/promotion shows), opening its own page.
 *    With none published it falls back to the VIP Club / rakeback banner on the Jack55 art, and
 *    with the VIP section switched off it draws nothing.
 *
 *  - PayYourWay, after Live Casino: the ways this site actually takes money. The coins are the
 *    owner's enabled list (`GET /admin/currencies/public`, each with its own uploaded icon); the
 *    text marks are the fiat rails behind them (UPI and bank transfer for INR, bank transfer for
 *    any other fiat). Card brands the platform does not process are deliberately not shown. */

const readCasinoPromos = () => (USE_FIXTURES ? null : getPromotions({ tab: 'casino' }));

export function LobbyPromoBanner() {
  const gates = useGates();
  const { data } = useResource(readCasinoPromos);
  const promo = data?.promotions?.find((row) => row.href);

  const banner = promo
    ? {
        to: promo.href,
        eyebrow: 'Promotion',
        title: promo.headline,
        text: promo.description,
        cta: 'View offer',
        image: promo.imageUrl,
      }
    : gates.routeOn('/vip')
      ? {
          to: '/vip',
          eyebrow: 'VIP Club',
          title: 'Rakeback on every bet',
          text: 'Climb the VIP ladder for rakeback and level-up bonuses.',
          cta: 'Join VIP Club',
          image: '/jack55-reference-assets/casino-promo-rakeback.png',
        }
      : null;

  if (!banner) return null;

  return (
    <Link to={banner.to} className="lobby-promo-banner" aria-label={banner.title}>
      <div className="lobby-promo-copy">
        <span className="lobby-promo-eyebrow">{banner.eyebrow}</span>
        <strong className="lobby-promo-title">{banner.title}</strong>
        {banner.text && <span className="lobby-promo-text">{banner.text}</span>}
        <span className="lobby-promo-cta">{banner.cta}</span>
      </div>
      {banner.image && (
        <div className="lobby-promo-art">
          <img src={banner.image} alt="" loading="lazy" />
        </div>
      )}
    </Link>
  );
}

const fiatRails = (code) => (code === 'INR' ? ['UPI', 'Bank Transfer'] : ['Bank Transfer']);

export function PayYourWay() {
  const [list, setList] = React.useState(undefined);
  React.useEffect(() => {
    let live = true;
    Promise.resolve(loadEnabledCurrencies()).then((rows) => live && setList(Array.isArray(rows) ? rows : null));
    return () => {
      live = false;
    };
  }, []);

  /* Fixture builds (no owner list): the three coins the live site runs on. */
  const coins = list === undefined ? [] : list ?? [{ code: 'INR', kind: 'fiat' }, { code: 'USDT', kind: 'crypto' }, { code: 'BTC', kind: 'crypto' }];
  if (!coins.length) return null;

  const rails = [...new Set(coins.filter((c) => c.kind === 'fiat').flatMap((c) => fiatRails(String(c.code).toUpperCase())))];
  const icons = coins
    .map((c) => ({ code: String(c.code).toUpperCase(), name: c.name || c.code }))
    .map((c) => ({ ...c, src: ownerImage(c.code, list ?? undefined) || coinIcon(c.code) || coinIcon(`${c.code}FIAT`) }))
    .filter((c) => c.src);

  return (
    <section className="pay-your-way" aria-label="Payment methods">
      <h2 className="pay-your-way-title">Pay Your Way</h2>
      {rails.length > 0 && (
        <ul className="pay-your-way-rails">
          {rails.map((rail) => (
            <li key={rail}>{rail}</li>
          ))}
        </ul>
      )}
      <ul className="pay-your-way-coins">
        {icons.map((coin) => (
          <li key={coin.code} title={coin.name}>
            <img src={coin.src} alt={coin.code} loading="lazy" />
          </li>
        ))}
      </ul>
    </section>
  );
}
