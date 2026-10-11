import React from 'react';
import RouteDialog from '../../shared/RouteDialog';
import Input from '../../shared/Input';
import { showToast } from '../../shared/Toast/toast';
import { useSession } from '../../../context/session';
import { updateProfile } from '../../../services/auth';
import avatarImg from '../../../assets/avatars/105522617.png';
import { AVATAR_FRAMES } from './frames';
import { FrameRing, IconFrameLock } from './frames.jsx';

/* `Ze` in `Profile-D32vXKY5.js` — `/settings/edit-profile`, `DialogEditProfile` in the registry.
 * Not in the mirror; fetched from `hash.game/modules/account/assets/`.
 *
 * The template (`Fe`) is, in order: a 160px avatar circle with an "Edit Your Avatar" button
 * pinned to its bottom, the Username label, its input, an error line, a hint, an "Avatar Frame"
 * heading beside the selected frame's description, the frame grid, and Save.
 *
 * ── THE FRAME GRID IS BUILT, AND AN EARLIER DRAFT OF THIS NOTE WAS WRONG ABOUT IT ─────────────
 *
 * It said the grid could not be drawn because `userAvatarFrameList` comes from a shut feed. The
 * feed is shut, but that was the wrong conclusion: the live page draws TEN cells and their
 * layout, order, templates, badge and padlock are all in the chunk. What the feed carries is
 * which of them an account OWNS — and the mirror's capture of `/api/account/get/` is logged-out,
 * so it reads `null` there. Reading an empty default as an empty feature is the mistake.
 *
 * So the grid is here, every ring LOCKED, which is both what a fresh account sees and the only
 * truthful state on this platform: `avatar` is a string up to 500 characters, there is no frame
 * table, no unlock route, and nothing on `PUT /user/profile` that would accept a choice.
 * Selecting a cell moves the "In use" pill and the heading's description — the whole of what the
 * original's grid does before a save this platform cannot make. `frames.jsx` carries what is
 * recovered and what is approximated, and the rings are the approximated part.
 *
 * The avatar circle draws a real avatar — the same `105522617.png` the header imports. Its "Edit
 * Your Avatar" button is kept and INERT: it navigates to `/settings/edit-avatar`, a second 55 KB
 * chunk that is the frame picker again, and there is still nothing behind it to pick from.
 *
 * ── TWO CHECKS THE ORIGINAL MAKES AND THIS CANNOT ─────────────────────────────────────────────
 *
 *   `POST /account/username/change/check`  answers whether a change is allowed at all, and the
 *                                          input is DISABLED with the tooltip "You can update
 *                                          your username once a month." when it is not. The
 *                                          platform has no such route and no such rule, so the
 *                                          field is always enabled and the tooltip is not drawn.
 *   `POST /account/username/check`         debounced at 500ms as you type, answering `status`
 *                                          0 free / 1 malformed / 2-3 taken. The platform has no
 *                                          availability route either, so a collision surfaces as
 *                                          `USERNAME_TAKEN` from the PUT, on the field, at Save.
 *
 * The SHAPE rule is checked as you type, because that one needs no server: the platform's
 * `/^[A-Za-z0-9_.-]+$/` over 3..30, in the platform's own words. bc.game's message names 3-20 and
 * letters-required — a rule this server does not enforce — so repeating it would be a lie about
 * what will be accepted.
 */

/* `services/auth.js` carries the same rule for the same reason `passwordLevel.js` sits beside its
   dialog: the message is about the server's rule, and the server is the authority. */
const USERNAME = /^[A-Za-z0-9_.-]+$/;

function shapeProblem(value) {
  const name = value.trim();
  if (name.length < 3) return 'username must be at least 3 characters';
  if (name.length > 30) return 'username must be at most 30 characters';
  if (!USERNAME.test(name)) return 'username may contain letters, digits and _ . - only';
  return '';
}

export default function EditProfileDialog({ onClose, onBack, enter }) {
  const { session, setAccountField } = useSession();

  const [name, setName] = React.useState(session?.name ?? '');
  /* TWO DIFFERENT THINGS, and the chunk keeps them apart: the "In use" pill hangs off the frame's
     own `status` (`<Show when={s().status}>`), while SELECTION is shown by the cell's `#3A4142`
     background alone. So clicking a locked ring previews it without claiming it is worn.

     `IN_USE_FRAME` is 0 — the "Not used" cell — and it is a constant rather than state because
     nothing here owns a frame and nothing can. Selection starts there too, which is what
     `r().find(f => f.status) || {}` resolves to when no frame has one. */
  const IN_USE_FRAME = 0;
  const [selectedFrame, setSelectedFrame] = React.useState(IN_USE_FRAME);
  const [error, setError] = React.useState('');
  const [pending, setPending] = React.useState(false);

  /* `Z()` — `l() !== f.name || (frame changed)`. Without the frame half it is just the name, and
     the button is disabled while the field is unchanged or malformed, exactly as `!Z() || I()`. */
  const changed = name.trim() !== (session?.name ?? '');

  const onChange = (next) => {
    setName(next);
    /* `G` runs the shape test on every keystroke and clears the message when the value is back to
       the account's own name — the original's first branch (`if (t === f.name) { w(""); … }`). */
    setError(next.trim() === (session?.name ?? '') ? '' : shapeProblem(next));
  };

  const save = async () => {
    if (!changed || error || pending) return;
    setPending(true);
    try {
      const answer = await updateProfile({ username: name.trim() });
      /* `k({name: l()})` — the store is written from the value that was sent, and the response is
         preferred where it carries one, since the server trims. */
      setAccountField('name', answer?.username ?? name.trim());
      showToast('Done!');
      onClose?.();
    } catch (failure) {
      setError(failure?.message || 'That username was not accepted.');
      setPending(false);
    }
  };

  return (
    <RouteDialog title="Edit Profile" onClose={onClose} onBack={onBack} enter={enter}>
      <div className="w-full py-6">
        {/* `fix-bglayer5` is dead on the original the way `fix-bglayer6` is — neither is in the
            mirror's stylesheet nor the current deploy's, both checked. Kept. */}
        <div className="fix-bglayer5 relative mx-auto size-40 rounded-full">
          <div className="h-full w-full overflow-hidden rounded-full">
            <img alt="avatar" className="h-full w-full" src={avatarImg} />
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
            {/* Inert: `/settings/edit-avatar` is the frame picker, which has no feed here. */}
            <button type="button" className="button button-brand h-8 min-w-32 px-2 py-0">
              <span className="whitespace-nowrap">Edit Your Avatar</span>
            </button>
          </div>
        </div>

        <p className="mt-4 input-label">Username</p>
        <Input value={name} onChange={onChange} className="bg-layer3" />
        {error ? <p className="mt-1 text-xs text-error">{error}</p> : null}
        <p className="mt-1 text-xs text-secondary">
          Do not use special symbols, otherwise your account may not be supported.
        </p>

        {/* `V` and `X` in the chunk — the heading row and the grid. The right-hand slot prints the
            SELECTED frame's `desc`, which on the live page reads "Upgrade to Beginner to receive"
            against a locked one. Every ring here is locked and the rings are approximations; the
            whole of why is at the head of `frames.jsx`. */}
        <div className="mt-4 flex w-full justify-between px-1 font-semibold text-secondary">
          <div>Avatar Frame</div>
          <div>{AVATAR_FRAMES.find((f) => f.id === selectedFrame)?.desc ?? ''}</div>
        </div>

        <div className="mt-2 grid grid-cols-4 sm:grid-cols-5">
          {AVATAR_FRAMES.map((frame) => {
            const isSelected = frame.id === selectedFrame;
            return (
              <div
                key={frame.id}
                className="relative flex h-[98px] items-center justify-center rounded-lg px-3 py-4"
                /* `ae(E, y === g() ? {"background-color":"#3A4142"} : undefined)` — written inline
                   by the chunk on the SELECTED cell, which is why it is a literal here. */
                style={isSelected ? { backgroundColor: '#3A4142' } : undefined}
              >
                <button
                  type="button"
                  onClick={() => setSelectedFrame(frame.id)}
                  className="relative aspect-square h-[92px] w-[92px] cursor-pointer"
                >
                  {frame.id === 0 ? (
                    /* `Ne` — the dashed "Not used" cell, and the one that is not a ring. */
                    <span className="relative mx-auto flex h-[70px] w-[70px] items-center overflow-hidden rounded-full border-2 border-dashed border-[#697072] p-4 text-center text-sm">
                      Not used
                    </span>
                  ) : (
                    <>
                      <FrameRing frame={frame} className="absolute inset-0 h-full w-full" />
                      {/* Locked, always — the account's owned list is a per-account field this
                          build cannot read, and the platform has no frame to own. */}
                      <IconFrameLock className="icon absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 fill-secondary" />
                    </>
                  )}

                  {/* `ke` — the "In use" pill, on the frame the account WEARS rather than the one
                      it is looking at. */}
                  {frame.id === IN_USE_FRAME ? (
                    <span className="absolute bottom-1 left-1/2 z-10 w-[52px] -translate-x-1/2 rounded-lg bg-brand px-2 text-center text-xs font-extrabold text-primary_brand">
                      In use
                    </span>
                  ) : null}
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className="button button-brand button-l mt-4 w-full"
          disabled={!changed || error !== '' || pending}
          onClick={save}
        >
          Save
        </button>
      </div>
    </RouteDialog>
  );
}
