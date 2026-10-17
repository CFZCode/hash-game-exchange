import { useCricketScore } from '../../hooks/exchange/useCricketScore';
import { cx } from './utils';

/* Live cricket scorecard, fed by the score socket (not an iframe). Content and rules are
   TENEXCH's CricketScorecard: two scores with bat/ball on the batting side, team names, CRR/RR,
   the status message, "Day n" for Tests only, and a chip per DELIVERED ball (the feed pads the
   over with blanks). Only `ww` is a wicket; a bare `w` is a wide. */
const BAT_ICON = '/exchange/bat-icon.png';
const BALL_ICON = '/exchange/ball-icon.png';

function ballTone(v) {
  const s = String(v || '').trim().toLowerCase();
  if (s === 'ww') return 'bg-error text-alw_white';
  if (s === '4') return 'bg-back text-alw_dark';
  if (s === '6') return 'bg-brand text-alw_dark';
  return 'bg-layer5 text-primary';
}

export default function CricketScorecard({ gmid, started = true }) {
  const data = useCricketScore(gmid, { enabled: Boolean(gmid) && started });
  if (!data) return null;

  const {
    spnnation1, spnnation2, score1, score2,
    spnrunrate1, spnrunrate2, spnreqrate1, spnreqrate2,
    spnmessage, activenation1, balls, dayno,
  } = data;
  const team1Batting = String(activenation1) === '1';
  const crr = spnrunrate1 || spnrunrate2 || '';
  const rr = spnreqrate1 || spnreqrate2 || '';
  const day = String(dayno ?? '').trim();
  const ballList = (Array.isArray(balls) ? balls : []).filter((b) => String(b ?? '').trim() !== '');

  return (
    <div className="flex flex-col gap-2 bg-layer2 px-3 py-3 text-sm sm:px-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <img src={team1Batting ? BAT_ICON : BALL_ICON} alt="" className="size-5 flex-none" />
          <span className="text-lg font-extrabold text-primary">{score1 || ''}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-lg font-extrabold text-primary">{score2 || '-'}</span>
          <img src={team1Batting ? BALL_ICON : BAT_ICON} alt="" className="size-5 flex-none" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="truncate font-semibold text-secondary">{spnnation1}</span>
        <span className="flex-none text-tertiary">
          {crr !== '' && <span>CRR {crr}</span>}
          {crr !== '' && rr !== '' && ' · '}
          {rr !== '' && <span>RR {rr}</span>}
        </span>
        <span className="truncate text-right font-semibold text-secondary">{spnnation2}</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-xs text-brand">{spnmessage || ''}</span>
        {day !== '' && day !== '0' && <span className="flex-none text-xs text-tertiary">Day {day}</span>}
        <div className="flex flex-none gap-1">
          {ballList.map((b, i) => (
            <span key={i} className={cx('flex size-6 items-center justify-center rounded-full text-xs font-extrabold', ballTone(b))}>
              {b}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
