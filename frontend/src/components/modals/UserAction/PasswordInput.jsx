import React from 'react';
import Input from '../../shared/Input';
import { IconInform } from '../../shared/icons';
import { IconEye, IconEyeSquint } from './icons';
import passwordLevel from './passwordLevel';

/* `PasswordInput-B8f8WVV4.js` in the account remote — the password field the change-password flow
 * uses three times. Not in the mirror; fetched from `hash.game/modules/account/assets/` under the
 * hash the remote's own manifest lists, which is rung 2 of the recovery ladder reached through
 * rung 3. Every class list below is that chunk's.
 *
 * THE STRENGTH BORDER IS ONLY DRAWN WHILE THE FIELD HAS FOCUS, and only when the meter is shown:
 *
 *   const u = () => s() && !r.hiddenPasswordLevel
 *     ? (t() <= 1 ? "!border-error" : t() === 2 ? "!border-warning" : "!border-brand") : ""
 *
 * so an unfocused field keeps `.input`'s ordinary border and the confirm field never colours at
 * all. The `!` is the chunk's own and is needed for the reason this project keeps writing down:
 * `.input`'s `border` is a layered rule but so is `.input[data-focus]`'s brand override, and the
 * focused state is exactly when this has to win.
 *
 * `hiddenPasswordLevel` hides the meter, not the strength — the border above tests it too. Step
 * one (the OLD password) and the CONFIRM field both pass it; only the new-password field shows a
 * meter, which is the whole point of it being a prop rather than a variant.
 *
 * The eye's two glyphs and which shows when are in `icons.jsx`.
 */
export default function PasswordInput({
  password,
  changePassword,
  hiddenPasswordLevel = false,
  placeholder = 'Password',
  className = '',
  onFocus,
}) {
  const [focused, setFocused] = React.useState(false);
  const [revealed, setRevealed] = React.useState(false);

  const level = passwordLevel(password);
  const border =
    focused && !hiddenPasswordLevel
      ? level <= 1
        ? '!border-error'
        : level === 2
          ? '!border-warning'
          : '!border-brand'
      : '';

  return (
    <>
      <Input
        /* `!h-[52px] bg-input_darken !pr-3 shadow-[…] dark:shadow-none` plus the three
           `[&>input]` rules — the same three the auth dialog's field writes, which is what says
           these are two wrappers around one primitive. The shadow is a light-theme lift and is
           cancelled in the dark one by the chunk itself. */
        className={`!h-[52px] bg-input_darken !pr-3 shadow-[0px_2px_4px_rgba(10,81,93,0.10)] dark:shadow-none [&>input::placeholder]:text-tertiary [&>input]:text-base [&>input]:font-semibold ${className} ${border}`}
        type={revealed ? 'text' : 'password'}
        value={password}
        onChange={changePassword}
        placeholder={placeholder}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => setFocused(false)}
        trailing={
          <div
            className="center h-8 w-8 cursor-pointer"
            onClick={() => setRevealed((value) => !value)}
          >
            {revealed ? (
              <IconEyeSquint className="size-6 fill-tertiary" />
            ) : (
              <IconEye className="size-6 fill-tertiary" />
            )}
          </div>
        }
      />
      {password && !hiddenPasswordLevel ? <Meter level={level} /> : null}
    </>
  );
}

/* `z` in the same chunk. Three bars and a word, and the FIRST BAR IS ALWAYS THE LEVEL'S COLOUR
 * while the second and third only take it once the level reaches them — so Weak is one red bar
 * over two layer3 ones, and Strong is three green. The label sits at `ml-auto` and the inform
 * mark after it, which is the chunk's order (`g(s, icon, null)` appends).
 */
function Meter({ level }) {
  const fill = level <= 1 ? 'bg-error' : level === 2 ? 'bg-warning' : 'bg-brand';
  const word = level === 3 ? 'Strong' : level === 2 ? 'Medium' : 'Weak';
  const tone = level === 3 ? 'text-brand' : level === 2 ? 'text-warning' : 'text-error';
  const mark = level === 3 ? 'fill-brand' : level === 2 ? 'fill-warning' : 'fill-error';

  return (
    <div className="mt-1.5 flex h-4 w-full items-center justify-between">
      <div className={`mr-1 h-1 w-6 rounded-sm ${fill}`} />
      <div className={`mr-1 h-1 w-6 rounded-sm ${level > 1 ? fill : 'bg-layer3'}`} />
      <div className={`mr-1 h-1 w-6 rounded-sm ${level > 2 ? fill : 'bg-layer3'}`} />
      <div className={`ml-auto flex-none text-xs font-semibold ${tone}`}>{word}</div>
      <IconInform className={`${mark} size-4`} />
    </div>
  );
}
