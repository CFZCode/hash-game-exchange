import { USE_FIXTURES } from './client';

/* Two features the live platform has NOTHING behind, so their buttons are hidden rather than
 * left dead (a button that does nothing reads as broken):
 *
 *  - CHAT. bc.game's global chat is a websocket room; this backend has no chat module, no room,
 *    no history and no send route. The composer could never post and the room only ever showed
 *    the transcribed seed rows (other people's usernames). The header toggles, the tabbar's Chat
 *    entry and `/chat-public` all key off this.
 *  - LIVE SUPPORT. The original opens a third-party widget (`J.emit("live_support")`); no support
 *    provider or URL exists in site-config, branding or the owner's entitlements here.
 *
 * Fixture mode keeps both, because the fixture build is the pixel reference. Wire a provider and
 * flip the live arm when one exists. */
export const CHAT_AVAILABLE = USE_FIXTURES;
export const LIVE_SUPPORT_AVAILABLE = USE_FIXTURES;
