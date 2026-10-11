/* The nine social marks on the dashboard’s invite card.
 *
 * THEY ARE BASE64 PNGs INLINED IN A CHUNK, not sprites — worth knowing before hunting for them
 * as a sprite sheet or an icon set. `ShareIcon-CMaOnZIq.js` is a 30 KB module holding NINETEEN data
 * URIs in one array, and its whole component is `<img src={m[types - 1]}>`.
 * `src/assets/referral/socials` holds the nine the page actually shows, decoded back to files
 * under their network names.
 *
 * WHICH NINE IS DECIDED BY A FILTER, not by the list. `ox` in index-BsFv7ByC.js builds fourteen
 * entries and the call site drops any whose `name` is "email" or whose `url` is undefined — which
 * removes email, `vertical`, `btc`, `pinterest` and `reddit`, leaving exactly the nine in the
 * capture, in this order. The `icon` number on each entry is the 1-based index into that array
 * and is recorded so the mapping stays checkable.
 *
 * A plain module rather than part of icons.jsx, because `react-refresh/only-export-components`
 * forbids a file that exports a component from exporting anything else.
 */

const socialArt = import.meta.glob('../../assets/referral/socials/*.png', {
  eager: true,
  import: 'default',
});

/* Order and `icon` index are `ox`'s own; `url` is its base, which the original appends an
   encoded invite URL to. */
export const SOCIALS = [
  { name: 'Facebook', file: 'facebook', icon: 3, url: 'https://www.facebook.com/sharer/sharer.php?u=' },
  { name: 'X', file: 'x', icon: 8, url: 'https://x.com/share?url=' },
  { name: 'Telegram', file: 'telegram', icon: 7, url: 'https://t.me/share?url=' },
  { name: 'VK', file: 'vk', icon: 11, url: 'http://vk.com/share.php?url=' },
  { name: 'Line', file: 'line', icon: 12, url: 'https://lineit.line.me/share/ui?url=' },
  { name: 'Skype', file: 'skype', icon: 13, url: 'https://web.skype.com/share?url=' },
  { name: 'OK', file: 'ok', icon: 14, url: 'https://connect.ok.ru/offer?url=' },
  { name: 'Linkedin', file: 'linkedin', icon: 16, url: 'https://www.linkedin.com/sharing/share-offsite/?url=' },
  { name: 'Whatsapp', file: 'whatsapp', icon: 17, url: 'https://wa.me/?text=' },
];

export const socialIcon = (file) => socialArt[`../../assets/referral/socials/${file}.png`];
