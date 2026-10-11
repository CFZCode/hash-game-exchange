/* The country list behind the verification flow's "Select Country" step.
 *
 * ── WHY THIS FILE EXISTS AT ALL ───────────────────────────────────────────────────────────────
 *
 * The original does not ship one. `utils-DobeMSOM.js` opens its store with `areaCodes: []` and
 * fills it from `POST /account/phone/get/area/` with `{cache: true}`, each row being
 *
 *   { countryCode: "US", areaCode: "1", en: "United States", value: "1", emoji: "🇺🇸" }
 *
 * — the shape `S0` in that chunk declares as its single fallback. That feed is SHUT on this
 * deploy: `hash.game/api/account/phone/get/area/` answers 403 on both POST and GET, which is the
 * `/account/*` family's usual refusal and is recorded with the other ten in `docs/settings.md`.
 * So the list is not recoverable, and rung 6 of the ladder — the module's own declared default —
 * yields exactly one row, the United States.
 *
 * A one-row country picker is not a port of anything. So the CODES below are ISO 3166-1 alpha-2,
 * which is a public standard rather than bc.game content, and everything else is DERIVED rather
 * than written down:
 *
 *   the name   `Intl.DisplayNames(['en'], {type: 'region'})` — the browser's own CLDR names, so
 *              nothing here transcribes a list of country names that could drift or be wrong.
 *   the flag   computed from the code's two letters as regional-indicator symbols, which is what
 *              an emoji flag IS — `US` -> U+1F1FA U+1F1F8. The original stores the character; the
 *              arithmetic gives the identical one.
 *
 * `areaCode`/`value` — the dialling code — are NOT reproduced. The original carries them because
 * the same store feeds phone binding; the verification step reads only `countryCode` and `en`,
 * and this platform's KYC takes a country NAME as free text (`2..100`). Adding 250 dialling codes
 * for a field nothing reads would be the invention this file exists to avoid.
 */

const CODES =
  'AD AE AF AG AI AL AM AO AR AT AU AW AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ ' +
  'CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM ' +
  'FR GA GB GD GE GH GM GN GQ GR GT GW GY HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG ' +
  'KH KI KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MR ' +
  'MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PT PW PY QA RO RS RU ' +
  'RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV ' +
  'TW TZ UA UG US UY UZ VC VE VN VU WS YE ZA ZM ZW';

/* `US` -> 🇺🇸. Regional indicator symbols start at U+1F1E6 for A, so each letter is offset from
   'A' and added to that base. Wrapped because a runtime with no emoji font still gets a valid
   string — the flag simply renders as two letters, which is the same graceful failure the
   original's stored character has. */
const flagFor = (code) =>
  String.fromCodePoint(...[...code].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));

/* Built once. `Intl.DisplayNames` exists everywhere this project targets; the `catch` keeps a
   browser without it rendering the bare code rather than an empty list. */
const names = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    return null;
  }
})();

export const COUNTRIES = CODES.split(' ').map((countryCode) => ({
  countryCode,
  en: names?.of(countryCode) ?? countryCode,
  emoji: flagFor(countryCode),
}));

/* `{areaCode:"", en:"Other", countryCode:"OTHER", value:"", emoji:""}` — appended to the options
   by the original's own picker, verbatim apart from the two dialling fields this file drops. */
export const OTHER_COUNTRY = { countryCode: 'OTHER', en: 'Other', emoji: '' };

export const countryByCode = (code) =>
  COUNTRIES.find((c) => c.countryCode === code) ?? null;

export default COUNTRIES;
