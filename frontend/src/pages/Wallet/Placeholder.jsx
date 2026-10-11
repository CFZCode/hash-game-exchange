/* The eight rail rows whose panes are not built.
 *
 * Each is a `Dialog*` component on the original — `DialogChannelDeposit`, `DialogWithdraw`,
 * `DialogBuyCrypto`, `DialogSwap`, `DialogVault`, `DialogTransaction`, `DialogTurnover`,
 * `DialogBetHistory` — and each is a feature in its own right rather than a variation on the
 * balance list. They route and light their rail row so the shell is honest about what exists;
 * this is the same call the Help Center's rail makes for its sixteen unbundled documents.
 *
 * The card is the Balance pane's own wrapper (`rounded-xl bg-layer4 p-4 lg:px-8`) so the pane
 * keeps its shape as you move down the rail, and `ks`'s default copy fills it. Note this is NOT
 * a `<Show>` arm of the original's — it is this build's, and it should be deleted a row at a
 * time as the real panes land.
 */
export default function Placeholder() {
  return (
    <div className="rounded-xl bg-layer4 p-4 lg:px-8">
      <section className="center flex-col py-10 text-center">
        <div className="mt-4 leading-5 text-secondary">Stay tuned-something&apos;s coming!</div>
      </section>
    </div>
  );
}
