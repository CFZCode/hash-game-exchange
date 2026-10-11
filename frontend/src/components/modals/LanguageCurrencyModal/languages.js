/* The site's own language table, split out of index.jsx for the reason `useSession` is split
 * out of `SessionContext.jsx`: `react-refresh/only-export-components` forbids a file that exports
 * a component from exporting anything else, and the Preferences row needs `languageName` to print
 * the chosen one. Same arrangement as `socials.js` beside `icons.jsx`.
 */
/* GENERATED from `wh` in index-BsFv7ByC.js — the site own code -> [name, locale] map, all 35
 * entries in its own order. It used to be the display names alone, which was enough while the
 * modal only listed them; storing a CHOICE needs the code, because that is what the account
 * store keeps (`setting.lang`, `en` by default) and what the row above the modal looks a name
 * back up from. `locale` is carried because the map carries it; nothing reads it yet.
 *
 * This build still ships ONE locale, so picking a language changes what the row prints and
 * nothing else translates. That is a real limit and is better than a control that does not move
 * at all, which is what this was.
 */
export const LANGUAGES = [
  { code: 'en', name: 'English', locale: 'en-US' },
  { code: 'en-IN', name: 'Indian English', locale: 'en-IN' },
  { code: 'vi', name: 'Tiếng việt', locale: 'vi-VN' },
  { code: 'id', name: 'Indonesian', locale: 'id-ID' },
  { code: 'ja', name: '日本語', locale: 'ja-JP' },
  { code: 'ko', name: '한국어', locale: 'ko-KR' },
  { code: 'fr', name: 'Français', locale: 'fr-FR' },
  { code: 'es', name: 'Español', locale: 'es-ES' },
  { code: 'es-MX', name: 'Español (México)', locale: 'es-MX' },
  { code: 'fil', name: 'Filipino', locale: 'fil-PH' },
  { code: 'ar', name: 'عربى', locale: 'ar-SA' },
  { code: 'hi', name: 'हिन्दी', locale: 'hi-IN' },
  { code: 'tr', name: 'Türkçe', locale: 'tr-TR' },
  { code: 'fa', name: 'فارسی', locale: 'fa-IR' },
  { code: 'pt', name: 'Português', locale: 'pt-BR' },
  { code: 'ru', name: 'Руccкий', locale: 'ru-RU' },
  { code: 'de', name: 'Deutsch', locale: 'de-DE' },
  { code: 'th', name: 'ภาษาไทย', locale: 'th-TH' },
  { code: 'fi', name: 'Suomi', locale: 'fi-FI' },
  { code: 'pl', name: 'Polski', locale: 'pl-PL' },
  { code: 'it', name: 'Italiano', locale: 'it-IT' },
  { code: 'my', name: 'မြန်မာ', locale: 'my-MM' },
  { code: 'ur', name: 'اردو', locale: 'ur-PK' },
  { code: 'uk', name: 'Українська', locale: 'uk-UA' },
  { code: 'ms', name: 'Melayu', locale: 'ms-MY' },
  { code: 'bn', name: 'বাংলা', locale: 'bn-BD' },
  { code: 'mr', name: 'Marathi', locale: 'mr-IN' },
  { code: 'ta', name: 'Tamil', locale: 'ta-IN' },
  { code: 'te', name: 'Telugu', locale: 'te-IN' },
  { code: 'he', name: 'עברית', locale: 'he-IL' },
  { code: 'zh-TW', name: '繁體中文', locale: 'zh-TW' },
  { code: 'zh-CN', name: '简体中文', locale: 'zh-CN' },
  { code: 'hy', name: 'Հայերեն', locale: 'hy-AM' },
  { code: 'sw', name: 'Kiswahili', locale: 'sw-KE' },
  { code: 'uz', name: 'Oʻzbekcha', locale: 'uz-UZ' },
];

export const languageName = (code) =>
  LANGUAGES.find((l) => l.code === code)?.name ?? LANGUAGES[0].name;


