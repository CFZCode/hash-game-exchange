import React from 'react';
import { ALL_ON } from '../services/gates';

/* The context object and its hook, split from GatesContext.jsx for the same Fast Refresh reason
   `session.js` is split from SessionContext.jsx. Outside the provider everything is on. */
export const GatesContext = React.createContext(ALL_ON);

/** `{ ready, on(gate), routeOn(path), can(capability), canSignUp(), policy(key) }` — see services/gates.js. */
export function useGates() {
  return React.useContext(GatesContext);
}
