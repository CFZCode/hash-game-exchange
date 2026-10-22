import { useSearchParams } from 'react-router-dom';
import { useResource } from './useResource';
import { getRaceFlags, pickRace } from '../services/contest';

/* Which wager races the admin has on (`/user/race` configs). Until the read lands both read as
   off (`flags` undefined), so a switched-off race never flashes in and out. */
export function useRaceFlags() {
  return useResource(getRaceFlags).data;
}

/* The race the contest page shows: `?race=weekly|daily` when that race is on, else the first that
   is, else null (no race running). Shared by the page and its phone dialog's title bar. */
export function useContestRace() {
  const [params] = useSearchParams();
  const flags = useRaceFlags();
  return { flags, type: pickRace(flags, params.get('race')) };
}
