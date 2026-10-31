/* The client-only shell is mounted by app/layout.tsx, NOT here. A page is remounted whenever Next
   swaps the `[[...slug]]` segment — which it does on its own when Back lands on a history entry
   written before a reload (it restores that entry's tree and fetches `?_rsc=` for it). Mounted
   here, that tore down and re-booted the whole React Router app; in the layout it stays put and
   React Router alone handles the URL. Every path still matches this route, so Next serves the
   same HTML for all of them. */
export default function Page() {
  return null;
}
