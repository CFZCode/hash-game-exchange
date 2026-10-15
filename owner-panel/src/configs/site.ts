/** Shared by the proxy and the route handlers; the name is not a secret. */
export const SESSION_COOKIE = 'cfz_owner_session'

export const siteConfig = {
  key: 'hash-game-exchange',
  name: 'Owner Panel',
  tagline: 'hash-game-exchange',
  environment: process.env.NEXT_PUBLIC_ENV_LABEL ?? 'localhost'
} as const

/** Server-only. Every value comes from owner-panel/.env.local — contract §1. */
export const serverConfig = {
  cookieName: SESSION_COOKIE,
  cookieMaxAgeSeconds: 12 * 60 * 60,
  ownerUsername: process.env.OWNER_USERNAME ?? '',
  ownerPassword: process.env.OWNER_PASSWORD ?? '',
  sessionSecret: process.env.OWNER_SESSION_SECRET ?? '',
  sharedSecret: process.env.OWNER_SHARED_SECRET ?? '',

  // Ed25519 private key (base64 PKCS8 DER). The backend holds only the public half.
  signingKey: process.env.OWNER_SIGNING_KEY ?? '',
  siteKey: process.env.SITE_KEY || 'hash-game-exchange',
  siteName: process.env.SITE_NAME || 'Jumbo Flush',
  gatewayUrl: process.env.SITE_GATEWAY_URL ?? '',
  adminUrl: process.env.SITE_ADMIN_URL ?? '',
  frontendUrl: process.env.SITE_FRONTEND_URL ?? '',
  dataDir: process.env.OWNER_DATA_DIR ?? `${process.cwd()}/data`
}
