/* The chat room catalogue — GENERATED, do not hand-edit.
 *
 * `GET /api/chat/room/list/` on hash.game, which ANSWERS UNAUTHENTICATED: a room list is a
 * catalogue rather than anything about an account, so it falls on the answering side of the split
 * the `game/support` family has now demonstrated several times over. Captured verbatim — 21 rooms
 * in the server's own order, which is what puts Global and Sports above the per-language rooms.
 *
 * TWO THINGS HERE ARE THE SERVER'S OWN AND ARE KEPT AS WRITTEN. `Руccкий` carries two LATIN c's
 * where Cyrillic ones belong, and `Tiếng việt` lower-cases a word the language capitalises.
 * Correcting either would be inventing a response; they are the payload's, character for
 * character, and this file is the evidence of what it answered.
 *
 * The label a room RENDERS is not always this string — see `roomLabel` in services/chat.js for
 * the two ids the chunk overrides by hand.
 *
 * Recipe (PowerShell's Invoke-WebRequest decodes JSON as Latin-1 and would mojibake every
 * non-ASCII name here, so this is WebClient with the encoding set — the trap CLAUDE.md records):
 *   $w = New-Object System.Net.WebClient; $w.Encoding = [System.Text.Encoding]::UTF8
 *   $w.DownloadFile('https://hash.game/api/chat/room/list/', 'roomlist.json')
 */

export const CHAT_ROOMS = [
  { roomId: 100, language: 'Global' },
  { roomId: 114, language: 'Sports' },
  { roomId: 109, language: 'English' },
  { roomId: 101, language: '繁體中文' },
  { roomId: 121, language: '简体中文' },
  { roomId: 108, language: 'Português' },
  { roomId: 102, language: 'Indonesian' },
  { roomId: 119, language: 'বাংলা' },
  { roomId: 104, language: 'Руccкий' },
  { roomId: 111, language: 'فارسی' },
  { roomId: 106, language: 'Español' },
  { roomId: 103, language: 'Tiếng việt' },
  { roomId: 105, language: 'Filipino' },
  { roomId: 113, language: 'Deutsch' },
  { roomId: 112, language: 'हिन्दी' },
  { roomId: 107, language: 'မြန်မာ' },
  { roomId: 110, language: 'Français' },
  { roomId: 115, language: '한국어' },
  { roomId: 116, language: 'ภาษาไทย' },
  { roomId: 117, language: 'اردو' },
  { roomId: 118, language: '日本語' },
];

export default CHAT_ROOMS;
