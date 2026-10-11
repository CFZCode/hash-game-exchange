import RouteDialog from '../../components/shared/RouteDialog';
import { IconVipClub } from '../../layouts/MainLayout/Header/AfterLogin/icons';
import VIP from './index';

/* `/vip-detail` AS A DIALOG, which is what the route says it is on a phone:
 *
 *   { path: "/vip-detail", component: c(() => L.VipDetail()),
 *     info: { backgroundColor: "195 113 28",
 *             dialog: m.mobile ? { behavior: "transparent-title" } : !1 } }
 *
 * THE TITLE IS THE PAGE'S OWN AND IT IS THE PAGE'S `S.mobile` THAT DECIDES IT, which is the one
 * thing to get right here. `Mt`, the chunk's root, is the whole of that branch:
 *
 *   Mt = r => <Show when={S.mobile} fallback={() => r.children}>
 *               <PageLayout title={<div class="center gap-x-2">
 *                                    <IconVipclub class="size-5 fill-[#FFE924]"/>
 *                                    <span class="text-primary">{t("VIP Club")}</span>
 *                                  </div>}>{r.children}</PageLayout>
 *             </Show>
 *
 * and `w3` (PageLayout) draws nothing at all — inside a dialog route it pushes its props into
 * the router's dialog context and returns bare children, which is why the string ends up in the
 * manager's title bar and nowhere on the page. Same helper the deposit and withdraw panes are
 * headingless because of.
 *
 * SO THE FLAG IS 640 HERE, NOT 1024, and that is not a second exception — it is the SAME one
 * `pages/VIP/index.jsx` already documents at length. On the original `Mt`'s `S.mobile` and the
 * route's `m.mobile` are one flag; this build has to read that flag as `sm` on this page because
 * the hero's mobile arm (`-ml-4 w-[calc(100%+32px)]`) exists solely to cancel the page root's
 * `px-4 sm:px-0`, and that padding stops at 640. Gating the DIALOG at 1024 while the page's own
 * arms flip at 640 would split one flag in two and produce a combination the original never
 * renders. It also happens to be forced from the other end: `transparent-title` zeroes
 * `.dialog-content`'s horizontal padding, so the page's own `px-4` IS the sheet's gutter — and
 * that padding is gone from 640 up, where the layout container would have to supply it instead.
 *
 * `backgroundColor: "195 113 28"` is the route's own and is NOT reproduced: the manager writes it
 * as `--bg` on `.dialog-content`, where the only consumer in any of the six stylesheets is
 * `.dialog-title`, which is a SIBLING of that element and reads its own `--bg` instead. So the
 * value reaches nothing on a phone, where the sheet covers the viewport whole.
 */
export default function VipDialog({ onClose, onBack, enter }) {
  return (
    <RouteDialog
      transparent
      label="VIP Club"
      title={
        <div className="center gap-x-2">
          <IconVipClub className="icon size-5 fill-[#FFE924]" />
          <span className="text-primary">VIP Club</span>
        </div>
      }
      onClose={onClose}
      onBack={onBack}
      enter={enter}
    >
      <VIP />
    </RouteDialog>
  );
}
