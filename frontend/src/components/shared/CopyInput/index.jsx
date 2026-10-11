import React from 'react';

/* `C` in `CopyInput-B_53zFi6.js` — a boxed read-only string with a Copy button on the right.
 *
 * SHARED AT ITS SECOND CALL SITE, which is the rule everywhere here: the referral link field on
 * the mobile account page (`pages/UserEnter/Panels.jsx`) and the 2FA secret in the enrolment
 * dialog (`modals/UserAction`). It is ONE component on the original too — both arms import the
 * same `CopyInput-B_53zFi6.js` — so this is a move rather than a merge of two lookalikes.
 *
 * THE STRING IS PRINTED IN THREE PIECES AND ONLY THE MIDDLE ONE IS ALLOWED TO SHRINK, which is
 * the whole point of the component and is easy to mistake for a truncated single span:
 *
 *   function x(e) {
 *     if (e.length < 8) return [e];
 *     const t = e.slice(0, 4), n = e.slice(-4), l = e.slice(4, e.length - 4);
 *     return [t, l, n];
 *   }
 *
 * The head and the tail take `flex-none` and the brand green; the middle takes
 * `max-w-[55%] overflow-hidden text-ellipsis` in `text-secondary`. So a long URL always shows its
 * first four and last four characters whatever the viewport does, and the ellipsis lands in the
 * middle rather than eating the end — which is what makes a truncated link still identifiable.
 *
 * `n().length === 0` is a dead branch on the original: `x` returns one entry or three, never
 * zero. Kept for the reason `f-ull` and `texxt-sm` are kept elsewhere.
 *
 * `background: var(--Button-DarkenBg)` is written INLINE on the button by the chunk. The dark
 * arm of that variable is #373e3f, the same square `.dialog-close` paints; it has no token in
 * this project's `@theme` and is spelled out here as the original spells it.
 *
 * THE COPY CONFIRMATION IS THE DEPARTURE, and it is the same one the Refer dialog records:
 * `l` ends in `w(d("Copied."))`, a global toast, where this puts the confirmation on the button —
 * the only other thing in the box that can carry it.
 *
 * That note used to end "this build has no toast system". IT HAS ONE NOW — `shared/Toast`, which
 * arrived with the password-change dialog — so the reason is no longer absence but placement: the
 * button is where a visitor is already looking when they click it, and a toast for a copy is
 * louder than the original's own is at this size. Worth revisiting together with the Refer
 * dialog's identical departure rather than one at a time.
 */

/* The chunk's own splitter, verbatim. */
function split(value) {
  if (value.length < 8) return [value];
  return [value.slice(0, 4), value.slice(4, value.length - 4), value.slice(-4)];
}

export default function CopyInput({ value = '', className = '' }) {
  const [copied, setCopied] = React.useState(false);

  const parts = split(value);

  /* Cleared on a timer rather than on blur, because the button keeps focus after a click —
     the same arrangement `components/modals/Refer` uses. */
  React.useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = () => {
    if (!value) return;
    /* `navigator.clipboard` rejects on an insecure origin and when the document is not focused.
       Swallowed, so a failure leaves the label alone rather than claiming a copy that did not
       happen. */
    navigator.clipboard
      ?.writeText(value)
      .then(() => setCopied(true))
      .catch(() => {});
  };

  return (
    <div
      className={`flex h-12 w-full items-center overflow-hidden rounded-lg border border-solid border-input bg-input_bright py-1.5 pl-3 pr-1.5 sm:h-10 sm:py-1 sm:pr-1 ${className}`}
    >
      {parts.length === 0 && value}

      {parts.length !== 1 ? (
        <>
          <span className="flex-none whitespace-nowrap text-brand">{parts[0]}</span>
          <span className="max-w-[55%] overflow-hidden text-ellipsis whitespace-nowrap text-secondary">
            {parts[1]}
          </span>
          <span className="flex-none whitespace-nowrap text-brand">{parts[2]}</span>
        </>
      ) : (
        <span className="text-secondary">{value}</span>
      )}

      <button
        type="button"
        onClick={copy}
        className="btn-like ml-auto h-full flex-none rounded-lg px-2 pb-0.5 pt-0"
        style={{ background: '#373e3f' }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
