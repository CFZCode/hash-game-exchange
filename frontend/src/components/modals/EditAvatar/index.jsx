import React from 'react';
import RouteDialog from '../../shared/RouteDialog';
import { toast, toastError } from '../../shared/Toast/toast';
import { useSession } from '../../../context/session';
import { avatarSrc, chooseAvatar, loadAvatars } from '../../../services/avatars';
import { IconFrameLock } from '../EditProfile/frames.jsx';

/* `/settings/edit-avatar` — `DialogEditAvatar`, the "Edit Your Avatar" button's destination in
 * Edit Profile. Markup read off the live page (hash.game/en-IN/settings/edit-avatar):
 *
 *   dialog title "Edit Your Avatar" with a back arrow
 *   an h-80 cropper over the current avatar, then a zoom / rotate toolbar  ← CUSTOM UPLOAD
 *   "Default Avatar", a `grid-cols-6 gap-1` of `size-16 rounded-full p-1 fix-bglayer5` buttons
 *   (its FIRST cell is the upload button), and a full-width `button-brand` "Submit"
 *
 * THE UPLOAD HALF IS NOT HERE: this platform takes no player-uploaded image — the catalogue is the
 * site admin's (services/avatars.js) — so the cropper, its toolbar and the upload cell are left
 * out rather than drawn inert. In the cropper's place is the avatar being previewed, at the Edit
 * Profile circle's 160px.
 *
 * WHAT IS THIS PLATFORM'S, not the original's: each avatar carries a `minLevel`, and one above the
 * player's VIP level is drawn dimmed with the frame grid's padlock and a "VIP n" label, and cannot
 * be picked. The original's grid has no locked state. The selected ring (`ring-2 ring-brand`) is
 * also this build's — the live page marks selection only in its cropper preview.
 */
export default function EditAvatarDialog({ onClose, onBack, enter }) {
  const { session, setAccountField } = useSession();
  const level = Number(session?.vipLevel) || 0;

  const [avatars, setAvatars] = React.useState(null); // null = still reading
  const [selected, setSelected] = React.useState(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    let live = true;
    loadAvatars().then((rows) => {
      if (live) setAvatars(rows);
    });
    return () => {
      live = false;
    };
  }, []);

  const current = session?.avatar ?? '';
  const chosen = avatars?.find((a) => a.id === selected) ?? null;
  const preview = chosen ? chosen.url : current;

  const submit = async () => {
    if (!chosen || pending) return;
    setPending(true);
    try {
      const profile = await chooseAvatar(chosen.id);
      setAccountField('avatar', profile?.avatar ?? chosen.url);
      toast('Done!');
      onClose?.();
    } catch (failure) {
      if (failure?.code === 'AVATAR_LOCKED') {
        const need = failure?.details?.minLevel ?? chosen.minLevel;
        toast.error(`This avatar unlocks at VIP ${need}.`);
      } else {
        toastError(failure, 'That avatar could not be saved.');
      }
      setPending(false);
    }
  };

  return (
    <RouteDialog title="Edit Your Avatar" onClose={onClose} onBack={onBack} enter={enter}>
      <div className="w-full py-6">
        <div className="fix-bglayer5 relative mx-auto size-40 overflow-hidden rounded-full">
          <img alt="avatar" className="h-full w-full" src={avatarSrc(preview)} />
        </div>

        <p className="mt-4 font-semibold">Default Avatar</p>

        {avatars === null ? (
          <div className="mt-4 grid grid-cols-6 items-center justify-items-center gap-1">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="size-16 animate-pulse rounded-full bg-layer5" />
            ))}
          </div>
        ) : avatars.length === 0 ? (
          <p className="mt-4 text-sm text-secondary">No avatars are available yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-6 items-center justify-items-center gap-1">
            {avatars.map((a) => {
              const locked = a.minLevel > level;
              const isSelected = a.id === selected;
              return (
                <div key={a.id} className="relative">
                  <button
                    type="button"
                    disabled={locked}
                    title={locked ? `Unlocks at VIP ${a.minLevel}` : undefined}
                    onClick={() => setSelected(a.id)}
                    className={`button size-16 overflow-hidden rounded-full p-1 fix-bglayer5 disabled:cursor-not-allowed ${
                      isSelected ? 'ring-2 ring-brand' : ''
                    }`}
                  >
                    <div className={`h-full w-full overflow-hidden rounded-full ${locked ? 'opacity-40' : ''}`}>
                      <img className="h-full w-full" alt="avatar" src={avatarSrc(a.url)} />
                    </div>
                  </button>
                  {locked ? (
                    <>
                      <IconFrameLock className="icon pointer-events-none absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 fill-primary" />
                      <span className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-layer6 px-1 text-[10px] font-extrabold text-secondary">
                        VIP {a.minLevel}
                      </span>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          className="button button-brand mt-4 w-full"
          disabled={!chosen || pending}
          onClick={submit}
        >
          Submit
        </button>
      </div>
    </RouteDialog>
  );
}
