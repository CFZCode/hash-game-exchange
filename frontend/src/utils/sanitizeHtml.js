/* A SMALL ALLOW-NOTHING-DANGEROUS PASS over operator-authored HTML (a promotion's description and
 * terms, written in the admin panel and served by the platform). It is not a general-purpose
 * sanitizer and does not try to be one: the source is the operator, not a player, so the goal is
 * that a pasted snippet cannot run script in a visitor's session — not to police markup.
 *
 * Parsed with DOMParser, which builds an INERT document (no scripts run, no images load while it
 * is walked), then:
 *   - elements that execute or embed are removed whole (script, iframe, object, embed, …);
 *   - every `on*` attribute is dropped;
 *   - a URL attribute whose scheme is javascript:/vbscript:/data: is dropped (data: images are
 *     kept on <img src>, which cannot execute);
 *   - `srcdoc` and `style` values that smuggle `expression(`/`url(javascript:` are dropped.
 *
 * Returns '' outside a browser (the app is mounted client-only, so that never happens at runtime).
 */
const BLOCKED_TAGS = 'script,noscript,iframe,frame,frameset,object,embed,applet,base,link,meta,form,template';
const URL_ATTRS = new Set(['href', 'src', 'xlink:href', 'action', 'formaction', 'poster', 'background', 'srcset']);
const BAD_SCHEME = /^\s*(?:javascript|vbscript|data):/i;
const SAFE_DATA_IMAGE = /^\s*data:image\/(?:png|jpe?g|gif|webp|avif);/i;
const BAD_STYLE = /expression\s*\(|url\s*\(\s*['"]?\s*(?:javascript|vbscript):/i;

export default function sanitizeHtml(html) {
  if (!html) return '';
  if (typeof DOMParser === 'undefined') return '';

  const doc = new DOMParser().parseFromString(String(html), 'text/html');
  doc.body.querySelectorAll(BLOCKED_TAGS).forEach((node) => node.remove());

  doc.body.querySelectorAll('*').forEach((node) => {
    for (const { name, value } of Array.from(node.attributes)) {
      const attr = name.toLowerCase();
      if (attr.startsWith('on') || attr === 'srcdoc') {
        node.removeAttribute(name);
      } else if (URL_ATTRS.has(attr)) {
        const keepDataImage = attr === 'src' && node.tagName === 'IMG' && SAFE_DATA_IMAGE.test(value);
        /* Browsers ignore whitespace and control characters inside a scheme (`java\tscript:`),
           so strip them before the test. */
        // eslint-disable-next-line no-control-regex
        if (!keepDataImage && BAD_SCHEME.test(value.replace(/[\u0000- ]/g, ''))) node.removeAttribute(name);
      } else if (attr === 'style' && BAD_STYLE.test(value)) {
        node.removeAttribute(name);
      }
    }
    /* A link the operator opens in a new tab must not hand that tab `window.opener`. */
    if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });

  return doc.body.innerHTML;
}
