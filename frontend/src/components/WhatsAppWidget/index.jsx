import whatsappIcon from '../../assets/whatsapp.png';
import { useSiteBranding } from '../../services/siteBranding';

/* THIS BUILD'S — the floating WhatsApp button (user's request, 2026-10-31). The owner panel
 * (Branding → WhatsApp widget) turns it on and sets a number or a WhatsApp link plus an opening
 * message; switched on with neither, the button shows but does nothing. It sits above the phone
 * tabbar and above the desktop back-to-top stack. */
export default function WhatsAppWidget() {
  const wa = useSiteBranding()?.whatsapp;
  if (!wa?.enabled) return null;
  const text = wa.message ? encodeURIComponent(wa.message) : '';
  let href;
  if (wa.link?.startsWith('https://')) href = wa.link;
  else if (wa.link) href = `https://wa.me/${wa.link.replace(/\D/g, '')}${text ? `?text=${text}` : ''}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      aria-disabled={!href}
      onClick={(e) => !href && e.preventDefault()}
      className={`fixed bottom-[5.5rem] end-3 z-100 block size-13 overflow-hidden rounded-[22%] shadow-lg transition-transform lg:bottom-20 lg:end-2 ${
        href ? 'hover:scale-105' : 'cursor-not-allowed opacity-60'
      }`}
    >
      <img src={whatsappIcon} alt="" className="size-full" />
    </a>
  );
}
