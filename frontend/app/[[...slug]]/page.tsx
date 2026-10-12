import ClientApp from './client';

/* Every path renders the same client-only shell; React Router inside it owns routing, exactly as
   under Vite. `#root` is the mount point index.html had. */
export default function Page() {
  return (
    <div id="root">
      <ClientApp />
    </div>
  );
}
