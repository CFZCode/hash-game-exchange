/* The Responsible Gambling rail, from the `static` remote's `index-CdxGH7-n.js`
 * (`ResponsibleLayout`), recovered off `hash.game/modules/static/assets/`.
 *
 * Five rows, and the map in the chunk is written as
 *
 *   faq:                 { label: "FAQ's",             link: "/responsible/faq",                icon, element }
 *   "self-assessment":   { label: "Self-Assessment",   link: "/responsible/self-assessment",    icon, element }
 *   "gambling-limits":   { label: "Gambling Limits",   link: "/gambling-limits",                icon, element, hostHidden: … }
 *   "self-exclusion":    { label: "Self-exclusion",    link: "/responsible/self-exclusion",     icon, element, noContainer: false }
 *   "budget-calculator": { label: "Budget Calculator", link: "/responsible/budget-calculator",  icon, element }
 *
 * `href` is stored per row rather than derived from the id because the chunk keeps it that way.
 * The label is "FAQ's" with an apostrophe, not "FAQs" as the Help Center's own row
 * spells it; the two pages disagree and both are reproduced as written.
 *
 * `hostHidden` on Gambling Limits drops the row for three white-label brands (`bcke`, `bcmx`).
 * This build is bc.game, so the row always shows and the flag is not modelled.
 *
 * ONLY `faq` HAS A DOCUMENT. Its element is the `responsible_gambling` HTML file, which is
 * already extracted under pages/Help/topics/ and is shared from there. The other four elements
 * are components built inline in the chunk — Self-Assessment's markup is a `help-center-box`
 * template, Self-exclusion is a form, Budget Calculator an interactive widget — so they carry
 * `element: null` and render the empty state until someone transcribes them.
 */

export const TOPICS = [
  { id: 'faq', label: "FAQ's", href: '/responsible/faq', element: 'responsible_gambling' },
  {
    id: 'self-assessment',
    label: 'Self-Assessment',
    href: '/responsible/self-assessment',
    element: null,
  },
  /* `/responsible/gambling-limits`, NOT the bare `/gambling-limits` the chunk's `link` property
     says. The rendered DOM is the authority here and it emits the nested path; the bare one has
     no route in this build, so it fell through to the catch-all and showed the home page. */
  {
    id: 'gambling-limits',
    label: 'Gambling Limits',
    href: '/responsible/gambling-limits',
    element: null,
  },
  {
    id: 'self-exclusion',
    label: 'Self-exclusion',
    href: '/responsible/self-exclusion',
    element: null,
  },
  {
    id: 'budget-calculator',
    label: 'Budget Calculator',
    href: '/responsible/budget-calculator',
    element: null,
  },
];

/* Bare `/responsible` renders the same layout, and the chunk falls through to the first row. */
export const DEFAULT_TOPIC = 'faq';

/* Self-Assessment, transcribed from `Lt`/`kt` in `index-CdxGH7-n.js` — verbatim `l("…")` and
 * `<T i18nKey="static.responsible.assessment.desc1">` defaults.
 *
 * It is a COMPONENT there, not an HTML document like the FAQ's tab, which is why it needed
 * transcribing rather than extracting: the chunk builds
 *
 *   <div class="help-center-box p-4">
 *     <h2 class="text-sm font-semibold text-primary">Self-Assessment</h2>
 *     <div class="help-raw-html"><p>…</p></div>
 *     <h2 …>Do you have a gambling problem? …</h2>
 *     <div class="help-raw-html"><ol><li>×10</li></ol><p>…</p></div>
 *
 * The leading `*` on the reminder is the original's own, not a bullet. */
export const SELF_ASSESSMENT = {
  intro:
    'Gambling can be an enjoyable pastime for many people, providing entertainment and the thrill of taking a risk. However, for some individuals, gambling can become more than just a harmless activity. It can develop into a serious problem that affects various aspects of their lives. Recognizing the signs of problem gambling is the first step towards addressing this issue. This self-assessment tool is designed to help you reflect on your gambling behaviour and determine whether it may be causing problems in your life. It is essential to approach this assessment with honesty and openness to gain a clear understanding of your gambling habits.',
  questionsTitle: 'Do you have a gambling problem? Ask yourself the following questions:',
  questions: [
    'Have there ever been periods lasting two weeks or longer when you spent a lot of time thinking about your gambling experiences, planning out future gambling ventures or bets, or thinking about ways of getting money to gamble with?',
    'Have there ever been periods when you needed to gamble with increasing amounts of money or with larger bets than before in order to get the same feeling of excitement?',
    'Have you ever felt restless or irritable when trying to stop, cut down, or control your gambling?',
    'Have you tried and not succeeded in stopping, cutting down, or controlling your gambling three or more times in your life?',
    'Have you ever gambled to escape from personal problems, or to relieve uncomfortable feelings such as guilt, anxiety, helplessness, or depression?',
    'Has there ever been a period when, if you lost money gambling one day, you would often return another day to get even?',
    'Have you lied to family members, friends, or others about how much you gamble, and/or about how much money you lost on gambling, on at least three occasions?',
    "Have you ever written a bad cheque or taken money that didn't belong to you from family members, friends, or anyone else in order to pay for your gambling?",
    'Has your gambling ever caused serious or repeated problems in your relationships with any of your family members or friends? Or, has your gambling ever caused you problems at work or your studies?',
    'Have you ever needed to ask family members, friends, a lending institution, or anyone else to loan you money or otherwise bail you out of a desperate money situation that was largely caused by your gambling?',
  ],
  reminder:
    '*REMINDER: this self-assessment will help you figure out if there is, or you are developing a problem. If you answered yes to one or more of the above questions, you should seek help.',
};
