import { API_BASE, request } from './client';
import { PLATFORM } from './endpoints';
import defaultAvatar from '../assets/avatars/105522617.png';

/* ── Avatars: the site admin's catalogue, unlocked by VIP level ──────────────────────────────
 *
 *   GET  /admin/avatars/public    `[{id, url, minLevel, sort}]` — enabled avatars only. Also in
 *                                  the realtime socket's state, so `client.js` answers it from
 *                                  there when it can (SOCKET_READS).
 *   POST /user/profile/avatar     `{avatarId}` → the updated profile. 403 `AVATAR_LOCKED`
 *                                  (`details: {minLevel, level}`) below the avatar's level.
 *
 * `url` and the profile's `avatar` are PATHS on this API, so both go through `avatarSrc`. With
 * fixtures on there is no catalogue at all (`[]`): the picker then draws its empty state rather
 * than invented avatars, and every own-avatar slot keeps the shipped `105522617.png`.
 */

/** The image to draw for an avatar value: an API path, an absolute URL, or the shipped default. */
export function avatarSrc(value) {
  const v = typeof value === 'string' ? value.trim() : '';
  if (!v) return defaultAvatar;
  if (/^(https?:)?\/\//i.test(v) || v.startsWith('data:')) return v;
  return v.startsWith('/') ? `${API_BASE}${v}` : defaultAvatar;
}

/** The catalogue, sorted as the admin ordered it. Never throws: a failure reads as empty. */
export async function loadAvatars() {
  try {
    const rows = await request(PLATFORM.site.avatars, { live: true, fixture: [] });
    if (!Array.isArray(rows)) return [];
    return rows
      .filter((r) => r && r.id != null && typeof r.url === 'string')
      .map((r) => ({ id: r.id, url: r.url, minLevel: Number(r.minLevel) || 0, sort: Number(r.sort) || 0 }))
      .sort((a, b) => a.sort - b.sort || a.minLevel - b.minLevel || Number(a.id) - Number(b.id));
  } catch {
    return [];
  }
}

/** Wear avatar `avatarId`. Resolves the updated profile; rejects with the ApiError. */
export function chooseAvatar(avatarId) {
  return request(PLATFORM.user.profile.avatar, {
    live: true,
    method: 'POST',
    json: { avatarId },
  });
}
