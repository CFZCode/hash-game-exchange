import PopCenter from '../shared/PopCenter';

/* `L1` in index-CUBJDfzw.js — what the chat header's ⓘ opens. Six numbered rules over a closing
 * line, in the site's generic popup card.
 *
 * EVERY STRING IS VERBATIM `A("…")` OUT OF THE CHUNK, so nothing here is read off the screenshot,
 * including the punctuation that reads like a slip: rule 4's "advertising/ trading/ selling/
 * buying" really does put its spaces after the slashes rather than around them.
 *
 * `W` is `cl`, which is `components/shared/PopCenter` — the same shell the deposit dialog's two
 * explainers and Manage Assets ride. The call site passes only a title and one class, so it takes
 * the card's own default size and its layer2 fill; `font-semibold text-secondary` is what makes
 * the body dimmer and heavier than the title above it.
 *
 * ON THE ORIGINAL IT IS PUSHED ONTO THE POPUP STACK — `S.push(() => L1())`, where `S` is `Pt`,
 * the global list with one shared scrim. This build has no stack (see the note in PopCenter), so
 * the flag lives in the chat panel and the card renders from it. Nothing here stacks on anything,
 * so the two are indistinguishable today.
 *
 * `rule-item` and `more-rule` are DEAD CLASSES — in neither the mirror's six stylesheets nor the
 * current deploy's `index-WymgNldA.css`, both checked — so the whole layout is the popup's own
 * padding and the paragraphs' line boxes, with no margin between rules. Kept for the reason
 * `f-ull` and `page-main` are.
 */
const RULES = [
  "Don't spam, harass or be offensive to other users. Also, avoid using CAPS! No one likes to be screamed at!",
  "Don't beg or ask for loans, rains, tips and doubling coins.",
  'No suspicious behavior that can be seen as potential scams.',
  "Don't engage in any forms of advertising/ trading/ selling/ buying or offering services.",
  "Don't use URL shortener. Always submit the original link.",
  'Use the designated language chatrooms accordingly.',
];

export default function ChatRules({ open, onClose }) {
  return (
    <PopCenter open={open} onClose={onClose} title="Chat Rules" className="font-semibold text-secondary">
      {RULES.map((rule, index) => (
        <p className="rule-item" key={rule}>
          {/* Two spans, and the number is written INTO the first one's ". " text node rather than
              beside it — `n(i, a + 1, c)` — so the separator belongs to the numeral and not to
              the rule. */}
          <span>{index + 1}. </span>
          <span>{rule}</span>
        </p>
      ))}
      <p className="more-rule">List of our full rules can be found on our forum.</p>
    </PopCenter>
  );
}
