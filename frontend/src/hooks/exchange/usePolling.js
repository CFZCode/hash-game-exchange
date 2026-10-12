import React from 'react';

/* ─── One poll loop for every exchange read ───────────────────────────────────────────────
 *
 * Self-scheduling (the next cycle starts `intervalMs` after the previous one BEGAN, or at once
 * if the request took longer) — never setInterval, which piles overlapping requests up and lets
 * an old answer overwrite a newer one. Paused while the tab is hidden; on return it polls at once.
 * `refreshEvent` (a window event name, e.g. 'bet:placed') triggers an immediate poll.
 *
 * `key` identifies WHAT is being read (e.g. the gmid). Data belongs to the key it was read for,
 * so switching keys shows `data: undefined` on the very next render instead of the old match's
 * data — derived during render, no reset effect.
 *
 * @param {(signal: AbortSignal) => Promise<*>} fetcher  must be stable for a given key
 * @param {{ intervalMs?: number, enabled?: boolean, key?: string, refreshEvent?: string,
 *           keepOnError?: boolean }} opts
 * @returns {{ data: *, error: Error|null, loading: boolean, refresh: () => void }}
 */
export function usePolling(fetcher, { intervalMs = 0, enabled = true, key = '', refreshEvent, keepOnError = true } = {}) {
  const [state, setState] = React.useState({ key: null, data: undefined, error: null });
  const kickRef = React.useRef(null);

  React.useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    let timer = null;
    let gen = 0;
    let controller = null;

    const run = async (myGen) => {
      if (!active || myGen !== gen) return;
      const startedAt = Date.now();
      controller = new AbortController();
      try {
        const data = await fetcher(controller.signal);
        if (active && myGen === gen) setState({ key, data, error: null });
      } catch (error) {
        if (active && myGen === gen && error?.name !== 'AbortError') {
          setState((prev) => ({
            key,
            data: keepOnError && prev.key === key ? prev.data : undefined,
            error,
          }));
        }
      } finally {
        if (active && myGen === gen && intervalMs > 0 && !document.hidden) {
          timer = setTimeout(() => run(myGen), Math.max(0, intervalMs - (Date.now() - startedAt)));
        }
      }
    };

    const kick = () => {
      if (!active) return;
      clearTimeout(timer);
      controller?.abort();
      gen += 1;
      run(gen);
    };
    kickRef.current = kick;

    const onVisibility = () => {
      if (document.hidden) clearTimeout(timer);
      else kick();
    };
    document.addEventListener('visibilitychange', onVisibility);
    if (refreshEvent) window.addEventListener(refreshEvent, kick);

    run(gen);
    return () => {
      active = false;
      clearTimeout(timer);
      controller?.abort();
      kickRef.current = null;
      document.removeEventListener('visibilitychange', onVisibility);
      if (refreshEvent) window.removeEventListener(refreshEvent, kick);
    };
  }, [fetcher, intervalMs, enabled, key, refreshEvent, keepOnError]);

  const refresh = React.useCallback(() => kickRef.current?.(), []);
  const mine = state.key === key;
  return {
    data: enabled && mine ? state.data : undefined,
    error: enabled && mine ? state.error : null,
    loading: enabled && !mine,
    refresh,
  };
}

export default usePolling;
