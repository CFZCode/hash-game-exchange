/* `M1` in the account remote's `utils-DobeMSOM.js`, transcribed rather than reinvented — the
 * password strength the new-password field draws as three bars and a word.
 *
 *   function M1(e) {
 *     const t = e.length; let d = 0, n;
 *     return /[\d+]/.test(e) && d++, /[a-z]+/.test(e) && d++, /[A-Z]+/.test(e) && d++,
 *       /[!@#$%^&*(),.'{}]+/.test(e) && d++,
 *       d > 1 && t > 15 ? n = 3 : d === 1 && t > 10 ? n = 2 : d > 2 && t > 7 ? n = 3
 *         : d > 1 && t > 5 ? n = 2 : t === 0 ? n = 0 : n = 1, n
 *   }
 *
 * THE BRANCH ORDER IS LOAD-BEARING AND THE LADDER IS NOT MONOTONIC, which is why it is copied
 * arm for arm instead of being "tidied" into a score. `d > 1 && t > 15` is tested BEFORE
 * `d > 2 && t > 7`, so a 16-character password using two classes is Strong while a 16-character
 * one using three is also Strong — but reordering those two arms changes the answer for inputs in
 * between, and there is no reading of the code that makes one of them redundant.
 *
 * Two quirks that read as bugs and are the original's. `/[\d+]/` is a character class containing a
 * digit or a literal `+`, so a password of `+++++` scores a "digit" class; the `+` inside the
 * brackets is almost certainly a typo for a quantifier outside them, and it is kept because the
 * live meter behaves that way. And the symbol class is a specific set — `!@#$%^&*(),.'{}` — so a
 * password whose only symbol is `-` or `_` scores nothing for it.
 *
 * Levels are 0 (empty), 1 Weak, 2 Medium, 3 Strong. The empty case is unreachable from the meter,
 * which its caller renders only when the field has a value, but it is in the original's ladder and
 * so it is here.
 *
 * NOT A SEPARATE FILE FOR NEATNESS — the Windows case-insensitivity trap this project has hit
 * twice (`Status`/`status`, `Medals`/`medals`) is exactly why this is `passwordLevel.js` beside
 * `PasswordInput.jsx` rather than a second `PasswordInput.js`.
 */
export default function passwordLevel(value) {
  const length = value.length;
  let classes = 0;

  if (/[\d+]/.test(value)) classes += 1;
  if (/[a-z]+/.test(value)) classes += 1;
  if (/[A-Z]+/.test(value)) classes += 1;
  if (/[!@#$%^&*(),.'{}]+/.test(value)) classes += 1;

  if (classes > 1 && length > 15) return 3;
  if (classes === 1 && length > 10) return 2;
  if (classes > 2 && length > 7) return 3;
  if (classes > 1 && length > 5) return 2;
  if (length === 0) return 0;
  return 1;
}
