/**
 * The pure half of services/siteBranding.js: no React, no window at module scope, so app/layout
 * (a server component) can use it for the server-rendered metadata and the <head> boot script.
 */
/* Same rule as services/client.js: fixtures stay on unless the build says "false". The fixture
   build never reads or applies runtime branding — it is the pixel reference. */
export const LIVE = String(process.env.NEXT_PUBLIC_USE_FIXTURES ?? 'true') === 'false';
export const API_BASE = String(process.env.NEXT_PUBLIC_API_BASE ?? '').replace(/\/+$/, '');

export const BRANDING_STORAGE_KEY = 'hge.branding';
export const BRANDING_PATH = '/api/v1/admin/branding/public';
const ASSET_PATH_RE = /^\/api\/v1\/admin\/branding\/asset\/[0-9a-f]{64}\.(png|webp|svg)$/;
/* Angle brackets or a control character: never put in <title> or <meta>. */
const badText = (v) => /[<>]/.test(v) || [...v].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127);
const TEXT_LIMITS = { siteName: 40, title: 70, titleTemplate: 80, description: 300, ogTitle: 90, ogDescription: 300 };

/**
 * The backend's answer, checked again here: text within its limits and free of `<>`/control
 * characters, image URLs only of the asset route's exact shape (made absolute against the API
 * base when used). Anything else reads as unset. Null when the site is not branded.
 */
export function cleanBranding(data) {
  if (!data || typeof data !== 'object' || !data.branded) return null;
  const out = { branded: true };
  for (const [key, max] of Object.entries(TEXT_LIMITS)) {
    const v = typeof data[key] === 'string' ? data[key].trim() : '';
    out[key] = v && v.length <= max && !badText(v) ? v : null;
  }
  if (!out.siteName) return null;
  if (out.titleTemplate && out.titleTemplate.split('%s').length !== 2) out.titleTemplate = null;
  out.keywords = Array.isArray(data.keywords)
    ? data.keywords.filter((k) => typeof k === 'string' && k && k.length <= 40 && !badText(k)).slice(0, 20)
    : [];
  out.themeColor = typeof data.themeColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(data.themeColor) ? data.themeColor : null;
  for (const key of ['logoUrl', 'markUrl', 'ogImageUrl']) {
    const v = data[key];
    out[key] = typeof v === 'string' && ASSET_PATH_RE.test(v) ? v : null;
  }
  return out;
}

/**
 * Runs in <head> before first paint (live mode only, app/layout): the cached mark as the loader
 * image and the favicon, and the cached title — so a returning visitor never sees the
 * original's for a moment. The server-rendered metadata already carries them when the backend
 * answered; this covers the case it did not.
 */
export const BRANDING_BOOT_SCRIPT = `try{var b=JSON.parse(localStorage.getItem('${BRANDING_STORAGE_KEY}')||'null'),r=/^\\/api\\/v1\\/admin\\/branding\\/asset\\/[0-9a-f]{64}\\.(png|webp|svg)$/,a=${JSON.stringify(API_BASE)};if(b){if(typeof b.markUrl==='string'&&r.test(b.markUrl)&&!document.getElementById('brand-loader')){var u=a+b.markUrl,s=document.createElement('style');s.id='brand-loader';s.textContent='#start-up,body.dark #start-up{background-image:url("'+u+'");background-repeat:no-repeat;background-position:center}';document.head.appendChild(s)}var t=b.title||b.siteName;if(typeof t==='string'&&t&&!/[<>]/.test(t))document.title=t}}catch(e){}`;
