import React from 'react';

/* The context object and its hook, split out from SessionContext.jsx purely because of
   `react-refresh/only-export-components`: a file that exports a component may export nothing
   else, or Fast Refresh cannot tell what to re-render. The provider is the component, so the
   context and the hook live here. */

export const SessionContext = React.createContext(null);

export function useSession() {
  const value = React.useContext(SessionContext);

  /* Loud rather than silent: without the provider this would otherwise read as a logged-out
     visitor with every field blank, which is a plausible enough state to go unnoticed. */
  if (!value) throw new Error('useSession must be used inside a <SessionProvider>');

  return value;
}
