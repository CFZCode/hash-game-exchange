// Screens a signed-out visitor must NOT see (each needs the sign-in dialog, or a redirect to a public page).
export const PRIVATE = [
  '/wallet', '/wallet/balance', '/wallet/deposit', '/wallet/withdraw', '/wallet/buy', '/wallet/swap', '/wallet/vault',
  '/wallet/transaction', '/wallet/rollover', '/wallet/bet-history', '/wallet/deposit-detail?orderId=1', '/wallet/withdraw-detail?orderId=1',
  '/deposit',
  '/settings', '/settings/account-info', '/settings/security', '/settings/preferences', '/settings/verification',
  '/settings/payment', '/settings/whitelist', '/settings/whitelist/add', '/settings/edit-profile', '/settings/edit-avatar',
  '/settings/passkey', '/settings/phishing/set', '/settings/verify/basic',
  '/user/enter', '/user/statistics', '/user-action/password',
  '/notification', '/bonus', '/quests', '/free-plays', '/vip-level',
  '/favorite', '/recent', '/referral', '/referral/dashboard', '/affiliate',
  '/sports/my-bets', '/sports/statement',
];
// Screens a signed-out visitor SHOULD see (no login wall).
export const PUBLIC = [
  '/', '/casino', '/casino/slots', '/sports', '/promotions/promotion', '/vip-detail', '/referral-exhibition', '/help/faq',
  '/provider/Spribe',
];
