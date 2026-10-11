import React from 'react';
import { Link } from 'react-router-dom';
import Select from '../shared/Select';
import useResource from '../../hooks/useResource';
import { IconArrow } from '../shared/icons';
import { IconInform, IconAdd } from '../../layouts/MainLayout/Header/AfterLogin/icons';
import {
  IconTierBronze,
  IconTierSilver,
  IconTierGold,
  IconTierPlatinum,
} from '../../pages/Referral/icons';
import { vipTier, tierColor } from '../../data/vipConfig';
import { getChatRooms, getChatMessages, roomLabel } from '../../services/chat';
import { IconGif, IconEmoji, IconSend } from './icons';
import richIcon from '../../assets/chat/rich.png';
import richCloseIcon from '../../assets/chat/rich_close.png';
import RichList from './RichList';
import ChatRules from './ChatRules';
import './Chat.css';
import Loading from '../shared/Loading';

/* The GLOBAL CHAT — the `right() === "chat"` arm of the right-hand drawer, and what the desktop
 * header's chat button opens.
 *
 * `index-CUBJDfzw.js` (149 KB) off `hash.game/assets/`, resolved the long way round: the drawer's
 * shell in `Header-CTF5n6al.js` renders `X` for that arm, `X` is `a7` re-exported from
 * `Enter-MsmOuq5R.js`, and `a7` is `Ih`, a lazy import of this chunk. Worth recording, because
 * `ChatTypeXSide-DUoEr9uF.js` — the obvious-looking name in the deps table — is NOT this. That one
 * is the PRIVATE-messages panel (the `private-chat` arm), built on a third-party SDK, and its
 * header reads "Private Messages". Two chat panels, two chunks, and the one named after chat is
 * the other one.
 *
 * THE STORE IS IN THE MIRROR EVEN THOUGH THE UI WAS NOT. `Enter-MsmOuq5R.js` carries the room
 * state, the socket wiring and the REST paths, which is how `services/chat.js` can name real
 * endpoints for a feature whose markup had to be fetched.
 *
 * ── WHAT IS BUILT ────────────────────────────────────────────────────────────────────────────
 *
 * The chunk holds far more than the capture shows: thirteen message TYPES (bet shares, coin drops,
 * rain, spin wheels, jackpot ribbons, invite cards), a rich list, an emoji picker, a GIF picker,
 * slash commands, moderation. Built here is what the reference capture renders — the header, the
 * message list with its four content parts, and the composer. Everything else is listed at the
 * bottom of this file rather than stubbed.
 *
 * ── THREE THINGS THE CHUNK SETTLES ───────────────────────────────────────────────────────────
 *
 * A MESSAGE'S CONTENT IS AN ARRAY, NOT A STRING. `yt` walks `data.chat` and switches per entry: a
 * bare string is text (split on newlines into `<br>`s), and an object is one of `user` (an
 * @mention linking to the profile, in BRAND GREEN), `gif` (Giphy, by id), `link` (an external URL
 * behind a confirm) or `img` (an upload). The server does the parsing, so the fixture stores the
 * parsed form rather than a string it would have to re-parse.
 *
 * A ROW'S HEADER ONLY RENDERS FOR THE FIRST MESSAGE OF A RUN. `isFirst` is
 * `chats[i-1].userId !== chats[i].userId`, and it gates the avatar AND the name line AND the row's
 * own `pt-4` — so a second message from the same author is a bare bubble tucked under the first.
 * Every row in the capture is a different author, which is exactly when that rule is invisible.
 *
 * THE LEVEL BADGE PRINTS THE TIER'S SUFFIX, NOT THE LEVEL. `us` looks the level up in the VIP
 * ladder, draws that tier's glyph in that tier's colour, and prints the suffix beside it — so
 * level 4 is a Bronze glyph and "IV". It sits inside `<Show when={level > 0 && ICON[base]}>`,
 * which is why a tier with no glyph renders no badge at all rather than an empty box.
 */

/* `ot` in the chunk, which maps all EIGHT tier families. Four are drawn here because four are what
   this project has — `IconNblevelsilver-CYvOpWLl.js`, already extracted for the referral Rate &
   Rules pane. Beginner, Diamond and Eternal/External are the other three and they sit in
   `IconNblevelexternal-DFbHcrE9.js`, which IS in the mirror (exports `b`, `a`, `I`); they are not
   pulled in because no row in this fixture reaches them. The `Show` below is the original's own,
   so a tier without a glyph renders no badge either way — the gap is silent on the live site too,
   and closing it is one extraction. */
const TIER_ICON = {
  Bronze: IconTierBronze,
  Silver: IconTierSilver,
  Gold: IconTierGold,
  Platinum: IconTierPlatinum,
};

const pad = (n) => String(n).padStart(2, '0');

function LevelBadge({ level }) {
  const tier = vipTier(level);
  const Icon = TIER_ICON[tier.base];
  if (!(level > 0) || !Icon) return null;

  return (
    /* The original wraps this in its Tooltip primitive with `${base} ${suffix}` as the title.
       `title` is the honest stand-in until this project has that primitive — the same call the
       BetBy rail's tooltip made before it got one. */
    <div
      className="flex h-4 items-center gap-0.5 rounded bg-layer4 pl-0.5 pr-1"
      title={`${tier.base} ${tier.suffix}`}
    >
      {/* `icon` for the same reason the header's chevron carries it — `fill: currentColor` is what
          makes the inline `color` reach the glyph at all. Without it the diamond is solid black on
          a layer4 chip, in both themes. `pages/Referral/RateRules` writes the identical pair. */}
      <Icon className="icon size-3" style={{ color: tierColor(tier.base) }} />
      {tier.suffix && <div className="text-xs text-primary">{tier.suffix}</div>}
    </div>
  );
}

/* `yt`. `inPublic` is what adds `text-secondary`, so the body sits dimmer than the name above it
   and an @mention's brand green reads against it. */
function MessageContent({ chat }) {
  return (
    <div className="break-word w-fit font-semibold text-secondary">
      {chat.map((part, index) => {
        const key = index;

        if (typeof part === 'string') {
          /* `r.split(/(\n)/)` — the capture group keeps the separators, so each newline becomes a
             <br> and the text either side of it survives. */
          return part
            .split(/(\n)/)
            .map((piece, i) =>
              piece === '\n' ? (
                <br key={`${key}-${i}`} />
              ) : (
                <React.Fragment key={`${key}-${i}`}>{piece}</React.Fragment>
              ),
            );
        }

        if (part.type === 'user') {
          return (
            <Link key={key} className="text-brand" to={`/user/profile/${part.args[0]}`}>
              @{part.args[1]}
            </Link>
          );
        }

        if (part.type === 'gif') {
          /* `https://media2.giphy.com/media/<id>/giphy.gif` — the chunk's own URL. Its loading
             spinner is not reproduced; nothing in the fixture is a gif. */
          return (
            <div key={key} className="relative h-24">
              <img
                className="h-24 w-auto"
                alt="GIF"
                src={`https://media2.giphy.com/media/${part.args[0]}/giphy.gif`}
              />
            </div>
          );
        }

        if (part.type === 'img') {
          /* `d1(src, "pfile")` builds `<protocol>//pfile.<host><src>`, where the host is the live
             site's — which this build has no equivalent of, so the path is left relative. It
             resolves against this origin and 404s, which is the correct rendering for an upload
             that is not ours to serve; see messages.js for why it is not substituted. */
          return (
            <a key={key} target="_blank" rel="noreferrer" href={part.args[0]}>
              <img className="inline-block h-44 w-auto" alt="" src={part.args[0]} />
            </a>
          );
        }

        if (part.type === 'link') {
          /* The original opens a confirm before leaving the site; that dialog is not built, so
             this renders the truncated URL without the handler. */
          return (
            <span key={key} className="cursor-pointer underline hover:text-blue-200">
              {decodeURIComponent(part.args[0])}
            </span>
          );
        }

        return null;
      })}
    </div>
  );
}

/* `As` — the name line. The order inside it is the template's own: badge, name, titles, time, all
   of them inserted BEFORE the template's `<div class="flex-none text-xs font-semibold">`, which is
   the time. `titles` (the earned-title marks beside a name) is not built. */
function NameLine({ data }) {
  const time = new Date(data.createTime);

  return (
    <div className="mb-1 flex h-5 items-center justify-between">
      <div className="flex h-full items-center gap-1.5">
        <LevelBadge level={data.level} />
        <Link
          to={data.userId !== 0 ? `/user/profile/${data.userId}` : '#'}
          className="flex items-center justify-start font-semibold leading-5"
        >
          <span className="max-52 overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-secondary">
            {data.name}
          </span>
        </Link>
        <div className="flex-none text-xs font-semibold">
          {pad(time.getHours())}:{pad(time.getMinutes())}
        </div>
      </div>
    </div>
  );
}

/* `Cs`. The avatar column is a fixed `w-12` whether or not it holds an avatar, which is what keeps
   a run of messages from one author aligned under the first of them. */
function MessageRow({ data, isFirst }) {
  return (
    <div className={`relative flex flex-row px-3 font-semibold${isFirst ? ' pt-4' : ''}`}>
      <div className="mr-1.5 h-full w-12 flex-none">
        {isFirst && <img className="h-10 w-10 rounded-full" alt="" src={data.avatar} />}
      </div>
      <div className="w-2/3 flex-auto">
        {isFirst && <NameLine data={data} />}
        <div className="relative mb-2 w-full flex-1 rounded-lg bg-layer4 p-2 text-sm">
          <MessageContent chat={data.chat} />
        </div>
      </div>
    </div>
  );
}

/* `ks`. The textarea is controlled in VALUE and uncontrolled in HEIGHT: the height is written onto
   the node, because it is measured from `scrollHeight` and there is nothing to derive it from in
   render. `min-h-10` is what it collapses back to when the field empties.
   The invisible mirror div beside it is reproduced rather than dropped — the original's
   ResizeObserver watches IT, not the textarea, and that measurement is what flips the row from
   `items-end` to the stacked multi-line layout. */
function Composer() {
  const [value, setValue] = React.useState('');
  const [focus, setFocus] = React.useState(false);
  const [multiline, setMultiline] = React.useState(false);
  const mirrorRef = React.useRef(null);

  const onInput = (event) => {
    const el = event.target;
    setValue(el.value);

    if (!el.value) {
      setMultiline(false);
      el.style.height = '2.5rem';
      return;
    }
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    /* `Bs = 22` — one line's box. The mirror passes it before the textarea does. */
    if (mirrorRef.current && mirrorRef.current.getBoundingClientRect().height > 22) {
      setMultiline(true);
    }
  };

  return (
    <div
      className="relative w-full bg-layer3 px-3 pb-3 pt-2"
      style={{ boxShadow: 'rgba(0, 0, 0, 0.14) 0px -8px 20px 0px' }}
    >
      <form className="flex items-end gap-3" onSubmit={(event) => event.preventDefault()}>
        <div
          className={`box-border flex min-h-11 w-full rounded-lg border bg-layer5 transition-all ${
            multiline ? 'flex-col' : 'items-end gap-2'
          } ${focus ? 'border-brand' : 'border-transparent'}`}
        >
          <div className={`relative font-semibold text-primary ${multiline ? 'w-full' : 'flex-1'}`}>
            <textarea
              name="chat-textarea"
              className={`block max-h-40 min-h-10 w-full resize-none bg-transparent text-primary placeholder-quarterary outline-none ${
                multiline ? 'px-3 pt-2' : 'py-2 pl-3'
              }`}
              rows={multiline ? undefined : 1}
              enterKeyHint="send"
              placeholder="Your message..."
              value={value}
              onChange={onInput}
              onFocus={() => setFocus(true)}
              onBlur={() => setFocus(false)}
            />
            <div
              ref={mirrorRef}
              className="pointer-events-none absolute left-0 top-0 z-0 w-full select-none break-all px-3 opacity-0"
              style={{ lineHeight: '20px' }}
            >
              {value}
            </div>
          </div>

          {/* Both open pickers that are not built, so both are inert. They are `size-6` divs
              rather than buttons on the original too. */}
          <div className={`center flex h-10 gap-2 pr-2 ${multiline ? 'w-full justify-end' : ''}`}>
            <div className="center flex size-6 flex-none cursor-pointer">
              <IconGif className="size-6 fill-secondary" />
            </div>
            <div className="center flex size-6 flex-none cursor-pointer">
              <IconEmoji className="size-6 fill-secondary" />
            </div>
          </div>
        </div>

        {/* THE TRAILING BUTTON SWAPS ON FOCUS, which is the chunk's own `<Show when={focus}>`:
            idle it is a `bg-layer5` square holding the `+` that opens the extras sheet, focused it
            is the brand send button. The idle square is the chunk's colours exactly — a raised
            grey box with a SECONDARY `+`, not a brand fill — and it only turns green once the
            field has focus and the glyph has become the send arrow. */}
        {focus ? (
          <button
            type="button"
            className="button button-brand sliding size-11 flex-none p-0 transition-all"
            aria-label="Send"
          >
            <IconSend className="size-7 fill-alw_dark" />
          </button>
        ) : (
          <div className="center flex size-11 flex-none cursor-pointer rounded-lg bg-layer5">
            <IconAdd className="size-6 fill-secondary hover:fill-primary" />
          </div>
        )}
      </form>

      {/* `<Show when={msg && msg.length > 200}>` — the counter only appears near the cap, and turns
          red past 1000, which is also where the send is refused. */}
      {value.length > 200 && (
        <div className="absolute right-3 top-2 text-right font-normal text-secondary">
          <span className={value.length > 1000 ? 'text-error' : undefined}>{value.length}</span>
          <span className="block">/1000</span>
        </div>
      )}
    </div>
  );
}

export default function Chat() {
  const { data: roomData, loading: roomsLoading } = useResource(getChatRooms);
  const rooms = roomData?.roomList ?? [];

  /* `Number(localStorage.getItem(key)) || rooms[0]?.[0]` on the original — the last room you were
     in survives a reload. Not persisted here: the only room with anything in it is Global, so
     remembering a choice would mean reopening onto an empty room. */
  const [roomId, setRoomId] = React.useState(100);

  /* `s`/`i` in the header component — one boolean for the trophy's board, which is why the icon
     and the panel cannot disagree about whether it is open. The rules card is a popup rather than
     a panel and has nothing to do with it. */
  const [richOpen, setRichOpen] = React.useState(false);
  const [rulesOpen, setRulesOpen] = React.useState(false);

  const current = rooms.find((room) => room.roomId === roomId) ?? rooms[0];
  const messages = getChatMessages(roomId);
  const scroller = React.useRef(null);

  /* `requestAnimationFrame(scrollToEnd)` once the room is joined — a chat opens at the BOTTOM.
     In a layout effect so the first painted frame is already scrolled rather than jumping after
     it, the same reasoning the hero carousel's ref-callback measurement records. */
  React.useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [roomId, messages.length]);

  return (
    <div className="relative left-0 top-0 size-full">
      {/* `q1`. `sm:absolute` is what takes the header out of the flow so the list can scroll
          under it; the `h-15` spacer at the top of the list is what gives that space back.
          `pc:pe-[2.75rem]` on the original is written out as `pe-11`: `pc` is a plain class on
          the original's root rather than a breakpoint — the referral pane documents that — so the
          variant would emit nothing here, and the padding is not optional, since it is what keeps
          the channel name clear of the drawer's own close square. */}
      <div className="header-layer absolute left-0 top-0 z-10 w-full flex-none bg-layer4">
        <div className="flex h-14 min-w-0 items-center justify-between gap-2 px-4 pe-11 sm:h-15">
          {/* `K1`, THE ROOM PICKER, AND ITS THREE ARGUMENTS ARE THE LAYER'S RATHER THAN THE
              TRIGGER'S — on the site's Select the trigger is `children` and `class`/`style`/`space`
              all belong to the dropdown:

                class: mobile ? "bg-layer3 dark:bg-layer2" : "-ms-2 bg-layer4 p-2"
                style: { box-shadow: "0 0 6px -1px rgba(0,0,0,.10), 0 0 4px -1px rgba(0,0,0,.12)" }
                space: 18

              **`-ms-2` IS THE WHOLE OF THE LEFT ALIGNMENT** and it is why the layer sits further
              left than the trigger it hangs off: the popover start-aligns to the trigger's box
              (`js` in the main bundle — see Select/position.js), and this pulls it back the 8px
              the header's own `px-4` would otherwise inset it by. Measured off the reference at
              dpr 1.25 the layer's left edge lands at 8.8 CSS px against a trigger at 16.

              `p-2` restates `.dropdown-layer.select-options`'s own 0.5rem, and `!bg-layer4` needs
              the `!` for a cascade reason rather than a visual one: `Dropdown` writes `bg-layer3`
              as its default fill, and two background utilities on one element are settled by
              which the STYLESHEET emits last, not by which the class list does — the trap the
              auth dialog's third-party buttons document. The layer is layer4 and its selected row
              layer5 here, both a step lighter than this build's defaults, confirmed against the
              capture's own pixels. `space: 18` is the gap under the trigger; the box-shadow is a
              centred glow rather than `.dropdown-layer`'s downward pair, so it is written as a
              utility, which beats the layered rule.

              THE TRIGGER KEEPS ITS `button-m` HEIGHT, and dropping the `!h-auto` that used to be
              here is half of the vertical fix: `space` is measured from the trigger's BOTTOM, so
              a 21px auto-height box put the layer 10px higher than the original's 40px one. The
              button is transparent, so its height is invisible except through where the layer
              lands. `px-1` is the chunk's and cancels `.select`'s own 0.75rem start padding on
              its own — a utility beats the layered rule — which is why the `p-0` that sat beside
              it is gone too; `border-none bg-transparent` are this port's, cancelling the
              `.select bg-input_bright` pair that `Dropdown` writes and the original's trigger
              (a plain Button, since the site's Select takes its trigger as `children`) never
              has. */}
          <Select
            className="min-w-0 max-w-full border-none bg-transparent px-1"
            optionsClassName="-ms-2 !bg-layer4 p-2 shadow-[0_0_6px_-1px_rgba(0,0,0,0.10),0_0_4px_-1px_rgba(0,0,0,0.12)]"
            space={18}
            value={current}
            options={rooms}
            onChange={(room) => setRoomId(room.roomId)}
            title="Channel"
            /* `layer` on the original is a fully custom row per option, which is what
               `optionRender` is — it REPLACES the row rather than filling one, and the click is
               bound to whatever element comes back. `mb-1` is the 4px between rows (the reference
               measures a 44px pitch against `h-10`'s 40) and `!bg-layer5` is the chunk's own `!`,
               beating `.select-item[aria-selected]`'s layered layer4. */
            optionRender={(room, selected) => (
              <button
                type="button"
                role="option"
                aria-selected={selected || undefined}
                className={`radio select-item btn-like mb-1 h-10 cursor-pointer${
                  selected ? ' !bg-layer5' : ''
                }`}
              >
                {/* `G1` is `<button><span class=font-extrabold>` — the weight is on the SPAN, not
                    on the row, and it is what makes these labels read heavier than a Select's
                    rows anywhere else in the build. */}
                <span className="font-extrabold">{roomLabel(room)}</span>
              </button>
            )}
            labelRender={(room, open) => (
              <div
                className={`flex min-w-0 max-w-full items-center gap-1 font-extrabold ${
                  open ? 'text-brand' : 'text-primary'
                }`}
              >
                {/* `roomLabel(undefined)` is `''`, so without this the drawer opens with a blank
                    channel name for as long as `/chat/room/list/` takes. The ORIGINAL does not
                    show a blank there — its store ships a hardcoded offline room list and falls
                    back to it, which is the same fallback `roomLabel`'s two id tests exist for
                    (see services/chat.js). That list is not reproduced here, so the site's own
                    12px inline spinner stands in for it: it says "the channel is arriving" rather
                    than showing a room the fetch might not confirm. */}
                <span className="min-w-0 max-w-[9rem] truncate [&>.loading]:size-3 sm:max-w-[12rem]">
                  {roomsLoading ? <Loading className="text-current" /> : roomLabel(room)}
                </span>
                {/* `class: D("size-5 flex-none transition-all", t() ? "rotate-90" : "-rotate-90")`
                    — the chevron points UP while the layer is open, and the label goes brand with
                    it. `Select` now hands `labelRender` that flag as a second argument, which is
                    the extension point this comment used to say to add.

                    `icon` IS NOT DECORATION HERE — it is `fill: currentColor`, and without it the
                    glyph renders solid black, which is the trap this project's shared icon module
                    warns about at its head: these are the bare `<svg>` and the original's wrapper
                    (`d` in Wrap-DblNcHvH.js) prepends the class for every call site. The chevron
                    carries no `fill-*` utility of its own precisely so that it takes the label's
                    colour — `text-primary` on the row above, which is white in the dark theme and
                    near-black in the light one, so one class is right in both. Same arrangement as
                    the Explore panel's type dropdown, which the note there records. */}
                <IconArrow
                  className={`icon size-5 flex-none transition-all ${
                    open ? 'rotate-90' : '-rotate-90'
                  }`}
                />
              </div>
            )}
          >
            {(room) => roomLabel(room)}
          </Select>

          <div className="center z-10 flex-none gap-1">
            {/* `S.push(() => L1())` — the rules card, pushed onto the popup stack on the original
                and rendered from local state here. Note this button's class list is the ONE in
                the header without `rounded-lg`: `class: "size-8 bg-layer5 p-0"` against the
                trophy's `"center size-8 rounded-lg bg-layer5 p-0"`. It still rounds to the same
                10px, because `ot` appends `button-${size}` with `s = size || !mobile && "m"` and
                `.button-m` carries `--radius-lg` — which is why the two squares match in the
                capture despite only one of them naming a radius. This drawer renders nowhere but
                a desktop, so `button-m` is written flat on both, as `PcNav`'s back button is. */}
            <button
              type="button"
              className="button button-m size-8 bg-layer5 p-0"
              aria-label="Chat rules"
              onClick={() => setRulesOpen(true)}
            >
              <IconInform className="size-5 fill-secondary" />
            </button>
            {/* The trophy, and the artwork is the deploy's own in both states: `K.rich` is a
                base64 PNG inlined in the chunk (the same arrangement the nine referral social
                marks and the Rate & Rules gold coin have) while `K.rich_close` — the trophy with
                a strike through it — is an ordinary `/assets` file. `src={s() ? K.rich_close :
                K.rich}` is the whole of the pressed state; there is no colour or fill change. */}
            <button
              type="button"
              className="button button-m center size-8 rounded-lg bg-layer5 p-0"
              aria-label="Rich list"
              aria-pressed={richOpen}
              onClick={() => setRichOpen((open) => !open)}
            >
              <img className="size-4" alt="rich list" src={richOpen ? richCloseIcon : richIcon} />
            </button>
          </div>
        </div>

        {/* `q1`'s third child, and the board hangs off it — see RichList, which is `absolute`
            inside this box so it overlays the messages instead of pushing them down. */}
        <div className="relative w-full">{richOpen && <RichList />}</div>
      </div>

      {/* `Me` — `scroll-layer chat-scroll-layer h-full`. The list scrolls under the absolute
          header, and `ai()`, the `h-15` spacer, is the first thing inside it. */}
      <div ref={scroller} className="chat-scroll-layer h-full overflow-y-auto">
        <div className="h-14 w-full sm:h-15" />

        {messages.map((message, index) => (
          <MessageRow
            key={message.id}
            data={message}
            /* `chats[i-1].userId !== chats[i].userId` */
            isFirst={index === 0 || messages[index - 1].userId !== message.userId}
          />
        ))}

        {/* `ii()` — a spacer the height of the composer, written from a ResizeObserver on it. It
            is a flat 64px here because nothing that changes that height (the multi-line arm, the
            error strip, the extras sheet) is reachable yet. */}
        <div className="h-16 w-full" />
      </div>

      {/* `gi()` */}
      <div className="absolute bottom-0 left-0 w-full">
        <Composer />
      </div>

      {/* Portals to <body> from inside PopCenter, so where it sits in this tree decides nothing
          about where it paints — only that it unmounts with the drawer. */}
      <ChatRules open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}

/* NOT BUILT, each a real component in the chunk rather than a stub:
 *
 *   the other twelve message TYPES  `Te` maps T0/T2/T8/T9/T10/T12/T13/T14/T15/T18/T19/T20/T22 to a
 *                                   component each — bet shares (the "Payout 0x" card at the top
 *                                   of the reference capture is one), coin drops and their claim
 *                                   dialog, rain, spin-wheel gifts, jackpot ribbons, invite cards.
 *                                   Every one needs payload this build has no source for.
 *   the pinned message              `b1` over `/chat/room/<id>/pinned-msg/` — which ANSWERS, so it
 *                                   is the one unbuilt piece here with real data already waiting.
 *                                   It is dismissible per message id through localStorage.
 *   the emoji and GIF pickers       `Ws`, plus `Emoji-SsQoivWA.js`.
 *   slash commands                  `/pinmsg` and the command autocomplete above the field.
 *   sending                         `POST /chat/room/<id>/send/`, authenticated, and with it the
 *                                   mute check, the 1000-character refusal and the local echo.
 *   moderation                      delete and block, both authenticated.
 *   the unread and @-mention pills  `oi` and `ui`, which need a live feed to count against.
 *   the mobile arm                  below 640 the original serves `/chat-public` as a route with
 *                                   its own fixed layout; this drawer is desktop-only, exactly as
 *                                   the notification drawer beside it is.
 */
