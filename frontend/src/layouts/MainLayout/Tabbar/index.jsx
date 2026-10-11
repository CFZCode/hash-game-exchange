import { useLocation, useNavigate } from 'react-router-dom';
import './Tabbar.css';

export default function Tabbar({ onToggleSidebar, isMenuOpen }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  /* `mn(e)` in Enter-MsmOuq5R.js is the tabbar's own data, and Explore's entry is
     `{ label: "Explore", icon: "explore", link: "/explore", buttonName: "tabbar_explore" }`.
     The button had no handler at all until the route existed.

     THE ICON IS A SPRITE PAIR, NOT ONE CELL WITH A FILTER. The bundle's icon table gives every
     tabbar entry six names — `{normal, light, select, select_light, pure, pure_w}` — and the
     bar uses the `pure` cell when the tab is idle and `select` when it is current, exactly as
     the Menu button beside it already switches `menu_p` for `menu`. So an active Explore takes
     `explore` and an idle one `explore_p`, which is the same arrangement the sidebar's three
     sheets follow and the reason there is no opacity or tint anywhere in this file. */

  /* `const d = () => o().startsWith(u.link)` — the original's own active test, and a PREFIX
     rather than an equality. That is not incidental for Casino: the tab points at `/casino`
     while `/casino/:tab` is a real route, so `/casino/slots` and `/casino/provider` have to
     light the same button. Equality would leave the bar looking as though you had navigated
     away from Casino by picking a category inside it.

     Explore reads the same way now. It has no children, so the two forms agree there — but
     having one rule rather than two is the point, and it is the rule the bundle uses. */
  const isActive = (link) => pathname.startsWith(link);

  const exploreActive = isActive('/explore');
  const casinoActive = isActive('/casino');
  const chatActive = isActive('/chat-public');

  /* Tapping any navigating tab dismisses the menu drawer first. It is not a route in this
     build — Menu is an overlay owned by MainLayout, where the original has a real `/menu`
     page — so nothing else would close it, and it would sit over the page just navigated to. */
  const go = (link) => {
    if (isMenuOpen) onToggleSidebar();
    navigate(link);
  };
  // Centre with utilities, not the `center` helper: `center` is plain unlayered CSS,
  // which outranks anything in @layer utilities and would defeat `lg:hidden`.
  return (
    <div className="tabbar flex items-center justify-center fixed bottom-0 left-0 w-full rounded-t-2xl bg-layer4 z-[99] lg:hidden">
      <button 
        className={`button flex h-full w-1/5 flex-1 flex-col items-center justify-center px-1 py-2 ${isMenuOpen ? 'text-brand' : ''}`}
        type="button"
        onClick={onToggleSidebar}
      >
        <div className="relative">
          <div className={`color_icon_img scale-[80%] ${isMenuOpen ? 'menu_g' : 'menu_p'}`}></div>
        </div>
        <p className={`mt-0.5 text-xs font-extrabold ${isMenuOpen ? 'text-brand' : 'text-tertiary'}`}>Menu</p>
      </button>

      <button
        className={`button flex h-full w-1/5 flex-1 flex-col items-center justify-center px-1 py-2 ${exploreActive ? 'text-brand' : ''}`}
        type="button"
        /* The Menu button toggles a drawer; this one navigates, because on the original
           Explore below the line is a route and Menu is `/menu`. */
        onClick={() => go('/explore')}
      >
        <div className="relative">
          <div className={`color_icon_img scale-[80%] ${exploreActive ? 'explore_g' : 'explore_p'}`}></div>
        </div>
        <p className={`mt-0.5 text-xs font-extrabold ${exploreActive ? 'text-brand' : 'text-tertiary'}`}>Explore</p>
      </button>

      {/* `{ label: "Casino", icon: "casino", link: "/casino", buttonName: "tabbar_casino" }` —
          the third entry in `mn()`, and the page it points at is built, tabs and all. */}
      <button
        className={`button flex h-full w-1/5 flex-1 flex-col items-center justify-center px-1 py-2 ${casinoActive ? 'text-brand' : ''}`}
        type="button"
        onClick={() => go('/casino')}
      >
        <div className="relative">
          <div className={`color_icon_img scale-[80%] ${casinoActive ? 'casino_g' : 'casino_p'}`}></div>
        </div>
        <p className={`mt-0.5 text-xs font-extrabold ${casinoActive ? 'text-brand' : 'text-tertiary'}`}>Casino</p>
      </button>

      <button className="button flex h-full w-1/5 flex-1 flex-col items-center justify-center px-1 py-2" type="button">
        <div className="relative">
          <div className="color_icon_img scale-[80%] sports_p"></div>
        </div>
        <p className="mt-0.5 text-xs font-extrabold text-tertiary">Sports</p>
      </button>

      {/* `{ label: "Chat", icon: "chat", link: "/chat-public", buttonName: "tabbar_chat" }` — the
          fifth and last entry in `mn()`, and it is a LINK like the three above rather than a
          drawer toggle like the desktop header's chat button. Below `lg` the original has no
          right-hand drawer at all and global chat is a real page; that page is built now, so this
          navigates. See pages/ChatPublic for the route, its phone-only guard and the live
          measurements behind its box. */}
      <button
        className={`button flex h-full w-1/5 flex-1 flex-col items-center justify-center px-1 py-2 ${chatActive ? 'text-brand' : ''}`}
        type="button"
        onClick={() => go('/chat-public')}
      >
        <div className="relative">
          <div className={`color_icon_img scale-[80%] ${chatActive ? 'chat_g' : 'chat_p'}`}></div>
        </div>
        <p className={`mt-0.5 text-xs font-extrabold ${chatActive ? 'text-brand' : 'text-tertiary'}`}>Chat</p>
      </button>
    </div>
  );
}
