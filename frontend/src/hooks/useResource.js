import React from 'react';

/* Read a service. Works whether the service answered synchronously (fixtures) or with a
 * Promise (the API), so a component written against this hook needs no change when the flag in
 * `services/client.js` flips.
 *
 *   const { data, loading, error } = useResource(getRecentBigWins);
 *
 * While fixtures are on, `loading` is never true and `data` is populated on the very first
 * render — which is what keeps this refactor invisible to the pixel work. Once they are off,
 * `data` is undefined for the first paint and each call site's `?? []` is where that section's
 * skeleton belongs.
 *
 * `read` MUST BE STABLE. A module-level service function already is, which covers every call
 * site that takes no arguments. For a parameterised read, wrap it at the call site:
 *
 *   const read = React.useCallback(() => getLobbyEvents({ page }), [page]);
 *   const { data } = useResource(read);
 *
 * That is deliberate rather than an inconvenience. An earlier version took a `deps` array and
 * forwarded it to useMemo, which `react-hooks/exhaustive-deps` rejects outright — it requires
 * an array literal it can analyse. Pushing the memo to the call site puts the dependency list
 * where the linter can actually check it, which is where it belongs: only the caller knows what
 * its read depends on.
 */

const isPromise = (v) => Boolean(v) && typeof v.then === 'function';

export function useResource(read) {
  /* Once per distinct reader, so switching to the API does not refetch on every render. */
  const source = React.useMemo(() => read(), [read]);

  /* Settled results are stamped with the promise they came from. That is what lets `loading`
     and `data` be derived during render instead of synchronised by an effect — a stale result
     simply fails the identity check. Writing them in an effect body is also what
     `react-hooks/set-state-in-effect` forbids, and rightly: it is a cascading render. */
  const [settled, setSettled] = React.useState(null);

  React.useEffect(() => {
    if (!isPromise(source)) return undefined;

    let live = true;
    source.then(
      (data) => live && setSettled({ source, data, error: null }),
      (error) => live && setSettled({ source, data: undefined, error })
    );
    return () => {
      live = false;
    };
  }, [source]);

  if (!isPromise(source)) {
    return { data: source, loading: false, error: null };
  }

  const matched = settled !== null && settled.source === source;
  return {
    data: matched ? settled.data : undefined,
    loading: !matched,
    error: matched ? settled.error : null,
  };
}

export default useResource;
