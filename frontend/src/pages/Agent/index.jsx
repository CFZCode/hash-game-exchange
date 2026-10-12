import { Link } from 'react-router-dom';
import PageCard from '../../components/shared/PageCard';
import { AGENT_PORTAL_URL } from '../../services/gates';

/* `/agent` — the agent entry, on a site whose owner's business model has agents (b2b / hybrid;
 * services/gates.js `agent`, and RouteGate sends a b2c visit to `/`). Not a bc.game page: it is
 * built only from this UI's own primitives — the Responsible page's heading row, `PageCard`, the
 * `button button-brand` CTA and the `text-secondary` copy — so it adds no visual system.
 *
 * Agents do not sign in here. Their players, balances and statements live in the site admin's
 * agent portal, on the admin's own origin (NEXT_PUBLIC_AGENT_PORTAL_URL), so the button is a
 * plain link out rather than a route. */
const POINTS = [
  'Create accounts for your players',
  'Fund players and collect from them',
  'See your transfers and full statement',
];

export default function AgentPage() {
  return (
    <div className="page-main flex flex-col">
      <div className="w-full pb-4 text-lg font-extrabold leading-8">Agent</div>
      <PageCard className="flex flex-col">
        <div className="text-base font-extrabold text-primary">Are you an agent?</div>
        <p className="mt-2 leading-5 text-secondary">
          Agents manage their players in the agent portal. Sign in there with the account your upline
          created for you.
        </p>
        <ul className="mt-4 flex flex-col gap-2">
          {POINTS.map((point) => (
            <li key={point} className="flex items-center gap-2 text-secondary">
              <span className="size-1.5 flex-none rounded-full bg-brand" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
        <a href={AGENT_PORTAL_URL} className="button button-brand button-l mt-6 h-12 w-full sm:w-60">
          Agent login
        </a>
        <p className="mt-4 text-secondary">
          A player?{' '}
          <Link to="/login/signin" className="font-extrabold text-primary hover:underline">
            Sign in
          </Link>{' '}
          with the account your agent gave you.
        </p>
      </PageCard>
    </div>
  );
}
