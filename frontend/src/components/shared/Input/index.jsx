import React from 'react';

/* `.input` — the host bundle's own text field, and the ONE the original shares.
 *
 * `index-DxOqNczA.css` declares the box (`.input`, `.input[data-focus]`, `.input > input`) and the
 * component around it is the host's `Input`, which the account remote pulls through its manifest
 * (`I as S` out of `manifest-zssWG_dx.js`). So the auth dialog's field and the account remote's
 * `PasswordInput` are not two components on the original — they are two wrappers around this one,
 * which is why their class lists agree to the character:
 *
 *   auth      input !h-[52px] bg-input_darken [&>input::placeholder]:text-tertiary
 *                                             [&>input]:text-base [&>input]:font-semibold
 *   remote          !h-[52px] bg-input_darken !pr-3 shadow-[…] dark:shadow-none  …the same three
 *
 * Extracted here at its second call site, which is this project's rule and in this case also the
 * original's structure rather than a convenience. `Auth`'s `Field` is now this with its own class
 * list; nothing about its rendered DOM changed, which is the condition for touching that dialog
 * at all.
 *
 * `data-focus` IS THE FOCUS RING and it is an attribute rather than a `:focus-within`, because
 * that is what the stylesheet keys on (`.input[data-focus] { border-color: var(--color-brand);
 * caret-color: var(--color-brand) }`). The `onFocus`/`onBlur` pass-throughs exist for the one
 * caller that needs to know as well: the password field colours its own border by strength while
 * focused, so it has to observe the same two events this box already tracks.
 *
 * `trailing` is a SLOT rather than an icon prop — the eye toggle, the Max button and the paste
 * square are all different shapes, and `.input`'s own `gap: 0.5rem` is what spaces whatever goes
 * in it. It is `children` on the original for the same reason.
 */
export default function Input({
  type = 'text',
  value,
  onChange,
  trailing,
  className = '',
  placeholder = '',
  autoFocus = false,
  autoComplete,
  required = true,
  disabled = false,
  onFocus,
  onBlur,
}) {
  const [focused, setFocused] = React.useState(false);

  return (
    /* `data-disabled` IS A RULE THE STYLESHEET ALREADY CARRIES and nothing was setting it:
       `.input[data-disabled] { opacity: .6 }` came across with the rest of `.input` from
       `index-DxOqNczA.css` and sat unreachable until the whitelist Edit dialog needed a field
       that shows a value it cannot change. An attribute rather than `:has(:disabled)` because
       that is what the original keys on. */
    <div
      className={`input ${className}`}
      {...(focused && !disabled ? { 'data-focus': '' } : {})}
      {...(disabled ? { 'data-disabled': '' } : {})}
    >
      <input
        disabled={disabled}
        /* Dropped together rather than left to the browser. A disabled control is barred from
           constraint validation, so `required` on one is already moot — writing it out says so,
           and keeps the pair from drifting if this ever becomes `readOnly`, where `required`
           is NOT moot and would block the submit with nothing to focus. */
        required={required && !disabled}
        /* The live dialog opens with its first field already focused — every capture shows the
           account box carrying the green [data-focus] ring and a caret. Programmatic focus still
           fires the focus event, so the ring lights up on its own. */
        autoFocus={autoFocus}
        /* THE BROWSER'S OWN SUGGESTION LIST IS WHAT THIS TURNS OFF, not one of ours. With no
           attribute the browser applies its own heuristics to a field it reads as an email, and
           the panel it draws is an overlay that covers everything under it. See the auth call
           site, which is where the cost of `off` is written down. */
        autoComplete={autoComplete}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
      />
      {trailing}
    </div>
  );
}
