import {
  IconUserProfile,
  IconSet,
  IconPreferences,
  IconPersonalVerification,
  IconWhitelist,
} from './icons';

/* `b()` in `index-B0Ab1fJ8.js` — the settings rail, verbatim.
 *
 *   [{ label: () => t("Account Info"),          link: "/settings/account-info", iconName: IconUserprofile },
 *    { label: () => t("Security"),              link: "/settings/security",     iconName: IconSet, haveDont: !0 },
 *    { label: () => t("Preferences"),           link: "/settings/preferences",  iconName: V },
 *    !isOfflineAgent && { label: () => t("Personal Verification"), link: "/settings/verification", iconName: P },
 *    !isOfflineAgent && { label: () => t("Payment Methods"),       link: "/settings/payment",      iconName: D },
 *    !isOfflineAgent && { label: () => t("Whitelist Management"),  link: "/settings/whitelist",    iconName: A }
 *   ].filter(Boolean)
 *
 * THE LAST THREE ARE GATED ON A WHITE-LABEL FLAG, not on anything about the visitor:
 * `isOfflineAgent` is false on bc.game, so all six render. Kept as written rather than flattened,
 * because it is the same flag that drops the Contact Info card on the Account Info pane and both
 * notification cards on Preferences — one build flag, four consequences.
 *
 * `haveDont` on Security is what draws the amber attention mark beside the label — `<Status
 * withImg/>`, which reads the same four account flags the pane's own strength badge does.
 *
 * THE ROUTE AND THE LINK DISAGREE ON CASE ON THE ORIGINAL: the router declares the child as
 * `path: "/whiteList"` while this menu links to `/settings/whitelist`. Solid's router and React
 * Router both match case-insensitively by default, so both spellings resolve either way; this
 * build declares the route lowercase, which keeps the original's own href working and accepts its
 * own capitalised URL as well.
 */
export const SETTINGS_MENU = [
  { key: 'account-info', label: 'Account Info', href: '/settings/account-info', icon: IconUserProfile },
  { key: 'security', label: 'Security', href: '/settings/security', icon: IconSet, haveDont: true },
  { key: 'preferences', label: 'Preferences', href: '/settings/preferences', icon: IconPreferences },
  {
    key: 'verification',
    label: 'Personal Verification',
    href: '/settings/verification',
    icon: IconPersonalVerification,
  },
  {
    key: 'whitelist',
    label: 'Whitelist Management',
    href: '/settings/whitelist',
    icon: IconWhitelist,
  },
];

/* Each pane's own `PageLayout title` — the string its chunk pushes into the router's dialog
   context, which is the phone bar's title and nothing at all on a desktop. Not a second set of
   labels: five of the six match the rail, and Whitelist Management is the one that differs only
   in that the rail row and the title are the same words. Kept beside the menu so the dialog mount
   has one place to read. */
export const PANE_TITLE = {
  'account-info': 'Account Info',
  security: 'Security',
  preferences: 'Preferences',
  verification: 'Personal Verification',
  whitelist: 'Whitelist Management',
};
