import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useResource } from '../../hooks/useResource';
import Loading from '../../components/shared/Loading';
import { getInviteCodes, getFriendCommissions } from '../../services/referral';
import EmptyPlaceholder from '../../components/shared/EmptyPlaceholder';
import PopCenter from '../../components/shared/PopCenter';
import Pagination from '../../components/shared/Pagination';
import DataTable from './DataTable';
import { IconArrow } from '../../layouts/MainLayout/Header/AfterLogin/icons';
import { IconCopy } from '../../components/shared/icons';
import { toast } from '../../components/shared/Toast/toast';
import { copyToClipboard } from '../../utils/clipboard';

/* The Referral Codes & Friends tab — `/referral/refer/:pane`, and the third of the four.
 *
 * `index-CC3wjKfm.js` off `hash.game/assets/`, 6 KB, and it is the whole tab: a two-figure card
 * with a Create Code button over a table of the account's invite codes. Every class list is the
 * Solid template's own and every string is verbatim `t("…")`.
 *
 * THIS IS THE ONE REFERRAL PANE WHOSE TABLE HAS A ROW, and the row is not invented — it is the
 * account's own invite code, which this project already had. `/agent/invitation/code/list/`
 * answers 403 like every other `/agent/` route, but its payload is one entry per code the account
 * has created and this account has created exactly one: the same `aliasCode` and `invitationUrl`
 * the Dashboard's invite card and the Refer and Earn dialog both print, from
 * `SIGNED_IN.currentInvitationCode`. So the three surfaces cannot disagree. `createdNum: 1` and
 * `totalCodeNum: 20` are the capture's own pair — 20 is the cap, not a count.
 *
 * `ratio` is 0.25, printed `× 100` with a literal `%` after it, which is the same 25% the invite
 * card states as `commissionRate` and the Rate & Rules calculator opens on.
 *
 * NOT BUILT, each inert at its call site: the Create Code dialog's submit
 * (`POST agent/invitation/code/add/`, authenticated — the dialog itself is built because it is
 * three fields and the chunk carries all of them) and the `/referral-code-detail` route behind
 * the Referrals arrow. Each Copy raises the original's own toast.
 */

/* `ie` — the Create Code dialog. Note the chunk posts the SAME value as both `invitationName` and
   `campaignName`, from one field; that is its own, not a transcription slip. On success it copies
   the new code's URL and raises one of two toasts depending on whether the clipboard write threw,
   which is a level of care worth recording: "Referral code created and copied to clipboard." or
   "Referral code created.", and a refusal toasts the server's `message`. The submit itself is not
   wired, so none of the three can fire yet. */
function CreateCodeDialog({ open, onClose }) {
  const [name, setName] = React.useState('');

  return (
    <PopCenter open={open} onClose={onClose} title="Create Code">
      <div className="mb-4">
        <p className="mb-3 text-secondary">Campaign Name (Optional)</p>
        <div className="input">
          <input
            className="w-full bg-transparent outline-none"
            placeholder="Enter Campaign Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
      </div>
      <div>
        <button type="button" className="button button-brand button-m w-full" onClick={onClose}>
          Create campaign
        </button>
      </div>
    </PopCenter>
  );
}

/* `ne(new Date(e), "YYYY-MM-DD HH:mm:ss")` — the Date Created column's format, out of
   `utils-PrQ_cjrK.js`. Local time, as the helper is. */
const pad = (n) => String(n).padStart(2, '0');
const stamp = (value) => {
  const d = new Date(value);
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
};

/* The two cells confirm differently, and both are bare `F` toasts:
 *   Code:  `I(e.toString()), g(s("Copied"))`                                   — `be`, then "Copied"
 *   Link:  `try { navigator.clipboard.writeText(e), g(s("Invitation URL copied to clipboard.")) }
 *           catch {}`                                                         — the raw API */
const copyCode = (value) => {
  copyToClipboard(String(value));
  toast('Copied');
};

const copyLink = (value) => {
  try {
    navigator.clipboard.writeText(value).catch(() => {});
    toast('Invitation URL copied to clipboard.');
  } catch {
    /* the chunk's own empty catch */
  }
};

/* THE TWO COPY BUTTONS ARE NOT THE SAME COMPONENT ON THE ORIGINAL, and the difference is not
 * cosmetic — it decides how wide the button is.
 *
 *   Code:  l(v, { onClick, class: "p-0", children: l(N, { class: "size-5 fill-secondary" }) })
 *   Link:  l(v, { children: l(N, { class: "size-5 cursor-pointer fill-secondary p-0", onClick }) })
 *
 * — note the Link button is handed NO `class` at all.
 *
 * So the handler moves from the button to the ICON (which is why only that one needs
 * `cursor-pointer` — a button already has it), and the `p-0` moves with it, onto an `<svg>` where
 * it does nothing. The Link cell's BUTTON therefore keeps `.button`'s own
 * `padding-inline: .5rem`, and the original's link sits 8px further from its icon than its code
 * does. Easy to read as a transcription slip in either direction; it is the chunk's.
 *
 * THIS BUILD KEEPS `p-0` ON BOTH, which is a deliberate departure and the reason the gap here is
 * tighter than the live site's — requested, and a one-word revert (drop `p-0` from the Link arm).
 * `gap-0` on the Link cell below is the other half of the same request.
 *
 * `IconCopy` is `IconCopy-i40gX7iJ.js`, the mirror's own file, which `components/shared/icons.jsx`
 * had been carrying a different drawing under. Corrected there. Note the glyph's own left inset —
 * its path starts at x=5.33 of a 32 viewBox, so at `size-5` it carries 3.3px of transparent
 * margin — is what still separates it from the text with no gap class at all, and is why removing
 * the gap does not read as cramped. */
function CopyButton({ value, onIcon }) {
  return (
    <button type="button" className="button button-m p-0" onClick={onIcon ? undefined : () => copyCode(value)}>
      <IconCopy
        className={`icon size-5 fill-secondary${onIcon ? ' cursor-pointer p-0' : ''}`}
        onClick={onIcon ? () => copyLink(value) : undefined}
      />
    </button>
  );
}

/* `ve` — the code table. THE PAGER IS CLIENT-SIDE: the feed returns every code in one response
   (`pageSize: 20` on the request, against a cap of 20 codes) and the component slices it, which
   is why the page control changes nothing about what is fetched. It renders only past ten codes;
   note it counts `createdNum` rather than `list.length`. */
function CodeTable({ data }) {
  const navigate = useNavigate();
  const [page, setPage] = React.useState(1);
  const pageSize = 10;
  const rows = data.list.slice((page - 1) * pageSize, page * pageSize);

  const columns = [
    {
      title: 'Name',
      dataIndex: 'campaignName',
      /* "--" for an unnamed code, which is what the capture's single row shows. */
      render: (v) => <span className="font-semibold text-secondary">{v || '--'}</span>,
    },
    {
      title: 'Code',
      dataIndex: 'aliasCode',
      render: (v) => (
        <div className="center gap-1 font-semibold">
          <span>{v}</span>
          <CopyButton value={v} />
        </div>
      ),
    },
    {
      title: 'Link',
      dataIndex: 'invitationUrl',
      render: (v) => (
        /* `gap-0` where the chunk writes `gap-1` — requested, and the one-word revert.

           THREE THINGS SIT BETWEEN THE URL AND THE GLYPH and only one of them is this class, which
           is worth knowing before tuning it further:

             gap-0    0px   this class
             p-0      0px   on the button, and it is a DEPARTURE — the chunk hands the Link
                            button no class at all, so on the live site it keeps `.button`'s own
                            `padding-inline: .5rem` and the mark sits 8px further out than in the
                            Code cell beside it. Dropping `p-0` from the Link arm of CopyButton is
                            what restores that.
             —        3.3px the glyph's own transparent left margin: `IconCopy`'s path starts at
                            x=5.33 of a 32 viewBox, so at `size-5` it never touches its own box.
                            Nothing in CSS reaches this; it needs the SVG edited.

           So the floor here is about 3px however the gap class is written, and the largest single
           lever is the button padding rather than the gap. */
        <div className="center gap-0 font-semibold">
          <span className="font-semibold leading-6 text-primary">{v}</span>
          <CopyButton value={v} onIcon />
        </div>
      ),
    },
    {
      title: 'Commission Rate',
      dataIndex: 'ratio',
      /* The `%` is a literal AFTER the figure in the template, and the figure is the stored
         fraction times 100 — 0.25 renders as "25%". */
      render: (v) => <span className="font-semibold leading-6 text-primary">{v * 100}%</span>,
    },
    {
      title: 'Date Created',
      dataIndex: 'createTime',
      render: (v) => <span className="font-semibold leading-6 text-secondary">{stamp(v)}</span>,
    },
    {
      title: 'Referrals',
      dataIndex: 'registerNum',
      render: (v, row) => (
        <div
          className="flex cursor-pointer items-center justify-end gap-2"
          onClick={() => navigate('/referral-code-detail', { state: row })}
        >
          <span className="font-semibold text-primary">{v}</span>
          <IconArrow className="icon size-5 rotate-180 fill-secondary" />
        </div>
      ),
    },
  ];

  if (!rows.length) {
    return (
      <div>
        <EmptyPlaceholder>No rewards yet invite friends to join you now!</EmptyPlaceholder>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:p-4">
        {/* THE COLUMN POSITIONS ARE THE BROWSER'S, NOT THIS FILE'S, and that is deliberate after
            two attempts at overriding them. The chunk sets no widths, so Chrome sizes each column
            from its content and hands out the leftover — which means the layout is a pure
            function of the row's text, and it matches the original exactly to the extent the row
            does. Ours differs in one place only: `getInvitationCode` builds the link on `bc.game`
            where the captured session was served from `hash.game`, four characters shorter, which
            narrows the Link column and pulls everything after it left by ten or fifteen pixels.

            Two overrides were tried and both are gone. Wider cell padding moves the middle
            columns out, but by an amount that is itself a function of the content, so it lands
            near the capture rather than on it. Pinned `<colgroup>` percentages are exact, but the
            percentages have to come from measuring the capture, and that measurement is not sound
            — three independent ways of recovering the screenshot's scale disagree by 40%, and the
            widths they produce put the Date column below the width its own text needs, which
            cannot be right. A number that confident-looking and that badly grounded is worse than
            no number.

            So: to close the gap, change the host in `services/referral.js` — one line, and it
            makes the row identical to the capture and the layout identical by construction. It is
            left as `bc.game` because that is the account's own host and two other surfaces print
            the same string. */}
        <DataTable columns={columns} data={rows} />
        {/* `class="flex justify-end p-3"` is the chunk's; this build's Pagination takes an
            `align` instead, added for the weekly raffle, and carries its own spacing. */}
        {data.createdNum > 10 ? (
          <Pagination
            align="end"
            page={page}
            pages={Math.ceil(data.createdNum / pageSize)}
            onChange={setPage}
          />
        ) : null}
      </div>
    </div>
  );
}

export default function ReferralCodes() {
  const { data: codes } = useResource(getInviteCodes);
  const { data: friends } = useResource(getFriendCommissions);
  const [creating, setCreating] = React.useState(false);

  /* The two-figure card reads `codes`, the table reads it too and the Friends figure reads
     `friends` — one card and one table off two calls that start together, so the pane is gated
     as a whole rather than split the way `/referral/my-rewards` is. */
  if (!codes || !friends) {
    return (
      <div className="center h-96">
        <Loading />
      </div>
    );
  }

  return (
    <div className="bg-layer2 font-semibold">
      {/* `rounded-lg` here where every other card on this page family is `rounded-xl`, and
          `bg-layer4 p-4` around a row that only becomes a row from `sm` up. The `/` after the
          created count is a literal text node in the template, so the pair reads "1/20" with the
          numerator in `text-primary` and the cap inheriting the block's `text-secondary`. */}
      <div className="items-center justify-between rounded-lg bg-layer4 p-4 sm:flex">
        <div className="mb-4 flex flex-1 items-center">
          <div className="flex-1 text-secondary">
            <div>Referral Code Created</div>
            <div className="text-2xl font-extrabold">
              <span className="text-primary">{codes.createdNum}</span>/{codes.totalCodeNum}
            </div>
          </div>
          <div className="flex-1 text-secondary">
            <div>Friends</div>
            <div className="text-2xl font-extrabold text-primary">
              {/* The friend COUNT comes from the other tab's feed, not this one — the page hands
                  `friendTableList` down from the shared route data. */}
              <span>{friends.total}</span>
            </div>
          </div>
        </div>
        <div className="flex w-full items-center border-third sm:h-20 sm:w-60 sm:border-l sm:pl-10">
          <button
            type="button"
            className="button button-brand button-m h-10 w-full"
            onClick={() => setCreating(true)}
          >
            Create Code
          </button>
        </div>
      </div>

      <section className="relative mt-4 rounded-xl bg-layer4 pt-2">
        <CodeTable data={codes} />
      </section>

      <CreateCodeDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
