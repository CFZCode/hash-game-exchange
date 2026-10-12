import React from 'react';
import { ALL_ON } from '../services/gates';

/* The context object and its hook, split from GatesContext.jsx for the same Fast Refresh reason
   `session.js` is split from SessionContext.jsx. Outside the provider everything is on. */
export const GatesContext = React.createContext(ALL_ON);

/** `{ ready, on(gate), routeOn(path), can(capability), canSignUp(), policy(key) }` — see services/gates.js. */
export function useGates() {
  return React.useContext(GatesContext);
}

/** Whether to RENDER a sign-up entry (header, hero, bet slip, the auth dialog's tab). A B2B
 *  (agent-only) site has none: its players are created by their agent, and everyone signs in
 *  through the one Sign In. Shown once the owner's plan has answered, so a B2B site never flashes
 *  one; a failed read counts as answered (fail open). Always on with fixtures. */
export function useCanSignUp() {
  const gates = React.useContext(GatesContext);
  return gates.ready && gates.canSignUp();
}
