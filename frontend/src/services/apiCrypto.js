/**
 * The owner's API encryption (backend gateway/src/apiEncryption.js). client.js asks for it with
 * `ENC_ACCEPT` when the build carries the key; with the policy on, the gateway answers
 * `{ enc: base64(iv ‖ ciphertext ‖ tag) }` (AES-256-GCM) and `openSealed` turns it back into JSON.
 * Off, the answer is plain JSON and passes through untouched.
 */
const KEY_B64 = process.env.NEXT_PUBLIC_API_ENC_KEY ?? '';

export const ENC_ACCEPT = KEY_B64 ? 'application/json, application/vnd.enc+json' : null;

const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

let keyPromise = null;
const key = () =>
  (keyPromise ??= globalThis.crypto.subtle.importKey('raw', bytes(KEY_B64), 'AES-GCM', false, ['decrypt']));

/** The JSON body as sent, whether or not it came sealed. */
export async function openSealed(body) {
  if (!KEY_B64 || !body || typeof body.enc !== 'string' || Object.keys(body).length !== 1) return body;
  const raw = bytes(body.enc);
  const plain = await globalThis.crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.subarray(0, 12) }, await key(), raw.subarray(12));
  return JSON.parse(new TextDecoder().decode(plain));
}
