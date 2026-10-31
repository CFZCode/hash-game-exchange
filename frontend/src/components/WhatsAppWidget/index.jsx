import whatsappIcon from '../../assets/whatsapp.png';
import { TelegramIcon } from '../modals/Auth/icons';
import { useSiteBranding } from '../../services/siteBranding';

/* THIS BUILD'S — the floating chat buttons (user's request, 2026-10-31 / 11-01). The owner panel
 * (Branding → Chat buttons) allows WhatsApp and Telegram; the site admin (Site config → Branding)
 * switches each on and sets its number or link. On with no link, the button shows but does
 * nothing. They sit above the phone tabbar and above the desktop back-to-top stack. */
const ChatButton = ({ link, label, children }) => (
  <a
    href={link ?? undefined}
    target="_blank"
    rel="noreferrer"
    aria-label={label}
    aria-disabled={!link}
    onClick={(e) => !link && e.preventDefault()}
    className={`block size-13 overflow-hidden rounded-[22%] shadow-lg transition-transform ${link ? 'hover:scale-105' : 'cursor-not-allowed opacity-60'}`}
  >
    {children}
  </a>
);

export default function WhatsAppWidget() {
  const branding = useSiteBranding();
  const wa = branding?.whatsapp;
  const tg = branding?.telegram;
  if (!wa?.enabled && !tg?.enabled) return null;
  return (
    <div className="fixed bottom-[5.5rem] end-3 z-100 flex flex-col gap-2 lg:bottom-20 lg:end-2">
      {tg?.enabled && (
        <ChatButton link={tg.link} label="Chat on Telegram">
          <span className="flex size-full items-center justify-center bg-[#229ED9]">
            <TelegramIcon className="size-8 text-white" />
          </span>
        </ChatButton>
      )}
      {wa?.enabled && (
        <ChatButton link={wa.link} label="Chat on WhatsApp">
          <img src={whatsappIcon} alt="" className="size-full" />
        </ChatButton>
      )}
    </div>
  );
}
